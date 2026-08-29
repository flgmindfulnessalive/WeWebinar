"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/data/account";
import { sendEmail } from "@/lib/resend";

export type ProfileActionState = { error: string } | { success: true } | null;

export async function updateProfile(
  _prevState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const t = await getTranslations("ProfileActions");
  const current = await getCurrentAccount();
  if (!current) return { error: t("sessionNotFound") };

  const displayName = String(formData.get("display_name") ?? "").trim() || null;
  const avatarUrl = String(formData.get("avatar_url") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("users")
    .update({ display_name: displayName, avatar_url: avatarUrl })
    .eq("id", current.user.id);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/settings/profile");
  revalidatePath("/dashboard", "layout");
  return { success: true };
}

export async function changePassword(
  _prevState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const t = await getTranslations("ProfileActions");
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    return { error: t("passwordTooShort") };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: error.message };
  } catch (err) {
    console.error("[profile] changePassword failed:", err);
    return { error: t("authServerError") };
  }

  return { success: true };
}

// Supabase requires confirming the change before it takes effect (by
// default from both the old and new address -- "Secure email change"),
// so this never updates public.users.email directly: it only kicks off
// that confirmation flow. public.users.email gets synced automatically
// once the change is confirmed, by the on_auth_user_email_updated trigger
// (see migration 20260827000004).
export async function changeEmail(
  _prevState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const t = await getTranslations("ProfileActions");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return { error: t("invalidEmail") };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: t("sessionNotFound") };
    if (email === user.email) {
      return { error: t("alreadyCurrentEmail") };
    }

    const { error } = await supabase.auth.updateUser(
      { email },
      {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/dashboard/settings/profile`,
      }
    );
    if (error) return { error: error.message };
  } catch (err) {
    console.error("[profile] changeEmail failed:", err);
    return { error: t("authServerError") };
  }

  return { success: true };
}

const DIAGNOSTIC_EMAIL = "operaciones@wewebinars.com";

// Self-diagnostic for the "no me llega el email de confirmación" report --
// sends a real email through the same Resend client the registration flow
// uses, to the platform's own operations inbox (not the caller's personal
// address), and surfaces the exact send error (missing
// RESEND_API_KEY/RESEND_FROM_EMAIL, unverified sender domain, etc.) right
// in the UI instead of requiring a trip to Vercel logs.
/* eslint-disable @typescript-eslint/no-unused-vars -- useActionState requires this exact (state, formData) signature */
export async function sendTestEmail(
  _prevState: ProfileActionState,
  _formData: FormData
): Promise<ProfileActionState> {
  /* eslint-enable @typescript-eslint/no-unused-vars */
  const t = await getTranslations("ProfileActions");
  const current = await getCurrentAccount();
  if (!current) return { error: t("sessionNotFound") };

  try {
    await sendEmail({
      to: DIAGNOSTIC_EMAIL,
      subject: "Email de prueba de WeWebinars",
      html: "<p>Si estás viendo esto, el envío de emails desde WeWebinars está funcionando correctamente.</p>",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: t("sendFailed", { message }) };
  }

  return { success: true };
}
