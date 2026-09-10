import { NextResponse } from "next/server";
import { unwrapWebhook, WebhookVerificationError } from "@whop/sdk/helpers";

import { planKeyForWhopPlanId, STARTER_KIT_PRODUCT_ID } from "@/lib/whop";
import { createAdminClient } from "@/lib/supabase/admin";
import { accountActivatedEmail, paymentFailedEmail } from "@/lib/platform-email";
import { sendEmail } from "@/lib/resend";
import { claimStarterKitFromWhop } from "@/lib/launchpad/whop-starter-kit-claim";
import { recordGrowthEventAsAdmin } from "@/lib/growth/record-event-admin";
import type { Database, SubscriptionStatus } from "@/lib/supabase/database.types";

// Whop's generated WebhookEvent enum (@whop/sdk/api/types/WebhookEvent) --
// current event names as of @whop/sdk 1.1.2. unwrapWebhook does NOT
// validate the payload against a typed model (Fern generates no webhook
// event models), so this shape is asserted, not checked by the SDK --
// but it IS now verified against a real membership.activated delivery
// (2026-09-10): plan/product/user come back as nested objects
// ({ id, ... }), not the flat *_id fields an earlier version of this type
// assumed. That mismatch silently routed every Starter Kit claim into
// syncMembership() instead of claimStarterKitFromWhop() -- see the git
// history on this file for the incident.
type WhopWebhookPayload = {
  type: string;
  data: {
    id: string; // membership id, prefixed "mem_"
    status: string;
    user: { id: string; email: string | null } | null;
    plan: { id: string } | null;
    product: { id: string } | null;
    metadata: Record<string, unknown>;
  };
};

const SYNCED_EVENTS = new Set(["membership.activated", "membership.deactivated"]);

function mapWhopStatus(status: string): SubscriptionStatus {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
    case "completed":
      return "active";
    case "past_due":
    case "unresolved":
      return "past_due";
    case "canceled":
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
    console.error(`[whop webhook] notify owner failed for account ${accountId}:`, err);
  }
}

// Unlike the Lemon Squeezy webhook, there is no email-matching fallback
// here: Whop's Users API only returns an email address on the "me"
// self-view (see @whop/sdk's User.email doc comment), not for an
// arbitrary user_id looked up with a server-side API key. metadata.
// account_id -- attached when the checkout configuration was created,
// see lib/whop.ts -- is the only reliable link back to our account.
function resolveAccountId(payload: WhopWebhookPayload): string | null {
  const accountId = payload.data.metadata?.account_id;
  return typeof accountId === "string" ? accountId : null;
}

async function syncMembership(payload: WhopWebhookPayload) {
  const admin = createAdminClient();
  const accountId = resolveAccountId(payload);
  if (!accountId) {
    console.error(
      `[whop webhook] membership ${payload.data.id} (product ${payload.data.product?.id ?? "?"}) has no metadata.account_id -- was it created outside createTrialCheckoutConfig/createUpgradeCheckoutUrl?`
    );
    return;
  }

  const newStatus = mapWhopStatus(payload.data.status);
  const planKey = payload.data.plan ? planKeyForWhopPlanId(payload.data.plan.id) : undefined;

  const { data: before } = await admin
    .from("accounts")
    .select("name, subscription_status, canceled_at")
    .eq("id", accountId)
    .maybeSingle();

  if (!before) {
    console.error(`[whop webhook] account ${accountId} not found for membership ${payload.data.id}`);
    return;
  }

  const update: Database["public"]["Tables"]["accounts"]["Update"] = {
    billing_customer_id: payload.data.user?.id ?? null,
    billing_subscription_id: payload.data.id,
    subscription_status: newStatus,
  };

  // Same guard as the Lemon Squeezy webhook: pin canceled_at to the first
  // time this account actually went canceled so a redelivered webhook
  // doesn't keep pushing the 90-day retention clock out, and clear it on
  // reactivation so a later cancellation starts the clock fresh.
  if (newStatus === "canceled") {
    update.canceled_at = before.canceled_at ?? new Date().toISOString();
  } else if (before.canceled_at) {
    update.canceled_at = null;
    update.deletion_warning_sent_at = null;
  }

  if (planKey) {
    const { data: plan } = await admin.from("plans").select("id").eq("key", planKey).single();
    if (plan) update.plan_id = plan.id;
  }

  const { error } = await admin.from("accounts").update(update).eq("id", accountId);
  if (error) {
    // enforce_plan_downgrade_limits can reject this if the account is
    // still over the new plan's limits -- Whop already charged/changed
    // the membership at this point, so we log for manual reconciliation
    // instead of retrying (same tradeoff as the Lemon Squeezy webhook).
    console.error(
      `[whop webhook] failed to sync account ${accountId} to plan ${planKey}:`,
      error.message
    );
    return;
  }

  if (before.subscription_status !== "active" && newStatus === "active") {
    await notifyOwner(admin, accountId, before.name, accountActivatedEmail);
    // Growth OS revenue attribution: this is the one lifecycle event
    // MVP 0 wires from here (subscription_upgraded/renewed/cancelled are
    // declared in the growth_event_name enum but not emitted yet --
    // deferred, not needed to prove "attribution -> revenue" works end to
    // end). Best-effort, same as notifyOwner above -- a tracking failure
    // must never surface as a billing-sync error.
    try {
      const { data: owner } = await admin
        .from("users")
        .select("id")
        .eq("account_id", accountId)
        .eq("role", "owner")
        .maybeSingle();
      await recordGrowthEventAsAdmin(admin, {
        eventName: "subscription_started",
        accountId,
        userId: owner?.id ?? null,
      });

      // Freezes growth_attributions' last-touch at the moment of first
      // paid conversion (recompute_growth_attribution's own logic caps
      // last-touch at the first subscription_started event) -- a service-
      // role call, so this relies on recompute_growth_attribution's
      // auth.uid() is null bypass.
      await admin.rpc("recompute_growth_attribution", { p_account_id: accountId });
    } catch (err) {
      console.error(`[whop webhook] subscription_started tracking failed for account ${accountId}:`, err);
    }
  }
  if (before.subscription_status !== "past_due" && newStatus === "past_due") {
    await notifyOwner(admin, accountId, before.name, paymentFailedEmail);
  }
}

export async function POST(request: Request): Promise<Response> {
  const rawBody = await request.text();
  const headers = Object.fromEntries(request.headers);

  let event: WhopWebhookPayload;
  try {
    event = unwrapWebhook<WhopWebhookPayload>(rawBody, {
      headers,
      key: process.env.WHOP_WEBHOOK_SECRET,
    });
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      return NextResponse.json({ error: "invalid signature" }, { status: 400 });
    }
    return NextResponse.json({ error: "invalid payload" }, { status: 400 });
  }

  // Awaited, not fire-and-forget: the Lemon Squeezy webhook awaits its
  // sync inline for the same reason -- a failure needs to show up as a
  // non-2xx (or at least a logged error before responding) rather than
  // vanishing silently after an immediate 200, since nothing else surfaces
  // a billing-sync failure otherwise.
  if (SYNCED_EVENTS.has(event.type)) {
    if (event.data.product?.id === STARTER_KIT_PRODUCT_ID) {
      // Free marketplace listing, not a checkout we created -- no
      // metadata.account_id to sync against, so this never goes through
      // syncMembership. Provisioning only reacts to the membership
      // actually going live; "deactivated" has nothing to unwind (free,
      // lifetime access, no billing behind it).
      if (event.type === "membership.activated") {
        await claimStarterKitFromWhop({
          membershipId: event.data.id,
          whopUserId: event.data.user?.id ?? null,
        });
      }
    } else {
      await syncMembership(event);
    }
  }

  return NextResponse.json({ received: true });
}
