import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createDistributorCheckoutUrl } from "@/lib/whop";

// The Distributor licence checkout. Takes no input: the price tier comes
// from wefunnel_my_offer (the account's server-side referral), never from
// the request, so a buyer cannot ask for the invitation price.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  // A direct buyer from the official website has an auth user but no
  // account yet; the payment needs one to attach to.
  const { data: profile } = await supabase
    .from("users")
    .select("account_id")
    .eq("id", user.id)
    .maybeSingle();

  let accountId = profile?.account_id ?? null;
  if (!accountId) {
    const fullName = (user.user_metadata?.full_name as string | undefined)?.trim() || user.email || "Mi cuenta";
    const { data, error } = await supabase.rpc("wefunnel_ensure_account", { p_display_name: fullName });
    if (error || !data) {
      console.error("[wefunnel] ensure account failed:", error?.message);
      return NextResponse.json({ error: "account unavailable" }, { status: 503 });
    }
    accountId = data;
  }

  const { data: offerRows, error: offerError } = await supabase.rpc("wefunnel_my_offer");
  const offer = offerRows?.[0];
  if (offerError || !offer) {
    console.error("[wefunnel] offer lookup failed:", offerError?.message);
    return NextResponse.json({ error: "checkout unavailable" }, { status: 503 });
  }

  if (offer.is_distributor) {
    return NextResponse.json({ error: "already a distributor" }, { status: 409 });
  }

  const url = await createDistributorCheckoutUrl(accountId, offer.price_tier);
  if (!url) {
    return NextResponse.json({ error: "checkout unavailable" }, { status: 503 });
  }

  return NextResponse.json({ url });
}
