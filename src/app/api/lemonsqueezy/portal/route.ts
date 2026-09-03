import { NextResponse } from "next/server";

import { getCurrentAccount } from "@/lib/data/account";
import { getBillingPortalUrl } from "@/lib/billing";

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
  if (!current.account.billing_subscription_id) {
    return NextResponse.json({ error: "no billing account yet" }, { status: 400 });
  }

  const url = await getBillingPortalUrl(current.account.billing_subscription_id);
  if (!url) {
    return NextResponse.json({ error: "portal failed" }, { status: 500 });
  }
  return NextResponse.json({ url });
}
