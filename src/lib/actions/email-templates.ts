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

  // email_templates_singleton_idx is a *partial* unique index (scoped to
  // just these two types), and Postgres won't match a bare
  // ON CONFLICT (webinar_id, type) target against a partial index --
  // .upsert() would fail with "no unique or exclusion constraint matching
  // the ON CONFLICT specification". Do the find-then-write explicitly
  // instead of relying on native upsert.
  const { data: existing } = await supabase
    .from("email_templates")
    .select("id")
    .eq("webinar_id", webinarId)
    .eq("type", type)
    .maybeSingle();

  let { error } = existing
    ? await supabase
        .from("email_templates")
        .update({ subject, body, is_active: true })
        .eq("id", existing.id)
    : await supabase.from("email_templates").insert({
        account_id: current.account.id,
        webinar_id: webinarId,
        type,
        subject,
        body,
        is_active: true,
      });

  // The find-then-insert above isn't atomic, so a second concurrent save
  // (double-click, two tabs) can race in between: both see no `existing`
  // row, both try to insert, and the second hits the partial unique index
  // (email_templates_singleton_idx) instead of finding a row to update.
  // Rather than surface that raw constraint violation, retry once as an
  // update against the row the other request just created.
  if (error?.code === "23505" && !existing) {
    const { data: raced } = await supabase
      .from("email_templates")
      .select("id")
      .eq("webinar_id", webinarId)
      .eq("type", type)
      .maybeSingle();
    if (raced) {
      ({ error } = await supabase
        .from("email_templates")
        .update({ subject, body, is_active: true })
        .eq("id", raced.id));
    }
  }

  revalidatePath(`/dashboard/webinars/${webinarId}`);

  if (error) {
    console.error("[email-templates] upsertSingletonTemplate failed:", {
      type,
      hadExisting: Boolean(existing),
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    return { error: "No pudimos guardar la plantilla. Prueba de nuevo." };
  }
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
