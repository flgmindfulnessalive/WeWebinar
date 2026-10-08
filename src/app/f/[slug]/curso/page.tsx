import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { wefunnelGiftUrl } from "@/lib/wefunnels/host";

type RouteParams = { slug: string };

// Legacy address of a Distributor's "sala": wefunnels.wewebinars.com/<slug>/curso.
//
// Those links are already circulating (bios, WhatsApp, ads), so the address
// keeps working: it now resolves to the Distributor's gift page, which is
// the single public link that replaced it. Attribution is preserved because
// the gift page carries the Distributor's slug into the signup, where it is
// validated on the server. For anyone who is not an active Distributor the
// address does not exist, exactly as before.
export default async function LegacyCourseRoomPage({ params }: { params: Promise<RouteParams> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: referrerSiteId } = await supabase.rpc("wefunnel_gift_referrer", { p_slug: slug });
  if (!referrerSiteId) notFound();
  redirect(wefunnelGiftUrl(slug));
}
