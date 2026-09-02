import { NextResponse } from "next/server";

import { getCurrentAccount } from "@/lib/data/account";
import { createSelfServeCheckoutSession, isSelfServePlanKey } from "@/lib/stripe";

export async function POST(request: Request) {
  const { plan_key: rawPlanKey } = (await request.json()) as { plan_key?: string };

  if (!rawPlanKey || !isSelfServePlanKey(rawPlanKey)) {
    return NextResponse.json({ error: "invalid plan" }, { status: 400 });
  }
  const planKey = rawPlanKey;

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

  try {
    const url = await createSelfServeCheckoutSession({
      planKey,
      accountId: current.account.id,
      accountName: current.account.name,
      stripeCustomerId: current.account.stripe_customer_id,
      ownerEmail: current.user.email,
    });
    if (!url) {
      return NextResponse.json({ error: "invalid plan" }, { status: 400 });
    }
    return NextResponse.json({ url });
  } catch (err) {
    console.error("[stripe/checkout] createSelfServeCheckoutSession failed:", err);
    return NextResponse.json({ error: "checkout failed" }, { status: 500 });
  }
}
