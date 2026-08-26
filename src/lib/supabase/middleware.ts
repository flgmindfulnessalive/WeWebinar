import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "./database.types";
import { getSupabaseCookieDomain } from "./cookie-domain";

const PROTECTED_PREFIXES = ["/dashboard", "/onboarding", "/admin"];
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

  const { pathname } = request.nextUrl;
  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  const isAuthPage = AUTH_PAGES.some((prefix) => pathname.startsWith(prefix));

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
