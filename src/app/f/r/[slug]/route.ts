import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { getSupabaseCookieDomain } from "@/lib/supabase/cookie-domain";
import { normalizeSlug } from "@/lib/wefunnels/slug";
import { wefunnelGiftUrl } from "@/lib/wefunnels/host";
import {
  REFERRAL_COOKIE,
  REFERRAL_WINDOW_DAYS,
  serializeTouch,
} from "@/lib/wefunnels/referral";

// Legacy invitation link: wefunnels.wewebinars.com/r/<slug>.
//
// Links of this shape are already circulating, so the route stays. It now
// sends the visitor to that Distributor's gift page -- the one place a free
// funnel is claimed -- and still records the legacy touch cookie, which
// the old claim path (for people mid-way through it) reads.
//
// A slug that is not an active Distributor's live page (a free account,
// whose gifting ended with the approved model, or a revoked licence) gets
// no cookie and lands on the official website, which offers no free claim.
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

  if (!referrerSiteId) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const response = NextResponse.redirect(wefunnelGiftUrl(slug));
  response.cookies.set(REFERRAL_COOKIE, serializeTouch(slug), {
    path: "/",
    maxAge: REFERRAL_WINDOW_DAYS * 24 * 60 * 60,
    sameSite: "lax",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    domain: getSupabaseCookieDomain(),
  });
  return response;
}
