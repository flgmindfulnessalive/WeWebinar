import { redirect } from "next/navigation";

import { getCurrentAccount } from "@/lib/data/account";
import { isUpgradePlanKey } from "@/lib/whop";
import { Checkout } from "@/components/checkout";

// Reached after signup when the host picked Pro/Business on Pricing (see
// actions/account.ts) -- renders the embedded Whop checkout in place of
// the old redirect to a hosted purchase_url, so payment happens without
// leaving the site. Requires an existing account: Checkout needs an
// accountId to scope the checkout configuration to (see lib/whop.ts),
// which only exists once signup has actually run.
export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const { plan } = await searchParams;

  const current = await getCurrentAccount();
  if (!current) {
    redirect(`/login?next=/checkout${plan ? `?plan=${plan}` : ""}`);
  }

  if (!plan || !isUpgradePlanKey(plan)) {
    redirect("/dashboard/settings/billing");
  }

  // Already on that plan (or a higher one bought elsewhere) -- nothing to
  // check out.
  if (current.plan.key === plan) {
    redirect("/dashboard");
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-md">
        <Checkout plan={plan} accountId={current.account.id} />
      </div>
    </div>
  );
}
