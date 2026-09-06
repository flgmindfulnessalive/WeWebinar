import { NextResponse } from "next/server";

import { getCurrentAccount } from "@/lib/data/account";
import { cancelSelfServeMembership } from "@/lib/whop";

// Replaces the old /api/lemonsqueezy/portal redirect -- Whop has no
// hosted "manage subscription" page, so cancellation happens directly
// through the API instead of a portal link. Access continues until the
// end of the current billing period (see cancelSelfServeMembership).
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

  const canceled = await cancelSelfServeMembership(current.account.billing_subscription_id);
  if (!canceled) {
    return NextResponse.json({ error: "cancel failed" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
