import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseCookieDomain } from "@/lib/supabase/cookie-domain";
import { normalizeSlug } from "@/lib/wefunnels/slug";
import {
  REFERRAL_COOKIE,
  REFERRAL_WINDOW_DAYS,
  serializeTouch,
} from "@/lib/wefunnels/referral";
import { courseRoomUrl } from "@/lib/wefunnels/course-room";

// The door into the shared course room, from a distributor's invite page.
//
// It does what /r/<slug> does -- stamp the referral on the parent domain,
// so the touch is still there when the claim happens on the main host --
// and then sends the visitor to the one course webinar. The destination is
// computed here from WEFUNNELS_COURSE_WEBINAR_ID, never taken from the
// request, which is why this is a separate route instead of teaching
// /r/<slug> a `next` parameter: that parameter would be an open redirect
// pointed at whatever an attacker put in a link, and sanitizeRedirectPath
// only clears same-origin paths, which the room is not -- it lives on the
// app host, not the WeFunnels one.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug: raw } = await params;
  const slug = normalizeSlug(raw);

  // Same anonymous read the invite page does: RLS returns the row only
  // while the page is published and unsuspended, so a suspended page
  // cannot keep handing out referral credit.
  const supabase = await createClient();
  const { data: site } = slug
    ? await supabase
        .from("wefunnel_sites")
        .select("id, account_id")
        .eq("slug", slug)
        .maybeSingle()
    : { data: null };

  // The entitlement, with the service role: wefunnel_distributors is
  // readable only by its own account, and a visitor is nobody here.
  const distributor = site
    ? (
        await createAdminClient()
          .from("wefunnel_distributors")
          .select("account_id")
          .eq("account_id", site.account_id)
          .maybeSingle()
      ).data
    : null;

  const roomUrl = distributor ? await courseRoomUrl() : null;

  // No entitlement, no page, or no course recorded yet: back to the invite
  // page, which already says what is going on. Never a dead end.
  const destination = roomUrl ?? new URL(`/${raw}/curso`, request.url).toString();
  const response = NextResponse.redirect(destination);

  if (slug && distributor) {
    response.cookies.set(REFERRAL_COOKIE, serializeTouch(slug), {
      path: "/",
      maxAge: REFERRAL_WINDOW_DAYS * 24 * 60 * 60,
      sameSite: "lax",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      domain: getSupabaseCookieDomain(),
    });
  }

  return response;
}
