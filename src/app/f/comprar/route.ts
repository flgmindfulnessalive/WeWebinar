import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

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
  // A plain path now -- the panel lives on this host.
  if (user) redirect("/panel/distribuidor");

  // Signed out: the WeFunnels signup, in buying mode -- same host, same
  // brand, and the confirmation email lands on the licence instead of on
  // the free page.
  //
  // Sin prefijo y sin mirar el Host: el proxy reescribe las rutas de
  // WeFunnels sobre /f desde cualquier host (ver WEFUNNELS_APP_PATHS), así
  // que esta dirección resuelve igual en el subdominio, en una preview y en
  // local.
  redirect("/registro?compra=1");
}
