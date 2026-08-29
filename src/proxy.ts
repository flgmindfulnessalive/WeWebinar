import { type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

import { updateSession } from "@/lib/supabase/middleware";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

// Only the marketing site currently lives under the [locale] URL segment
// (home + pricing). Everything else -- dashboard, admin, auth, public
// webinar pages -- stays outside it and is untouched by locale routing.
function isMarketingPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/en" ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/en/pricing")
  );
}

export async function proxy(request: NextRequest) {
  const sessionResponse = await updateSession(request);

  // An auth-gate redirect always wins, regardless of locale.
  if (sessionResponse.headers.get("location")) {
    return sessionResponse;
  }

  if (isMarketingPath(request.nextUrl.pathname)) {
    const intlResponse = intlMiddleware(request);
    // Carry over the refreshed Supabase session cookies from
    // updateSession onto the locale-routing response.
    for (const cookie of sessionResponse.cookies.getAll()) {
      intlResponse.cookies.set(cookie);
    }
    return intlResponse;
  }

  return sessionResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
