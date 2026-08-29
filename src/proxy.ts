import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

import { updateSession } from "@/lib/supabase/middleware";
import { routing } from "@/i18n/routing";
import { lookupAccountSlugByHostname } from "@/lib/domains/lookup";

const intlMiddleware = createIntlMiddleware(routing);

// The platform's own hosts -- anything else on the incoming Host header is
// a candidate custom domain (see custom_domains / proxy below). Preview
// deployments (*.vercel.app) and localhost are "own" too, so dev/preview
// traffic never gets routed through the custom-domain lookup.
function isOwnHostname(hostname: string): boolean {
  if (hostname === "localhost" || hostname.endsWith(".vercel.app")) return true;
  try {
    const appHostname = process.env.NEXT_PUBLIC_APP_URL
      ? new URL(process.env.NEXT_PUBLIC_APP_URL).hostname
      : null;
    return hostname === appHostname;
  } catch {
    return false;
  }
}

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

function resolveLocaleFromPath(pathname: string): "es" | "en" {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "es";
}

export async function proxy(request: NextRequest) {
  const sessionResponse = await updateSession(request);

  // An auth-gate redirect always wins, regardless of locale.
  if (sessionResponse.headers.get("location")) {
    return sessionResponse;
  }

  // Custom domain (Business/Enterprise, see custom_domains table): a
  // request whose Host header isn't one of our own is a candidate. If it
  // resolves to an active, verified domain, rewrite it internally onto
  // that account's existing /w/[accountSlug]/... pages -- the visitor's
  // URL bar never changes, and everything downstream (registration,
  // waiting room, Live, analytics) is unmodified. Custom domains always
  // serve the default locale (no /en prefix) for now, so this skips the
  // next-intl branch below entirely instead of feeding it a rewritten
  // request it wasn't built to see.
  const hostname = request.headers.get("host")?.split(":")[0] ?? "";
  if (!isOwnHostname(hostname)) {
    const accountSlug = await lookupAccountSlugByHostname(hostname);
    if (accountSlug) {
      const url = request.nextUrl.clone();
      const suffix = url.pathname === "/" ? "" : url.pathname;
      url.pathname = `/w/${accountSlug}${suffix}`;
      const rewriteResponse = NextResponse.rewrite(url);
      for (const cookie of sessionResponse.cookies.getAll()) {
        rewriteResponse.cookies.set(cookie);
      }
      return rewriteResponse;
    }
    // Foreign host with no matching (or not-yet-active) custom domain --
    // fall through to normal handling, which 404s. That's the right
    // outcome for a stray domain pointed here without being configured.
  }

  if (isLocaleRoutedPath(request.nextUrl.pathname)) {
    const intlResponse = intlMiddleware(request);
    // Carry over the refreshed Supabase session cookies from
    // updateSession onto the locale-routing response.
    for (const cookie of sessionResponse.cookies.getAll()) {
      intlResponse.cookies.set(cookie);
    }
    // Keep NEXT_LOCALE in sync with the URL locale so routes outside the
    // [locale] segment (login, signup, dashboard...) inherit whichever
    // language the visitor was just browsing on the marketing site --
    // otherwise clicking "Start" on the English homepage could land on a
    // Spanish-only signup page (see src/i18n/request.ts's cookie fallback,
    // and src/app/dashboard/language-toggle.tsx which writes the same
    // cookie from inside the dashboard).
    intlResponse.cookies.set("NEXT_LOCALE", resolveLocaleFromPath(request.nextUrl.pathname), {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
    return intlResponse;
  }

  return sessionResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
