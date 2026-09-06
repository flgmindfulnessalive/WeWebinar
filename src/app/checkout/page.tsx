import { redirect } from "next/navigation";

import { getCurrentAccount } from "@/lib/data/account";
import { isSelfServePlanKey } from "@/lib/whop";
import { Checkout } from "@/components/checkout";

// Reached after signup when the host picked a specific plan's "Empezar"
// on Pricing -- Starter, Pro, or Business (see actions/account.ts) --
// renders the embedded Whop checkout in place of a redirect to a hosted
// purchase_url, so payment happens without leaving the site. Requires an
// existing account: Checkout needs an accountId to scope the checkout
// configuration to (see lib/whop.ts), which only exists once signup has
// actually run.
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

  if (!plan || !isSelfServePlanKey(plan)) {
    redirect("/dashboard/settings/billing");
  }

  // Every new account starts on the Starter trial regardless of which
  // plan was picked (see TRIAL_PLAN_KEY in actions/account.ts), so
  // current.plan.key === plan is expected -- not a reason to skip
  // checkout -- for someone who picked Starter itself or hasn't paid
  // yet. Only skip when they're already a paying customer on this exact
  // plan (nothing to check out for real).
  if (current.account.subscription_status !== "trialing" && current.plan.key === plan) {
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
