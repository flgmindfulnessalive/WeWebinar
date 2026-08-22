"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type RegisterActionState = { error: string } | null;

export async function registerForWebinar(
  _prevState: RegisterActionState,
  formData: FormData
): Promise<RegisterActionState> {
  const webinarId = String(formData.get("webinar_id") ?? "");
  const returnTo = String(formData.get("return_to") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const visitorTimezone = String(formData.get("visitor_timezone") ?? "") || null;
  const scheduleId = String(formData.get("schedule_id") ?? "") || null;
  const sessionStartsAt = String(formData.get("session_starts_at") ?? "") || null;
  const offsetRaw = formData.get("offset_minutes");
  const offsetMinutes = offsetRaw ? Number(offsetRaw) : null;

  if (!name || !email) {
    return { error: "Nombre y email son obligatorios." };
  }
  if (!webinarId) {
    return { error: "Webinar inválido." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("register_for_webinar", {
    p_webinar_id: webinarId,
    p_name: name,
    p_email: email,
    p_visitor_timezone: visitorTimezone,
    p_schedule_id: scheduleId,
    p_session_starts_at: sessionStartsAt,
    p_offset_minutes: offsetMinutes,
  });

  if (error) {
    if (error.message.includes("plan_limit_exceeded")) {
      return { error: "Este webinar alcanzó el cupo máximo de registrados." };
    }
    if (error.message.includes("already started") || error.message.includes("does not match")) {
      return { error: "Ese horario ya no está disponible. Elegí otro." };
    }
    return { error: "No pudimos completar tu registro. Probá de nuevo." };
  }

  const result = data?.[0];
  if (!result) {
    return { error: "No pudimos completar tu registro. Probá de nuevo." };
  }

  redirect(`${returnTo}/room/${result.access_token}`);
}
