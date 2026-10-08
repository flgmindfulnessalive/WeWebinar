import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  WEFUNNELS_PATH_PREFIX,
  isWeFunnelsHostname,
  wefunnelAppUrl,
} from "@/lib/wefunnels/host";

// Where "Quiero ser Distribuidor" goes. A route rather than a link on the
// landing because the right destination depends on something a statically
// rendered page cannot know: whether the person already has an account.
//
// Both answers used to be wrong. The button pointed at the WeWebinars
// signup, which is another brand, asks a buyer about webinar plans, and
// drops the ?next it was given -- so nobody ever arrived at the licence
// they clicked to buy. Pointing it straight at /panel/distribuidor only
// moves the problem: that page sends a signed-out visitor to the WeWebinars
// login, which is the same jump one step later.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Signed in: the panel is the only place the price can be decided, since
  // it is read from the account's own referral rows and never from the web.
  // Absolute, because the panel lives on the app host and this request
  // arrived at wefunnels.wewebinars.com.
  if (user) redirect(wefunnelAppUrl("/panel/distribuidor"));

  // Signed out: the WeFunnels signup, in buying mode -- same host, same
  // brand, and the confirmation email lands on the licence instead of on
  // the free page.
  //
  // The prefix depends on the host, not on the path: the subdomain rewrites
  // /comprar onto /f/comprar, so this handler sees the same pathname either
  // way and only the Host header tells the two apart. On the subdomain the
  // address stays clean; on the app host, where /f is reachable directly,
  // the link still resolves instead of 404ing.
  const host = (await headers()).get("host")?.split(":")[0] ?? "";
  const prefix = isWeFunnelsHostname(host) ? "" : WEFUNNELS_PATH_PREFIX;

  redirect(`${prefix}/registro?compra=1`);
}
