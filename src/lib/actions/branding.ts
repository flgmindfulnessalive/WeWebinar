"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/data/account";

export type BrandingActionState = { error: string } | { success: true } | null;

export async function updateBranding(
  _prevState: BrandingActionState,
  formData: FormData
): Promise<BrandingActionState> {
  const current = await getCurrentAccount();
  if (!current || current.user.role !== "owner") {
    return { error: "No tienes permisos para editar la marca de la cuenta." };
  }

  const branding = {
    logo_url: String(formData.get("logo_url") ?? "").trim() || null,
    favicon_url: String(formData.get("favicon_url") ?? "").trim() || null,
    color_primario: String(formData.get("color_primario") ?? "").trim() || null,
    color_secundario: String(formData.get("color_secundario") ?? "").trim() || null,
  };

  const supabase = await createClient();
  const { error } = await supabase
    .from("accounts")
    .update({ branding })
    .eq("id", current.account.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/settings/branding");
  return { success: true };
}
