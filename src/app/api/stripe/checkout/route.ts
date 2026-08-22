import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentAccount } from "@/lib/data/account";
import { stripe, STRIPE_PRICE_BY_PLAN_KEY, type SelfServePlanKey } from "@/lib/stripe";

function isSelfServePlanKey(value: string): value is SelfServePlanKey {
  return value in STRIPE_PRICE_BY_PLAN_KEY;
}

export async function POST(request: Request) {
  const { plan_key: rawPlanKey } = (await request.json()) as { plan_key?: string };

  if (!rawPlanKey || !isSelfServePlanKey(rawPlanKey)) {
    return NextResponse.json({ error: "invalid plan" }, { status: 400 });
  }
  const planKey = rawPlanKey;
  const priceId = STRIPE_PRICE_BY_PLAN_KEY[planKey];

  if (!priceId) {
    return NextResponse.json({ error: "invalid plan" }, { status: 400 });
  }

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

  const supabase = await createClient();
  let customerId = current.account.stripe_customer_id;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: current.user.email,
      name: current.account.name,
      metadata: { account_id: current.account.id },
    });
    customerId = customer.id;

    const { error } = await supabase
      .from("accounts")
      .update({ stripe_customer_id: customerId })
      .eq("id", current.account.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?checkout=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing?checkout=canceled`,
    metadata: { account_id: current.account.id, plan_key: planKey },
    subscription_data: {
      metadata: { account_id: current.account.id, plan_key: planKey },
    },
  });

  return NextResponse.json({ url: session.url });
}
