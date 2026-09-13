import "server-only";

import { randomBytes } from "node:crypto";

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

// Free "Evergreen Webinar Starter Kit" listing on Whop's marketplace
// (https://whop.com/wewebinars/products/evergreen-starter-kit/) -- claiming
// it creates a $0 membership for this product, then Whop redirects the
// buyer to /starter-kit. Unlike PRICING_PLANS/CONVERT_PLANS this isn't a
// checkout *we* create, so the resulting membership carries no
// metadata.account_id -- see the webhook route for how a buyer is resolved
// and provisioned from it instead.
export const STARTER_KIT_PRODUCT_ID = "prod_eLNUbVQzbycKU";

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

// All monthly + annual plan ids across every self-serve tier, in both
// plan sets (PRICING_PLANS for a fresh signup checkout, CONVERT_PLANS for
// an existing account upgrading) -- the demo offer below doesn't know in
// advance which checkout path the person who claims it will take, so the
// code is scoped to every plan_id either path could land on.
function allSelfServePlanIds(): string[] {
  const ids: string[] = [];
  for (const map of [PRICING_PLANS, CONVERT_PLANS]) {
    for (const byPeriod of Object.values(map)) {
      ids.push(byPeriod.monthly, byPeriod.annual);
    }
  }
  return ids;
}

export type DemoDiscountCode = {
  code: string;
  whopPromoCodeId: string;
};

// "Oferta de la demo oficial" (ver /demo/oferta): 10% real y único por
// persona, con vencimiento real en Whop (no solo en nuestra propia base) --
// nadie puede canjearlo después de esa hora aunque de algún modo consiga
// el código. promo_duration_months: 3 resuelve los dos casos del negocio
// con un solo código, sin branching acá: en un plan mensual descuenta las
// primeras 3 facturas; en el anual, como el próximo cobro recién ocurre a
// los 12 meses (bien afuera de esa ventana de 3 meses), el descuento
// naturalmente solo llega a pegar en el único pago que hay -- "10% los
// primeros 3 meses o 10% en el anual" sin necesitar dos códigos.
//
// amount_off acá es 0-100 (entero), no una fracción decimal -- el único
// ejemplo real en el SDK (@whop/sdk/reference.md, "AFFILIATE25") usa
// amount_off: 25 para un cupón del 25%, aunque el docstring del tipo
// PromoCode (el objeto que se lee, no este request) dice lo contrario
// ("decimal fraction"). Seguimos el ejemplo concreto, no el comentario --
// pero conviene confirmarlo una vez contra un checkout real de Whop antes
// de confiar en esto a escala.
export async function createDemoDiscountCode({
  email,
  expiresAt,
}: {
  email: string;
  expiresAt: string;
}): Promise<DemoDiscountCode | null> {
  if (!whopConfigured() || !process.env.WHOP_ACCOUNT_ID) return null;

  const code = `DEMO${randomBytes(4).toString("hex").toUpperCase()}`;

  try {
    const promo = await whopClient().promoCodes.create({
      account_id: process.env.WHOP_ACCOUNT_ID,
      code,
      amount_off: 10,
      base_currency: "usd",
      promo_type: "percentage",
      promo_duration_months: 3,
      new_users_only: false,
      one_per_customer: true,
      expires_at: expiresAt,
      plan_ids: allSelfServePlanIds(),
    });
    return { code: promo.code ?? code, whopPromoCodeId: promo.id };
  } catch (err) {
    console.error(`[whop] createDemoDiscountCode failed for ${email}:`, err);
    return null;
  }
}

// Previously registered the buyer as a Whop lead (leads.create()) to read
// their email off the response, gated behind the member:email:read
// permission on this Whop app -- dropped after a real claim showed that
// permission isn't actually granted (Whop returns a null email), and that
// the membership.activated webhook payload itself already carries
// data.user.email directly. See claimStarterKitFromWhop, which now reads
// the email straight from the webhook instead of making this extra,
// permission-gated API call.
