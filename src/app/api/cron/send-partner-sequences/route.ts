import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { escapeHtml, unsubscribeHeaders, wrapPartnerOutreachEmail } from "@/lib/email-templates";
import { sendEmail } from "@/lib/resend";
import type { PartnerMessageKind, PartnerChannel } from "@/lib/supabase/database.types";

function isAuthorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

function partnerUnsubscribeUrlFor(token: string) {
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/unsubscribe?scope=partner_outreach&token=${token}`;
}

// {{var}} substitution for operator-authored templates. `escapeValues`
// governs whether the substituted value gets HTML-escaped: true for the
// HTML body (prospect data such as full_name is semi-trusted, scraped/
// imported, so it's escaped like any other template var elsewhere in this
// app), false for the plain-text subject line.
function renderVars(template: string, vars: Record<string, string>, escapeValues: boolean): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (match, key: string) => {
    if (!(key in vars)) return match;
    return escapeValues ? escapeHtml(vars[key]) : vars[key];
  });
}

type DueEnrollment = {
  campaign_id: string;
  prospect_id: string;
  current_step: number;
  partner_campaigns: { id: string; name: string; status: string } | null;
  partner_prospects: {
    id: string;
    full_name: string | null;
    username: string | null;
    email: string | null;
    unsubscribed_at: string | null;
    unsubscribe_token: string;
    touches_count: number;
  } | null;
};

type SequenceStep = {
  id: string;
  step_order: number;
  delay_days: number;
  channel: PartnerChannel;
  kind: PartnerMessageKind;
  subject: string | null;
  body_template: string;
};

// Meant to be invoked periodically (e.g. daily) by an external scheduler
// (see vercel.json). Each enrollment is independent: one failure (bad
// email, transient Resend error) is logged as a "failed" message and the
// enrollment still advances, rather than getting stuck retrying forever.
//
// No inbound-reply detection here (manual pause, per the user's own
// choice) -- a prospect keeps receiving steps until the operator pauses
// them from the UI, the sequence runs out of steps, or they unsubscribe.
export async function GET(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const from = process.env.RESEND_PARTNER_FROM_EMAIL;
  if (!from) {
    return NextResponse.json({ error: "RESEND_PARTNER_FROM_EMAIL is not configured" }, { status: 500 });
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  const { data: due } = await admin
    .from("partner_campaign_prospects")
    .select(
      "campaign_id, prospect_id, current_step, partner_campaigns(id, name, status), partner_prospects(id, full_name, username, email, unsubscribed_at, unsubscribe_token, touches_count)"
    )
    .eq("status", "active")
    .lte("next_send_at", nowIso)
    .returns<DueEnrollment[]>();

  const stepsCache = new Map<string, SequenceStep[]>();
  async function stepsFor(campaignId: string): Promise<SequenceStep[]> {
    const cached = stepsCache.get(campaignId);
    if (cached) return cached;
    const { data } = await admin
      .from("partner_sequence_steps")
      .select("id, step_order, delay_days, channel, kind, subject, body_template")
      .eq("campaign_id", campaignId)
      .order("step_order", { ascending: true });
    const steps = data ?? [];
    stepsCache.set(campaignId, steps);
    return steps;
  }

  for (const enrollment of due ?? []) {
    const campaign = enrollment.partner_campaigns;
    const prospect = enrollment.partner_prospects;
    if (!campaign || !prospect || campaign.status !== "active") {
      skipped++;
      continue;
    }

    const steps = await stepsFor(campaign.id);
    const step = steps[enrollment.current_step];

    // No more steps, no email on file, or the prospect unsubscribed --
    // nothing left to send. Ends the enrollment instead of leaving it
    // "active" with a next_send_at that will never resolve to anything.
    if (!step || !prospect.email || prospect.unsubscribed_at) {
      await admin
        .from("partner_campaign_prospects")
        .update({ status: "completed", next_send_at: null })
        .eq("campaign_id", enrollment.campaign_id)
        .eq("prospect_id", enrollment.prospect_id)
        .eq("current_step", enrollment.current_step);
      skipped++;
      continue;
    }

    // Optimistic claim: only proceed if this is still the current step for
    // this enrollment. If a concurrent run already claimed it, 0 rows come
    // back and this run backs off instead of double-sending.
    const { data: claimed } = await admin
      .from("partner_campaign_prospects")
      .update({ current_step: enrollment.current_step + 1 })
      .eq("campaign_id", enrollment.campaign_id)
      .eq("prospect_id", enrollment.prospect_id)
      .eq("current_step", enrollment.current_step)
      .eq("status", "active")
      .select("prospect_id");
    if (!claimed || claimed.length === 0) {
      skipped++;
      continue;
    }

    const nextStep = steps[enrollment.current_step + 1];
    const nextSendAt = nextStep
      ? new Date(Date.now() + nextStep.delay_days * 24 * 60 * 60 * 1000).toISOString()
      : null;
    const finalStatus = nextStep ? "active" : "completed";

    const displayName = prospect.full_name || prospect.username || "";
    const vars = { nombre: displayName };
    const subject = renderVars(step.subject || campaign.name, vars, false);
    const bodyHtml = renderVars(step.body_template, vars, true);
    const unsubscribeUrl = partnerUnsubscribeUrlFor(prospect.unsubscribe_token);

    let resendMessageId: string | null = null;
    let sendError: string | null = null;
    try {
      const result = await sendEmail({
        to: prospect.email,
        subject,
        html: wrapPartnerOutreachEmail(bodyHtml, unsubscribeUrl),
        headers: unsubscribeHeaders(unsubscribeUrl),
        from,
      });
      resendMessageId = result.data?.id ?? null;
      sent++;
    } catch (err) {
      sendError = err instanceof Error ? err.message : "unknown error";
      errors.push(`${prospect.id} step ${step.step_order}: ${sendError}`);
    }

    await admin.from("partner_messages").insert({
      prospect_id: prospect.id,
      campaign_id: campaign.id,
      sequence_step_id: step.id,
      channel: step.channel,
      kind: step.kind,
      body: bodyHtml,
      ai_generated: false,
      status: sendError ? "failed" : "sent",
      sent_via: "sequence_auto",
      sent_at: sendError ? null : nowIso,
      scheduled_for: nowIso,
      resend_message_id: resendMessageId,
    });

    await admin
      .from("partner_campaign_prospects")
      .update({ status: finalStatus, next_send_at: nextSendAt })
      .eq("campaign_id", enrollment.campaign_id)
      .eq("prospect_id", enrollment.prospect_id);

    if (!sendError) {
      await admin
        .from("partner_prospects")
        .update({ last_contact_at: nowIso, touches_count: prospect.touches_count + 1 })
        .eq("id", prospect.id);
      await admin.from("partner_activity_log").insert({
        prospect_id: prospect.id,
        type: "marked_contacted",
        payload: { campaign_id: campaign.id, sequence_step_id: step.id, source: "sequence_auto" },
      });
    }
  }

  if (errors.length > 0) {
    console.error("[send-partner-sequences] errors:", errors);
  }

  return NextResponse.json({ sent, skipped, errors: errors.length });
}
