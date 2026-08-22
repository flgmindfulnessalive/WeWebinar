"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/data/account";

export type EmailTemplateActionState = { error: string } | null;

export async function upsertSingletonTemplate(
  _prevState: EmailTemplateActionState,
  formData: FormData
): Promise<EmailTemplateActionState> {
  const webinarId = String(formData.get("webinar_id") ?? "");
  const type = String(formData.get("type") ?? "");
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (type !== "registration_confirmation" && type !== "replay_missed") {
    return { error: "Tipo de plantilla inválido." };
  }
  if (!subject || !body) {
    return { error: "Asunto y cuerpo son obligatorios." };
  }

  const current = await getCurrentAccount();
  if (!current) return { error: "No autenticado." };

  const supabase = await createClient();
  const { error } = await supabase.from("email_templates").upsert(
    {
      account_id: current.account.id,
      webinar_id: webinarId,
      type,
      subject,
      body,
      is_active: true,
    },
    { onConflict: "webinar_id,type" }
  );

  revalidatePath(`/dashboard/webinars/${webinarId}`);

  if (error) return { error: error.message };
  return null;
}

export async function addReminderTemplate(
  _prevState: EmailTemplateActionState,
  formData: FormData
): Promise<EmailTemplateActionState> {
  const webinarId = String(formData.get("webinar_id") ?? "");
  const offsetMinutes = Number(formData.get("offset_minutes"));
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!Number.isInteger(offsetMinutes) || offsetMinutes <= 0) {
    return { error: "Los minutos de anticipación deben ser un número positivo." };
  }
  if (!subject || !body) {
    return { error: "Asunto y cuerpo son obligatorios." };
  }

  const current = await getCurrentAccount();
  if (!current) return { error: "No autenticado." };

  const supabase = await createClient();
  const { error } = await supabase.from("email_templates").insert({
    account_id: current.account.id,
    webinar_id: webinarId,
    type: "reminder",
    reminder_offset_minutes: offsetMinutes,
    subject,
    body,
    is_active: true,
  });

  revalidatePath(`/dashboard/webinars/${webinarId}`);

  if (error) {
    if (error.code === "23505") {
      return { error: "Ya existe un recordatorio con esa anticipación." };
    }
    return { error: error.message };
  }
  return null;
}

export async function removeReminderTemplate(
  templateId: string,
  webinarId: string
): Promise<EmailTemplateActionState> {
  const supabase = await createClient();
  const { error } = await supabase.from("email_templates").delete().eq("id", templateId);

  revalidatePath(`/dashboard/webinars/${webinarId}`);

  if (error) return { error: error.message };
  return null;
}
