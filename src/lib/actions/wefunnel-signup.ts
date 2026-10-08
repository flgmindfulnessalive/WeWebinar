"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizeSlug, proposeSlug } from "@/lib/wefunnels/slug";

export type WeFunnelSignupState =
  | { error: string }
  | { checkEmail: true; email: string }
  | null;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Resolves the gift page the person came from. Server-side, every time:
// the slug arrives in a URL, so it is only a claim until the database says
// it is a live, unsuspended page of an active Distributor.
async function resolveReferrer(rawSlug: string): Promise<string | null> {
  const slug = normalizeSlug(rawSlug);
  if (!slug) return null;
  const supabase = await createClient();
  const { data } = await supabase.rpc("wefunnel_gift_referrer", { p_slug: slug });
  return data ?? null;
}

// Records who brought this person, once. insert ... do nothing: a later
// gift page cannot change it, and the claim RPC re-validates everything
// (licence still active, 90-day window, not themselves) when it reads it.
async function recordPendingClaim({
  userId,
  displayName,
  referrerSiteId,
  intent,
}: {
  userId: string;
  displayName: string;
  referrerSiteId: string | null;
  intent: "gift" | "distributor";
}) {
  const admin = createAdminClient();
  const { error } = await admin.from("wefunnel_pending_claims").upsert(
    {
      user_id: userId,
      display_name: displayName.slice(0, 120),
      proposed_slug: proposeSlug(displayName) || null,
      referrer_site_id: referrerSiteId,
      touched_at: referrerSiteId ? new Date().toISOString() : null,
      intent,
    },
    { onConflict: "user_id", ignoreDuplicates: true }
  );
  if (error) {
    console.error("[wefunnel] pending claim not recorded:", error.message);
  }
}

export async function signUpForWeFunnels(
  _prev: WeFunnelSignupState,
  formData: FormData
): Promise<WeFunnelSignupState> {
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const giftSlug = String(formData.get("de") ?? "");
  const intent = formData.get("plan") === "distribuidor" ? "distributor" : "gift";
  const captchaToken = String(formData.get("cf-turnstile-response") ?? "").trim();

  if (name.length < 2) return { error: "Escribe tu nombre." };
  if (!EMAIL_RE.test(email)) return { error: "Escribe un email válido." };
  // The minimum the approved design states. Supabase Auth enforces the
  // project's own password policy on top of this and its message is shown
  // as-is, so a stricter existing policy is never lowered here.
  if (password.length < 8) return { error: "Usa al menos 8 caracteres en tu contraseña." };

  let referrerSiteId: string | null = null;
  if (intent === "gift") {
    referrerSiteId = await resolveReferrer(giftSlug);
    if (!referrerSiteId) {
      return {
        error:
          "Este enlace de regalo ya no está disponible. Pide a quien te lo compartió que te envíe su enlace actual.",
      };
    }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
  const next = intent === "distributor" ? "/panel/distribuidor" : "/panel";

  let userId: string | null = null;
  let hasSession = false;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: `${appUrl}/auth/confirm?next=${encodeURIComponent(next)}`,
        ...(captchaToken ? { captchaToken } : {}),
      },
    });
    if (error) {
      if (error.message.toLowerCase().includes("captcha")) {
        return { error: "No pudimos verificar que eres una persona. Recarga la página e intenta de nuevo." };
      }
      return { error: error.message };
    }
    // An address that already has an account comes back as a user with no
    // identities and no email is sent. Nothing is recorded for it -- the
    // existing account is never re-attributed -- and the answer is the same
    // as for a new address, so this form cannot be used to test which
    // emails are registered.
    if (data.user && (data.user.identities?.length ?? 0) > 0) {
      userId = data.user.id;
    }
    hasSession = data.session !== null;
  } catch (err) {
    console.error("[wefunnel] signup failed:", err);
    return { error: "No pudimos crear tu cuenta. Revisa tu conexión e intenta de nuevo." };
  }

  if (userId) {
    await recordPendingClaim({ userId, displayName: name, referrerSiteId, intent });
  }

  if (hasSession) redirect(next);
  return { checkEmail: true, email };
}

// For someone who already has a session and opens a gift page: no second
// account, just the same server-side attribution on the account they have.
export async function claimGiftAsSignedIn(formData: FormData): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/panel");

  const referrerSiteId = await resolveReferrer(String(formData.get("de") ?? ""));
  if (referrerSiteId) {
    const fullName =
      (user.user_metadata?.full_name as string | undefined)?.trim() || user.email?.split("@")[0] || "Mi funnel";
    await recordPendingClaim({ userId: user.id, displayName: fullName, referrerSiteId, intent: "gift" });
  }
  redirect("/panel");
}
