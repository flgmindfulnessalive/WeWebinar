import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { renderTemplate, resolveEmailBranding, resolveTemplate, wrapEmailShell } from "@/lib/email-templates";
import { accountSuspendedEmail, monthlyDigestEmail, trialExpiringEmail } from "@/lib/platform-email";
import { sendEmail } from "@/lib/resend";
import type { Database } from "@/lib/supabase/database.types";

const TRIAL_WARNING_WINDOW_DAYS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

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
    // Claim this (registrant, kind) pair by inserting the dedup row BEFORE
    // sending — email_sends has a unique (registrant_id, kind) constraint,
    // so this insert is the atomic gate. Inserting after the send left a
    // window where two overlapping cron runs (a slow run still in flight
    // when the next ~5min tick fires) could both see the recipient as due
    // and both send. If the send below then fails, we roll the claim back
    // so this recipient is picked up again on the next run instead of
    // being silently skipped forever.
    const kind = `reminder:${r.offset_minutes}`;
    const { error: claimError } = await admin.from("email_sends").insert({
      registrant_id: r.registrant_id,
      webinar_id: r.webinar_id,
      kind,
    });
    if (claimError) {
      if (claimError.code !== "23505") {
        errors.push(`reminder ${r.registrant_id}: ${claimError.message}`);
      }
      continue;
    }
    try {
      const template = await resolveTemplate(admin, {
        accountId: r.account_id,
        webinarId: r.webinar_id,
        type: "reminder",
        offsetMinutes: r.offset_minutes,
      });
      const branding = resolveEmailBranding({ name: r.account_name, branding: r.account_branding });
      const vars = {
        nombre: r.name,
        webinar_titulo: r.webinar_title,
        hora_webinar: formatWhen(r.computed_session_start, r.visitor_timezone),
        link_acceso: accessLinkFor(r),
        marca_color: branding.brandColor,
      };
      await sendEmail({
        to: r.email,
        subject: renderTemplate(template.subject, vars),
        html: wrapEmailShell(renderTemplate(template.body, vars), branding),
      });
      remindersSent++;
    } catch (err) {
      await admin
        .from("email_sends")
        .delete()
        .eq("registrant_id", r.registrant_id)
        .eq("kind", kind);
      errors.push(`reminder ${r.registrant_id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const { data: dueReplays } = await admin.rpc("get_due_replay_recipients", {
    p_lookback_hours: 24,
  });

  for (const r of (dueReplays ?? []) as Database["public"]["Functions"]["get_due_replay_recipients"]["Returns"]) {
    const { error: claimError } = await admin.from("email_sends").insert({
      registrant_id: r.registrant_id,
      webinar_id: r.webinar_id,
      kind: "replay_missed",
    });
    if (claimError) {
      if (claimError.code !== "23505") {
        errors.push(`replay ${r.registrant_id}: ${claimError.message}`);
      }
      continue;
    }
    try {
      const template = await resolveTemplate(admin, {
        accountId: r.account_id,
        webinarId: r.webinar_id,
        type: "replay_missed",
      });
      const branding = resolveEmailBranding({ name: r.account_name, branding: r.account_branding });
      const vars = {
        nombre: r.name,
        webinar_titulo: r.webinar_title,
        hora_webinar: formatWhen(r.computed_session_start, r.visitor_timezone),
        link_acceso: accessLinkFor(r),
        marca_color: branding.brandColor,
      };
      await sendEmail({
        to: r.email,
        subject: renderTemplate(template.subject, vars),
        html: wrapEmailShell(renderTemplate(template.body, vars), branding),
      });
      replaysSent++;
    } catch (err) {
      await admin
        .from("email_sends")
        .delete()
        .eq("registrant_id", r.registrant_id)
        .eq("kind", "replay_missed");
      errors.push(`replay ${r.registrant_id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // --- Trial lifecycle: suspend accounts whose 15-day trial expired, and
  // warn accounts about to expire. Lives in this same handler instead of a
  // separate cron route so it needs no extra entry in vercel.json or a
  // second URL in the external 5-minute cron -- both checks below are
  // cheap and fully idempotent, so running them on every tick is harmless.
  let trialWarningsSent = 0;
  let trialsSuspended = 0;

  const { data: expiringSoon } = await admin
    .from("accounts")
    .select("id, name, trial_ends_at")
    .eq("subscription_status", "trialing")
    .is("trial_warning_sent_at", null)
    .lte("trial_ends_at", new Date(Date.now() + TRIAL_WARNING_WINDOW_DAYS * DAY_MS).toISOString());

  for (const account of expiringSoon ?? []) {
    // Claim by setting trial_warning_sent_at BEFORE sending, same
    // insert-before-send pattern as the reminders above -- guards against
    // two overlapping runs both sending the warning.
    const { data: claimed, error: claimError } = await admin
      .from("accounts")
      .update({ trial_warning_sent_at: new Date().toISOString() })
      .eq("id", account.id)
      .is("trial_warning_sent_at", null)
      .select("id")
      .maybeSingle();
    if (claimError) {
      errors.push(`trial warning ${account.id}: ${claimError.message}`);
      continue;
    }
    if (!claimed) continue;

    try {
      const { data: owner } = await admin
        .from("users")
        .select("email")
        .eq("account_id", account.id)
        .eq("role", "owner")
        .maybeSingle();
      if (owner?.email) {
        const daysLeft = Math.max(
          0,
          Math.ceil((new Date(account.trial_ends_at).getTime() - Date.now()) / DAY_MS)
        );
        const { subject, html } = trialExpiringEmail(account.name, daysLeft);
        await sendEmail({ to: owner.email, subject, html });
      }
      trialWarningsSent++;
    } catch (err) {
      await admin
        .from("accounts")
        .update({ trial_warning_sent_at: null })
        .eq("id", account.id);
      errors.push(`trial warning ${account.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const { data: expiredTrials } = await admin
    .from("accounts")
    .select("id, name")
    .eq("subscription_status", "trialing")
    .lte("trial_ends_at", new Date().toISOString());

  for (const account of expiredTrials ?? []) {
    const { data: claimed, error: claimError } = await admin
      .from("accounts")
      .update({ subscription_status: "suspended", suspended_at: new Date().toISOString() })
      .eq("id", account.id)
      .eq("subscription_status", "trialing")
      .select("id")
      .maybeSingle();
    if (claimError) {
      errors.push(`trial suspend ${account.id}: ${claimError.message}`);
      continue;
    }
    if (!claimed) continue;

    try {
      const { data: owner } = await admin
        .from("users")
        .select("email")
        .eq("account_id", account.id)
        .eq("role", "owner")
        .maybeSingle();
      if (owner?.email) {
        const { subject, html } = accountSuspendedEmail(account.name);
        await sendEmail({ to: owner.email, subject, html });
      }
      trialsSuspended++;
    } catch (err) {
      errors.push(`trial suspend ${account.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // --- Monthly digest: once per calendar month, send each active/trialing
  // account a summary of the previous month. Reuses the same claim-before-
  // send pattern (last_digest_sent_at set BEFORE building/sending), so only
  // the first cron tick after the month rolls over does any work -- every
  // other tick that month sees last_digest_sent_at already inside the
  // current month and skips the account.
  let digestsSent = 0;

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const prevMonthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
  const periodLabel = new Intl.DateTimeFormat("es", { month: "long", year: "numeric" }).format(
    prevMonthStart
  );

  const { data: digestCandidates } = await admin
    .from("accounts")
    .select("id, name")
    .in("subscription_status", ["trialing", "active", "past_due"])
    .or(`last_digest_sent_at.is.null,last_digest_sent_at.lt.${monthStart.toISOString()}`);

  for (const account of digestCandidates ?? []) {
    const { data: claimed, error: claimError } = await admin
      .from("accounts")
      .update({ last_digest_sent_at: now.toISOString() })
      .eq("id", account.id)
      .or(`last_digest_sent_at.is.null,last_digest_sent_at.lt.${monthStart.toISOString()}`)
      .select("id")
      .maybeSingle();
    if (claimError) {
      errors.push(`digest ${account.id}: ${claimError.message}`);
      continue;
    }
    if (!claimed) continue;

    try {
      const { count: webinarCount } = await admin
        .from("webinars")
        .select("id", { count: "exact", head: true })
        .eq("account_id", account.id);
      // Accounts that never created a webinar have nothing to summarize --
      // skip the send but keep the claim, so we don't re-check them every
      // 5 minutes for the rest of the month.
      if (!webinarCount) continue;

      const { data: owner } = await admin
        .from("users")
        .select("email")
        .eq("account_id", account.id)
        .eq("role", "owner")
        .maybeSingle();
      if (owner?.email) {
        const { data: summary } = await admin.rpc("get_account_period_summary", {
          p_account_id: account.id,
          p_period_start: prevMonthStart.toISOString(),
          p_period_end: monthStart.toISOString(),
        });
        const row = summary?.[0];
        const { subject, html } = monthlyDigestEmail(account.name, periodLabel, {
          registrantCount: row?.registrant_count ?? 0,
          attendeeCount: row?.attendee_count ?? 0,
          avgWatchPct: row?.avg_watch_pct ?? 0,
          topWebinarTitle: row?.top_webinar_title ?? null,
          topWebinarRegistrants: row?.top_webinar_registrants ?? 0,
        });
        await sendEmail({ to: owner.email, subject, html });
      }
      digestsSent++;
    } catch (err) {
      errors.push(`digest ${account.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json({
    remindersSent,
    replaysSent,
    trialWarningsSent,
    trialsSuspended,
    digestsSent,
    errors,
  });
}
