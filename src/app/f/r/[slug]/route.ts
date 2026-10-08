import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseCookieDomain } from "@/lib/supabase/cookie-domain";
import { normalizeSlug } from "@/lib/wefunnels/slug";
import {
  REFERRAL_COOKIE,
  REFERRAL_WINDOW_DAYS,
  serializeTouch,
} from "@/lib/wefunnels/referral";

// Where a shared referral link points. It records the touch and sends the
// visitor on to the gift page, so the link stays a plain link and the whole
// mechanism is one redirect the person never sees.
//
// To /<slug>/regalo and no longer to the host root: the root is now the
// official web, which sells the licence at $199 and hands out nothing. A
// visitor who followed somebody's gift link and landed on a sales page
// would have been shown the opposite of what they were promised.
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

  // An unreadable slug has no gift page to send anyone to, so it falls back
  // to the official web rather than to a 404.
  const response = NextResponse.redirect(
    new URL(slug ? `/${slug}/regalo` : "/", request.url)
  );

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
