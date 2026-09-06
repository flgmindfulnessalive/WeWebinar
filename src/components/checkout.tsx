import { createSelfServeCheckoutConfig, type SelfServePlanKey } from "@/lib/whop";
import { CheckoutEmbed } from "./checkout-embed";

// Server component: creates the account-scoped checkout configuration
// (needs the secret Whop API key, so it can't happen client-side) and
// hands the resulting configuration id to the client embed as
// `sessionId`. See lib/whop.ts for why this replaces a bare `planId`
// checkout -- without the account_id attached as metadata here, the
// webhook has no reliable way to know which WeWebinars account to
// activate.
export async function Checkout({
  plan,
  accountId,
}: {
  plan: SelfServePlanKey;
  accountId: string;
}) {
  const config = await createSelfServeCheckoutConfig({ planKey: plan, accountId });

  if (!config) {
    return <p>No se pudo iniciar el checkout. Intenta de nuevo en unos minutos.</p>;
  }

  return <CheckoutEmbed sessionId={config.configId} />;
}
