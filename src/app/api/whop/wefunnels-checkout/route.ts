import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createDistributorCheckoutUrl } from "@/lib/whop";

// The lifetime distributor licence. Separate from /api/whop/checkout
// because that route speaks in plan keys and billing periods, and requires
// getCurrentAccount() -- which returns null for a free WeFunnels account on
// purpose, since it has no plan. This is exactly the person buying.
//
// The price is decided here, from wefunnel_license_price(), which reads the
// account's own referral rows. The body of this request is not consulted
// for it and does not need to be: $100 is a fact about who invited you, and
// the browser is not a witness to that.
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

  // Somebody buying from the public web has no account yet: the account
  // used to be created by the claim, and the claim needs an invitation they
  // have not got (20261007000014). So the checkout creates it. An account
  // on its own grants nothing -- no page, no licence, no plan -- and the
  // function is idempotent, so a reload of this route cannot make a second.
  let accountId = profile?.account_id ?? null;

  if (!accountId) {
    const name =
      (user.user_metadata?.full_name as string | undefined)?.trim() ||
      user.email?.split("@")[0] ||
      "Mi cuenta";

    const { data: started, error: startError } = await supabase.rpc(
      "wefunnel_start_account",
      { p_name: name }
    );

    if (startError || !started) {
      console.error("[wefunnel] start account failed:", startError?.message);
      return NextResponse.json({ error: "checkout unavailable" }, { status: 503 });
    }
    accountId = started;
  }

  const { data: existing } = await supabase
    .from("wefunnel_distributors")
    .select("account_id")
    .eq("account_id", accountId)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: "already a distributor" }, { status: 409 });
  }

  // Server-side, and checked a second time inside
  // wefunnel_activate_distributor before any licence is granted. Two gates
  // because a checkout url, once created, is a link anybody can open.
  const { data: pricing } = await supabase.rpc("wefunnel_license_price");
  const source = pricing?.[0]?.source === "invited" ? "invited" : "public";

  const url = await createDistributorCheckoutUrl(accountId, source);
  if (!url) {
    // Unset plan id or a Whop outage. Either way it is ours, not theirs.
    return NextResponse.json({ error: "checkout unavailable" }, { status: 503 });
  }

  return NextResponse.json({ url });
}
