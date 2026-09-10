import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "./database.types";
import { getSupabaseCookieDomain } from "./cookie-domain";
import {
  GROWTH_ANONYMOUS_ID_COOKIE,
  GROWTH_ANONYMOUS_ID_MAX_AGE_SECONDS,
} from "@/lib/growth/anonymous-id";

const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/admin", "/growth"];
const AUTH_PAGES = ["/login", "/signup"];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  let user = null;
  try {
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            for (const { name, value } of cookiesToSet) {
              request.cookies.set(name, value);
            }
            response = NextResponse.next({ request });
            for (const { name, value, options } of cookiesToSet) {
              response.cookies.set(name, value, options);
            }
          },
        },
        cookieOptions: { domain: getSupabaseCookieDomain() },
      }
    );

    // IMPORTANT: avoid writing logic between createServerClient and
    // getUser(). A stray early return can drop the session refresh.
    const result = await supabase.auth.getUser();
    user = result.data.user;
  } catch (error) {
    // Don't let a Supabase outage/misconfiguration 500 every page on the
    // site (including the public marketing pages) — degrade to
    // unauthenticated instead, and log the real cause for diagnosis.
    console.error("[middleware] Supabase session check failed:", error);
  }

  // Growth OS identity resolution: every visitor gets one durable,
  // first-party anonymous id the first time they hit the site -- applied to
  // whichever response actually goes out below (including the redirects:
  // someone hitting a protected page anonymously and getting bounced to
  // /login is exactly the kind of first touch this needs to capture, not
  // skip). Never rotated once set: a fresh cookie on every visit would
  // defeat the whole point of identity resolution (see growth_identities).
  const existingAnonymousId = request.cookies.get(GROWTH_ANONYMOUS_ID_COOKIE)?.value;
  const anonymousId = existingAnonymousId ?? crypto.randomUUID();
  function withAnonymousId(res: NextResponse): NextResponse {
    if (!existingAnonymousId) {
      res.cookies.set(GROWTH_ANONYMOUS_ID_COOKIE, anonymousId, {
        path: "/",
        maxAge: GROWTH_ANONYMOUS_ID_MAX_AGE_SECONDS,
        sameSite: "lax",
        domain: getSupabaseCookieDomain(),
      });
    }
    return res;
  }

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  const isAuthPage = AUTH_PAGES.some((prefix) => pathname.startsWith(prefix));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return withAnonymousId(NextResponse.redirect(url));
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return withAnonymousId(NextResponse.redirect(url));
  }

  return withAnonymousId(response);
}
