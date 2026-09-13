import { createTrialCheckoutConfig, type BillingPeriod, type SelfServePlanKey } from "@/lib/whop";
import { CheckoutEmbed } from "./checkout-embed";

// Server component: creates the account-scoped, trial checkout
// configuration (needs the secret Whop API key, so it can't happen
// client-side) and hands the resulting configuration id to the client
// embed as `sessionId`. See lib/whop.ts for why this replaces a bare
// `planId` checkout -- without the account_id attached as metadata here,
// the webhook has no reliable way to know which WeWebinars account to
// activate. Only ever reached from /checkout, right after a
// Pricing-driven signup -- see createTrialCheckoutConfig for why every
// other in-app checkout path uses createUpgradeCheckoutUrl instead.
export async function Checkout({
  plan,
  billingPeriod,
  accountId,
  promoCode,
}: {
  plan: SelfServePlanKey;
  billingPeriod: BillingPeriod;
  accountId: string;
  promoCode?: string;
}) {
  const config = await createTrialCheckoutConfig({ planKey: plan, billingPeriod, accountId });

  if (!config) {
    return <p>No se pudo iniciar el checkout. Intenta de nuevo en unos minutos.</p>;
  }

  return <CheckoutEmbed sessionId={config.configId} promoCode={promoCode} />;
}
