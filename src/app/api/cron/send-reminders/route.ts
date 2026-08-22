import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { renderTemplate, resolveTemplate } from "@/lib/email-templates";
import { sendEmail } from "@/lib/resend";
import type { Database } from "@/lib/supabase/database.types";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function accessLinkFor(row: { account_slug: string; webinar_slug: string; access_token: string }) {
  return `${process.env.NEXT_PUBLIC_APP_URL}/w/${row.account_slug}/${row.webinar_slug}/room/${row.access_token}`;
}

function formatWhen(computedSessionStart: string, visitorTimezone: string | null) {
  return new Intl.DateTimeFormat("es", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: visitorTimezone || "UTC",
  }).format(new Date(computedSessionStart));
}

// Meant to be invoked periodically (every ~5 min) by an external scheduler
// (Vercel Cron, Supabase pg_cron hitting this URL, etc.) — see
// .env.example for CRON_SECRET. Each recipient is independent: one
// failure (a bad email address, a transient Resend error) is logged and
// skipped rather than aborting the whole run.
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  let remindersSent = 0;
  let replaysSent = 0;
  const errors: string[] = [];

  const { data: dueReminders } = await admin.rpc("get_due_reminder_recipients", {
    p_tolerance_minutes: 5,
  });

  for (const r of dueReminders ?? []) {
    try {
      const template = await resolveTemplate(admin, {
        accountId: r.account_id,
        webinarId: r.webinar_id,
        type: "reminder",
        offsetMinutes: r.offset_minutes,
      });
      const vars = {
        nombre: r.name,
        webinar_titulo: r.webinar_title,
        hora_webinar: formatWhen(r.computed_session_start, r.visitor_timezone),
        link_acceso: accessLinkFor(r),
      };
      await sendEmail({
        to: r.email,
        subject: renderTemplate(template.subject, vars),
        html: renderTemplate(template.body, vars),
      });
      await admin.from("email_sends").insert({
        registrant_id: r.registrant_id,
        webinar_id: r.webinar_id,
        kind: `reminder:${r.offset_minutes}`,
      });
      remindersSent++;
    } catch (err) {
      errors.push(`reminder ${r.registrant_id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const { data: dueReplays } = await admin.rpc("get_due_replay_recipients", {
    p_lookback_hours: 24,
  });

  for (const r of (dueReplays ?? []) as Database["public"]["Functions"]["get_due_replay_recipients"]["Returns"]) {
    try {
      const template = await resolveTemplate(admin, {
        accountId: r.account_id,
        webinarId: r.webinar_id,
        type: "replay_missed",
      });
      const vars = {
        nombre: r.name,
        webinar_titulo: r.webinar_title,
        hora_webinar: formatWhen(r.computed_session_start, r.visitor_timezone),
        link_acceso: accessLinkFor(r),
      };
      await sendEmail({
        to: r.email,
        subject: renderTemplate(template.subject, vars),
        html: renderTemplate(template.body, vars),
      });
      await admin.from("email_sends").insert({
        registrant_id: r.registrant_id,
        webinar_id: r.webinar_id,
        kind: "replay_missed",
      });
      replaysSent++;
    } catch (err) {
      errors.push(`replay ${r.registrant_id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({ remindersSent, replaysSent, errors });
}
