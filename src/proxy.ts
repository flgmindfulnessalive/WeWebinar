import { type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

import { updateSession } from "@/lib/supabase/middleware";
import { routing } from "@/i18n/routing";

const intlMiddleware = createIntlMiddleware(routing);

// The marketing site and public webinar pages (/w/...) live under the
// [locale] URL segment. Everything else -- dashboard, admin, auth --
// stays outside it and is untouched by locale routing.
function isLocaleRoutedPath(pathname: string): boolean {
  return (
    pathname === "/" ||
    pathname === "/en" ||
    pathname.startsWith("/pricing") ||
    pathname.startsWith("/en/pricing") ||
    pathname.startsWith("/w/") ||
    pathname.startsWith("/en/w/")
  );
}

export async function proxy(request: NextRequest) {
  const sessionResponse = await updateSession(request);

  // An auth-gate redirect always wins, regardless of locale.
  if (sessionResponse.headers.get("location")) {
    return sessionResponse;
  }

  if (isLocaleRoutedPath(request.nextUrl.pathname)) {
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
