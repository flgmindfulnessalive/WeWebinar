"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/slug";
import { getCurrentAccount } from "@/lib/data/account";
import { welcomeEmail } from "@/lib/platform-email";
import { sendEmail } from "@/lib/resend";

export type CreateAccountState = { error: string } | null;

// The 15-day trial is only available on Core -- Pro and Business are paid
// upgrades a host does later from Facturación (Stripe checkout), never a
// starting point for a new, unbilled account. Hardcoded rather than read
// from form input so a tampered request can't create a trial on a paid tier.
const TRIAL_PLAN_KEY = "core";

export async function createAccount(
  _prevState: CreateAccountState,
  formData: FormData
): Promise<CreateAccountState> {
  const name = String(formData.get("name") ?? "").trim();
  const planKey = TRIAL_PLAN_KEY;
  const timezone = String(formData.get("timezone") ?? "").trim() || "UTC";

  if (!name) {
    return { error: "El nombre de la cuenta es obligatorio." };
  }

  // redirect() throws internally to navigate, so it can never be called
  // from inside this try block -- we just record where to go and redirect
  // once, after the try/catch is fully resolved.
  let redirectTo: string | null = null;
  let result: CreateAccountState = null;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      redirectTo = "/login?next=/onboarding";
    } else {
      const baseSlug = slugify(name) || "cuenta";
      let slug = baseSlug;
      let attempt = 0;
      let resolved = false;

      // Rare race: two hosts pick the same name at the same moment. Retry
      // a few times with a numeric suffix before giving up.
      while (attempt < 5 && !resolved) {
        const { error } = await supabase.rpc("create_account_with_owner", {
          p_name: name,
          p_slug: slug,
          p_plan_key: planKey,
          p_timezone_default: timezone,
        });

        if (!error) {
          redirectTo = "/dashboard";
          resolved = true;
          // Best-effort: a failed welcome email should never block the
          // account from being created, so it's logged and swallowed
          // rather than surfaced as a signup error.
          try {
            const fullName =
              typeof user.user_metadata?.full_name === "string"
                ? user.user_metadata.full_name
                : null;
            const { subject, html } = welcomeEmail(name, fullName);
            await sendEmail({ to: user.email!, subject, html });
          } catch (err) {
            console.error("[account] welcome email failed:", err);
          }
        } else if (error.code === "23505") {
          attempt += 1;
          slug = `${baseSlug}-${attempt + 1}`;
        } else {
          result = { error: error.message };
          resolved = true;
        }
      }

      if (!resolved) {
        result = { error: "No se pudo generar un slug disponible, prueba con otro nombre." };
      }
    }
  } catch (err) {
    console.error("[account] createAccount failed:", err);
    result = { error: "No pudimos conectar con el servidor. Prueba de nuevo en un momento." };
  }

  if (redirectTo) redirect(redirectTo);
  return result;
}

export type UpdateAccountGeneralState = { error: string } | { success: true } | null;

export async function updateAccountGeneral(
  _prevState: UpdateAccountGeneralState,
  formData: FormData
): Promise<UpdateAccountGeneralState> {
  const t = await getTranslations("AccountActions");
  const current = await getCurrentAccount();
  if (!current || current.user.role !== "owner") {
    return { error: t("noPermission") };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { error: t("nameRequired") };
  }
  const timezone = String(formData.get("timezone") ?? "").trim() || "UTC";

  const supabase = await createClient();
  const { error } = await supabase
    .from("accounts")
    .update({ name, timezone_default: timezone })
    .eq("id", current.account.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/settings/general");
  revalidatePath("/dashboard", "layout");
  return { success: true };
}
