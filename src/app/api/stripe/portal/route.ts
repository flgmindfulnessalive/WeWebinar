import { NextResponse } from "next/server";

import { getCurrentAccount } from "@/lib/data/account";
import { stripe } from "@/lib/stripe";

export async function POST() {
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
  if (!current.account.stripe_customer_id) {
    return NextResponse.json({ error: "no billing account yet" }, { status: 400 });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: current.account.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/settings/billing`,
  });

  return NextResponse.json({ url: session.url });
}
