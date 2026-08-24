"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/data/account";

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
