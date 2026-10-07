import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseCookieDomain } from "@/lib/supabase/cookie-domain";
import { normalizeSlug } from "@/lib/wefunnels/slug";
import {
  REFERRAL_COOKIE,
  REFERRAL_WINDOW_DAYS,
  serializeTouch,
} from "@/lib/wefunnels/referral";

// Where every badge points. It records the touch and sends the visitor on to
// the offer, so the link in the page footer stays a plain link and the whole
// mechanism is one redirect the person never sees.
//
// The cookie is scoped to the parent domain, the same way the Supabase
// session cookie already is: the badge sits on wefunnels.wewebinars.com but
// the claim happens on the main host, and a host-scoped cookie would simply
// not be there when it mattered. That helper returns undefined outside
// production, where both hosts are the same origin anyway and a mismatched
// Domain makes browsers drop the cookie outright.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug: raw } = await params;
  const slug = normalizeSlug(raw);

  const response = NextResponse.redirect(new URL("/", request.url));

  if (slug) {
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
