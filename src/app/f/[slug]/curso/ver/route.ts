import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { normalizeSlug } from "@/lib/wefunnels/slug";
import { wefunnelGiftUrl } from "@/lib/wefunnels/host";

// Legacy door from a Distributor's old "sala" into the shared course.
//
// The course is now something a person receives with their free account
// (it lives in their panel, without a second registration), and the
// Distributor's public link is the gift page. So an old /<slug>/curso/ver
// link lands on that gift page; anything that does not resolve goes to the
// official site. The destination is computed here, never taken from the
// request, so this cannot be used as an open redirect.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug: raw } = await params;
  const slug = normalizeSlug(raw);

  const supabase = await createClient();
  const { data: referrerSiteId } = slug
    ? await supabase.rpc("wefunnel_gift_referrer", { p_slug: slug })
    : { data: null };

  return NextResponse.redirect(
    referrerSiteId ? wefunnelGiftUrl(slug) : new URL("/", request.url).toString()
  );
}
