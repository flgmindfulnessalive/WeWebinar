import { NextResponse } from "next/server";
import crypto from "node:crypto";

import { planKeyForVariantId } from "@/lib/billing";
import { createAdminClient } from "@/lib/supabase/admin";
import { accountActivatedEmail, paymentFailedEmail } from "@/lib/platform-email";
import { sendEmail } from "@/lib/resend";
import type { Database, SubscriptionStatus } from "@/lib/supabase/database.types";

type LemonSqueezyWebhookPayload = {
  meta: {
    event_name: string;
    custom_data?: { account_id?: string; plan_key?: string };
  };
  data: {
    id: string;
    attributes: {
      status: string;
      customer_id: number;
      variant_id: number;
    };
  };
};

const SYNCED_EVENTS = new Set([
  "subscription_created",
  "subscription_updated",
  "subscription_cancelled",
  "subscription_resumed",
  "subscription_expired",
  "subscription_paused",
  "subscription_unpaused",
  "subscription_payment_failed",
  "subscription_payment_success",
]);

function verifySignature(rawBody: string, signature: string | null): boolean {
  const secret = process.env.LEMONSQUEEZY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  const expected = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const signatureBuf = Buffer.from(signature, "utf8");
  if (expectedBuf.length !== signatureBuf.length) return false;
  return crypto.timingSafeEqual(expectedBuf, signatureBuf);
}

function mapLemonSqueezyStatus(status: string): SubscriptionStatus {
  switch (status) {
    case "on_trial":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "cancelled":
    case "expired":
      return "canceled";
    default:
      return "suspended";
  }
}

async function notifyOwner(
  admin: ReturnType<typeof createAdminClient>,
  accountId: string,
  accountName: string,
  build: (name: string) => { subject: string; html: string }
) {
  // Best-effort: the status change already landed, so a failed
  // notification email is logged and swallowed rather than retried.
  try {
    const { data: owner } = await admin
      .from("users")
      .select("email")
      .eq("account_id", accountId)
      .eq("role", "owner")
      .maybeSingle();
    if (owner?.email) {
      const { subject, html } = build(accountName);
      await sendEmail({ to: owner.email, subject, html });
    }
  } catch (err) {
    console.error(`[lemonsqueezy webhook] notify owner failed for account ${accountId}:`, err);
  }
}

// custom_data (set at checkout, see createSelfServeCheckoutUrl) is
// reliably present on the events tied directly to that checkout, but not
// documented as guaranteed on every later webhook for the same
// subscription (e.g. a change made from the customer portal). Falling
// back to matching by the Lemon Squeezy customer id we stored on the
// first subscription_created event keeps this correct either way -- this
// assumption should be double-checked against real webhook payloads once
// a store exists (see DEPLOY.md).
async function resolveAccountId(
  admin: ReturnType<typeof createAdminClient>,
  payload: LemonSqueezyWebhookPayload
): Promise<string | null> {
  const fromCustomData = payload.meta.custom_data?.account_id;
  if (fromCustomData) return fromCustomData;

  const customerId = String(payload.data.attributes.customer_id ?? "");
  if (!customerId) return null;
  const { data } = await admin
    .from("accounts")
    .select("id")
    .eq("billing_customer_id", customerId)
    .maybeSingle();
  return data?.id ?? null;
}

async function syncSubscription(payload: LemonSqueezyWebhookPayload) {
  const admin = createAdminClient();
  const accountId = await resolveAccountId(admin, payload);
  if (!accountId) return;

  const attrs = payload.data.attributes;
  const newStatus = mapLemonSqueezyStatus(attrs.status);
  // The reliable source for which plan this is -- same principle as the
  // old Stripe webhook resolving plan_key from the subscription's actual
  // price_id rather than trusting metadata for it.
  const planKey = planKeyForVariantId(String(attrs.variant_id));

  const { data: before } = await admin
    .from("accounts")
    .select("name, subscription_status, canceled_at")
    .eq("id", accountId)
    .maybeSingle();

  const update: Database["public"]["Tables"]["accounts"]["Update"] = {
    billing_customer_id: String(attrs.customer_id),
    billing_subscription_id: payload.data.id,
    subscription_status: newStatus,
  };

  // Pin canceled_at to the first time this account actually went canceled
  // (a redelivered webhook must not keep pushing the 90-day retention
  // clock out), and clear it -- along with the "your data is deleted
  // soon" warning flag -- the moment a reactivation moves the account off
  // canceled, so a later cancellation starts the clock fresh.
  if (newStatus === "canceled") {
    update.canceled_at = before?.canceled_at ?? new Date().toISOString();
  } else if (before?.canceled_at) {
    update.canceled_at = null;
    update.deletion_warning_sent_at = null;
  }

  if (planKey) {
    const { data: plan } = await admin.from("plans").select("id").eq("key", planKey).single();
    if (plan) update.plan_id = plan.id;
  }

  const { error } = await admin.from("accounts").update(update).eq("id", accountId);
  if (error) {
    // The enforce_plan_downgrade_limits trigger can reject a plan_id
    // change if the account is still over the new plan's limits (e.g.
    // the host has more published webinars than the lower plan allows).
    // Lemon Squeezy already charged/changed the subscription at this
    // point, so we log for manual reconciliation instead of retrying.
    console.error(
      `[lemonsqueezy webhook] failed to sync account ${accountId} to plan ${planKey}:`,
      error.message
    );
    return;
  }

  if (before && before.subscription_status !== "active" && newStatus === "active") {
    await notifyOwner(admin, accountId, before.name, accountActivatedEmail);
  }
  // Only notify on the transition into past_due, not on every retry --
  // otherwise repeated payment_failed webhooks for the same unpaid
  // invoice could send several near-identical warnings.
  if (before && before.subscription_status !== "past_due" && newStatus === "past_due") {
    await notifyOwner(admin, accountId, before.name, paymentFailedEmail);
  }
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-signature");

  if (!verifySignature(rawBody, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 400 });
  }

  let payload: LemonSqueezyWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  if (SYNCED_EVENTS.has(payload.meta.event_name)) {
    await syncSubscription(payload);
  }

  return NextResponse.json({ received: true });
}
