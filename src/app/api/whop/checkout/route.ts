import { NextResponse } from "next/server";

import { getCurrentAccount } from "@/lib/data/account";
import { createUpgradeCheckoutUrl, isBillingPeriod, isSelfServePlanKey } from "@/lib/whop";

// Every caller of this route already has an account in our system --
// Facturación's "cambiar de plan", the day-8 hard paywall's "seguir con
// este plan" buttons, and reactivating a canceled subscription. None of
// them get a fresh trial (see createUpgradeCheckoutUrl): the trial is a
// one-time thing that only happens via /checkout, right after a
// Pricing-driven signup.
export async function POST(request: Request) {
  const { plan_key: rawPlanKey, billing_period: rawBilling } = (await request.json()) as {
    plan_key?: string;
    billing_period?: string;
  };

  if (!rawPlanKey || !isSelfServePlanKey(rawPlanKey)) {
    return NextResponse.json({ error: "invalid plan" }, { status: 400 });
  }
  const planKey = rawPlanKey;
  const billingPeriod = rawBilling && isBillingPeriod(rawBilling) ? rawBilling : "monthly";

  const current = await getCurrentAccount();
  if (!current) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }
  if (current.user.role !== "owner") {
    return NextResponse.json(
      { error: "only the account owner manages billing" },
      { status: 403 }
    );
  }

  const url = await createUpgradeCheckoutUrl({ planKey, billingPeriod, accountId: current.account.id });
  if (!url) {
    return NextResponse.json({ error: "checkout failed" }, { status: 500 });
  }
  return NextResponse.json({ url });
}
