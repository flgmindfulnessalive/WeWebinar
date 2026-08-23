"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { renderTemplate, resolveTemplate } from "@/lib/email-templates";
import { sendEmail } from "@/lib/resend";

export type RegisterActionState = { error: string } | null;

async function sendConfirmationEmail({
  webinarId,
  accountId,
  webinarTitle,
  name,
  email,
  computedSessionStart,
  visitorTimezone,
  accessToken,
  accessLink,
}: {
  webinarId: string;
  accountId: string;
  webinarTitle: string;
  name: string;
  email: string;
  computedSessionStart: string;
  visitorTimezone: string | null;
  accessToken: string;
  accessLink: string;
}) {
  const admin = createAdminClient();

  const { data: registrant } = await admin
    .from("registrants")
    .select("id")
    .eq("access_token", accessToken)
    .single();

  const horaWebinar = new Intl.DateTimeFormat("es", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: visitorTimezone || "UTC",
  }).format(new Date(computedSessionStart));

  const template = await resolveTemplate(admin, {
    accountId,
    webinarId,
    type: "registration_confirmation",
  });

  const vars = {
    nombre: name,
    webinar_titulo: webinarTitle,
    hora_webinar: horaWebinar,
    link_acceso: accessLink,
  };

  await sendEmail({
    to: email,
    subject: renderTemplate(template.subject, vars),
    html: renderTemplate(template.body, vars),
  });

  if (registrant) {
    // Best-effort log — a duplicate here (e.g. a retried request) is
    // harmless since this is informational, not a de-dupe gate like the
    // reminders cron relies on.
    await admin.from("email_sends").upsert(
      { registrant_id: registrant.id, webinar_id: webinarId, kind: "confirmation" },
      { onConflict: "registrant_id,kind", ignoreDuplicates: true }
    );
  }
}

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
      return { error: "Ese horario alcanzó el cupo máximo de esta sesión. Elegí otro horario." };
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

  const accessLink = `${process.env.NEXT_PUBLIC_APP_URL}${returnTo}/room/${result.access_token}`;

  const { data: webinar } = await supabase
    .from("webinars")
    .select("title, account_id")
    .eq("id", webinarId)
    .single();

  if (webinar) {
    // Never let an email hiccup block a registration that already
    // succeeded — the attendee still has their access link either way.
    try {
      await sendConfirmationEmail({
        webinarId,
        accountId: webinar.account_id,
        webinarTitle: webinar.title,
        name,
        email,
        computedSessionStart: result.computed_session_start,
        visitorTimezone,
        accessToken: result.access_token,
        accessLink,
      });
    } catch (err) {
      console.error("[register] failed to send confirmation email:", err);
    }
  }

  redirect(`${returnTo}/room/${result.access_token}`);
}
