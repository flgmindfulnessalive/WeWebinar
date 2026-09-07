import "server-only";

import { WhopClient } from "@whop/sdk";
import type { Database } from "@/lib/supabase/database.types";

// Thin wrapper over the Whop SDK -- same role as billing.ts's Lemon Squeezy
// facade. See CreateCheckoutConfigurationsRequest in @whop/sdk: creating a
// checkout configuration (not a bare planId checkout) is the only way to
// attach our own account_id as metadata, which the webhook later reads
// back off membership.metadata to know which WeWebinars account to
// activate. A bare planId checkout has no reliable way back to our
// account: Whop's Users API only returns email on the "me" self-view
// (see @whop/sdk's User.email doc comment), so matching by buyer email
// from a server-side API key is not viable here the way it is as a
// Lemon Squeezy fallback.
export type SelfServePlanKey = Exclude<
  Database["public"]["Tables"]["plans"]["Row"]["key"],
  "enterprise"
>;

export type BillingPeriod = "monthly" | "annual";

export function isBillingPeriod(value: string): value is BillingPeriod {
  return value === "monthly" || value === "annual";
}

type PlanIdMap = Record<SelfServePlanKey, Record<BillingPeriod, string>>;

// Two entirely separate sets of Whop plans, because trial_period_days is
// only settable when Whop creates a plan inline (see
// CreateCheckoutConfigurationsRequest.Plan in @whop/sdk) -- it can NOT be
// overridden per checkout configuration when referencing an existing
// plan_id. So a trial-length decision has to be baked into which plan_id
// we reference, not something we can toggle at checkout time:
//
// - PRICING_PLANS: only ever used by the fresh, Pricing-driven signup
//   checkout (see createTrialCheckoutConfig / app/checkout). 7-day trial,
//   card required, first charge on day 8.
// - CONVERT_PLANS: everything else that creates a Whop checkout for an
//   account that already exists in our system -- Facturación's "cambiar
//   de plan", reactivating a canceled subscription, and the day-8 hard
//   paywall's "seguir con este plan" buttons for a Starter trial that
//   never went through Pricing. No trial, first charge is immediate on
//   confirm.
//
// Real plan ids from the Whop dashboard, not secrets (same category as a
// Stripe/Lemon Squeezy price id) -- committed here rather than read from
// env vars so there's one source of truth for which id maps to which
// tier + billing period. Keyed by the DB's actual plan key ("core"), not
// the display name ("Starter") -- see 20260831000004_rename_core_plan.
const PRICING_PLANS: PlanIdMap = {
  core: { monthly: "plan_dLbT2Tkkwy8bl", annual: "plan_9Nf3PA2c7lQTV" },
  pro: { monthly: "plan_FcRXqhuvgFw94", annual: "plan_ZDBLDt5YsFiIt" },
  business: { monthly: "plan_U0QQBJm98XJHT", annual: "plan_bUuLhj5nMqxAn" },
};

const CONVERT_PLANS: PlanIdMap = {
  core: { monthly: "plan_KjYMdLHzxow6F", annual: "plan_gkZODvhpLNr6F" },
  pro: { monthly: "plan_CulbKEpewbSGC", annual: "plan_uGZmsnOBapjFv" },
  business: { monthly: "plan_kXJANREGprAIS", annual: "plan_YETvkZmMp8iuR" },
};

export function planKeyForWhopPlanId(planId: string): SelfServePlanKey | undefined {
  const inMap = (map: PlanIdMap) =>
    (Object.entries(map) as [SelfServePlanKey, Record<BillingPeriod, string>][]).find(
      ([, byPeriod]) => byPeriod.monthly === planId || byPeriod.annual === planId
    )?.[0];

  return inMap(PRICING_PLANS) ?? inMap(CONVERT_PLANS);
}

export function isSelfServePlanKey(value: string): value is SelfServePlanKey {
  return value in PRICING_PLANS;
}

function whopConfigured(): boolean {
  return Boolean(process.env.WHOP_API_KEY);
}

function whopClient(): WhopClient {
  return new WhopClient({ token: process.env.WHOP_API_KEY });
}

// Creates a Whop checkout configuration scoped to one account + plan, so
// the resulting membership's metadata.account_id reliably identifies
// which WeWebinars account to activate -- see the module comment above.
// Returns the configuration id to pass as WhopCheckoutEmbed's `sessionId`
// prop (not `planId`).
async function createCheckoutConfig({
  planId,
  planKey,
  accountId,
}: {
  planId: string;
  planKey: SelfServePlanKey;
  accountId: string;
}): Promise<{ configId: string; purchaseUrl: string | null } | null> {
  if (!whopConfigured()) return null;

  try {
    const config = await whopClient().checkoutConfigurations.create({
      plan_id: planId,
      metadata: { account_id: accountId, plan_key: planKey },
      redirect_url: `${process.env.NEXT_PUBLIC_APP_URL}/checkout/complete?status=success`,
    });
    return { configId: config.id, purchaseUrl: config.purchase_url ?? null };
  } catch (err) {
    console.error("[whop] createCheckoutConfig failed:", err);
    return null;
  }
}

// Camino B: a host arriving straight from Pricing with a specific plan +
// billing period in mind. Card required, 7-day trial, first charge on
// day 8 -- see PRICING_PLANS above. Used only by /checkout, right after
// signup, never from inside the dashboard.
export async function createTrialCheckoutConfig({
  planKey,
  billingPeriod,
  accountId,
}: {
  planKey: SelfServePlanKey;
  billingPeriod: BillingPeriod;
  accountId: string;
}): Promise<{ configId: string; purchaseUrl: string | null } | null> {
  return createCheckoutConfig({
    planId: PRICING_PLANS[planKey][billingPeriod],
    planKey,
    accountId,
  });
}

// Camino A and everything else in-app: a Starter trial upgrading (before
// or after its own 7 days run out), an existing paying customer changing
// plans from Facturación, or a canceled subscription reactivating. None
// of these get a second trial -- see CONVERT_PLANS above. Returns just
// the hosted purchase_url (no embed for this path): unlike the
// fresh-signup flow, the host is already inside the product and
// comfortable navigating to Whop to confirm a real, immediate charge.
export async function createUpgradeCheckoutUrl({
  planKey,
  billingPeriod,
  accountId,
}: {
  planKey: SelfServePlanKey;
  billingPeriod: BillingPeriod;
  accountId: string;
}): Promise<string | null> {
  const config = await createCheckoutConfig({
    planId: CONVERT_PLANS[planKey][billingPeriod],
    planKey,
    accountId,
  });
  return config?.purchaseUrl ?? null;
}

// Replaces billing.ts's getBillingPortalUrl: Whop has no hosted "manage
// subscription" portal to redirect to (no portal URL field anywhere in
// @whop/sdk's Membership/CheckoutConfiguration types) -- cancellation is
// a direct API call instead. cancel_at_period_end: true keeps access
// until the period the customer already paid for ends, same behavior
// Lemon Squeezy's portal cancellation had.
export async function cancelSelfServeMembership(membershipId: string): Promise<boolean> {
  if (!whopConfigured()) return false;
  try {
    await whopClient().memberships.cancel({ id: membershipId, cancel_at_period_end: true });
    return true;
  } catch (err) {
    console.error("[whop] cancelSelfServeMembership failed:", err);
    return false;
  }
}
