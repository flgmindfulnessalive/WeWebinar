"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/data/account";
import { sendEmail } from "@/lib/resend";

export type ProfileActionState = { error: string } | { success: true } | null;

export async function updateProfile(
  _prevState: ProfileActionState,
  formData: FormData
): Promise<ProfileActionState> {
  const current = await getCurrentAccount();
  if (!current) return { error: "No pudimos identificar tu sesión." };

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
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: error.message };
  } catch (err) {
    console.error("[profile] changePassword failed:", err);
    return { error: "No pudimos conectar con el servidor de autenticación. Prueba de nuevo en un momento." };
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
  const current = await getCurrentAccount();
  if (!current) return { error: "No pudimos identificar tu sesión." };

  try {
    await sendEmail({
      to: DIAGNOSTIC_EMAIL,
      subject: "Email de prueba de WeWebinars",
      html: "<p>Si estás viendo esto, el envío de emails desde WeWebinars está funcionando correctamente.</p>",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { error: `No se pudo enviar: ${message}` };
  }

  return { success: true };
}
