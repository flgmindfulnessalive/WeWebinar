import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createDistributorCheckoutUrl } from "@/lib/whop";

// The $100 lifetime distributor tier. Separate from /api/whop/checkout
// because that route speaks in plan keys and billing periods, and requires
// getCurrentAccount() -- which returns null for a free WeFunnels account on
// purpose, since it has no plan. This is exactly the person buying.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("users")
    .select("account_id")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.account_id) {
    return NextResponse.json({ error: "claim a page first" }, { status: 409 });
  }

  const { data: existing } = await supabase
    .from("wefunnel_distributors")
    .select("account_id")
    .eq("account_id", profile.account_id)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "already a distributor" }, { status: 409 });
  }

  const url = await createDistributorCheckoutUrl(profile.account_id);
  if (!url) {
    // Unset plan id or a Whop outage. Either way it is ours, not theirs.
    return NextResponse.json({ error: "checkout unavailable" }, { status: 503 });
  }

  return NextResponse.json({ url });
}
