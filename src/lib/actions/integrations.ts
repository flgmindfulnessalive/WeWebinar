"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/data/account";

export type IntegrationActionState = { error: string } | { success: true } | null;

export async function updateBrevoApiKey(
  _prevState: IntegrationActionState,
  formData: FormData
): Promise<IntegrationActionState> {
  const current = await getCurrentAccount();
  if (!current || current.user.role !== "owner") {
    return { error: "Solo el owner puede editar esta integración." };
  }

  const apiKey = String(formData.get("brevo_api_key") ?? "").trim() || null;

  const supabase = await createClient();
  const { error } = await supabase
    .from("accounts")
    .update({ brevo_api_key: apiKey })
    .eq("id", current.account.id);

  revalidatePath("/dashboard/settings/integrations");
  if (error) {
    if (error.message.includes("plan_feature_blocked")) {
      return {
        error:
          "La integración con Brevo está disponible en los planes Pro, Business y Enterprise. Actualiza tu plan desde Facturación para activarla.",
      };
    }
    return { error: error.message };
  }
  return { success: true };
}
