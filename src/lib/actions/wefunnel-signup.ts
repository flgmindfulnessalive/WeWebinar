"use server";

import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";

export type WeFunnelSignUpState = { error: string } | { sent: string } | null;

// Signup for someone who arrived through a distributor's gift page.
//
// A sibling of auth.ts's signUpWithPassword rather than a flag on it,
// because the only thing that differs is where the confirmation lands:
// /panel/empezar, which creates their page and drops them in the editor.
// The WeWebinars signup goes to /onboarding, which asks about webinars --
// questions this person has no reason to answer to receive a gift.
//
// Everything else is deliberately the same account system: same
// supabase.auth.signUp, same Turnstile verification, same email
// confirmation requirement, same password policy. The approved mock asks
// for 8 characters; whatever the project already enforces is stronger or
// equal and is what applies.
//
// The distributor's attribution is not in this payload. It lives in the
// wf_ref cookie and is validated against the database by
// claim_wefunnel_site, so a form field claiming to have been invited by
// somebody would change nothing.
export async function weFunnelSignUp(
  _prev: WeFunnelSignUpState,
  formData: FormData
): Promise<WeFunnelSignUpState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("name") ?? "").trim().slice(0, 80);
  const captchaToken = String(formData.get("cf-turnstile-response") ?? "").trim();

  if (!fullName) return { error: "Escribe tu nombre." };
  if (!email) return { error: "Escribe tu email." };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=${encodeURIComponent("/panel/empezar")}`,
        ...(captchaToken ? { captchaToken } : {}),
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes("captcha")) {
        const t = await getTranslations("AuthActions");
        return { error: t("captchaFailed") };
      }
      return { error: error.message };
    }
  } catch (err) {
    console.error("[wefunnel] signup failed:", err);
    const t = await getTranslations("AuthActions");
    return { error: t("connectionError") };
  }

  // Confirmation is required, so there is no session to redirect with. The
  // screen says to go to their inbox, which is the truth and the only thing
  // they can act on.
  return { sent: email };
}
