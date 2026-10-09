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

// WeFunnels has its own door. Every /panel screen already redirects on its
// own -- the layout and all nine pages -- but the gate belongs here too: a
// page-level check runs after a render has started, and the one place that
// can answer "who is this" before anything is built is the proxy.
//
// Two separate lists rather than one with a flag, because the answer to
// "where do I send somebody who is not signed in" is the whole point: a
// WeFunnels user sent to /login would land on a WeWebinars screen, which is
// exactly the confusion this is fixing.
const WEFUNNELS_PROTECTED_PREFIXES = ["/panel"];
const WEFUNNELS_AUTH_PAGES = ["/entrar", "/recuperar"];

// Where "already signed in, asking for the login" goes, per door. WeFunnels
// has no onboarding and no dashboard: its signed-in home is the panel.
const WEFUNNELS_HOME = "/panel";

// Por segmentos, no por prefijo de texto. startsWith("/panel") también
// acierta con "/paneles", y en WeFunnels eso no es un detalle: el espacio
// de nombres del subdominio es plano, así que /paneles es la página de una
// persona que se llama así -- y la mandaba a la pantalla de entrar en vez
// de resolver su página.
function matchesSegment(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { pathname } = request.nextUrl;
  const isWeFunnelsProtected = matchesSegment(pathname, WEFUNNELS_PROTECTED_PREFIXES);
  const isWeFunnelsAuthPage = matchesSegment(pathname, WEFUNNELS_AUTH_PAGES);
  const isProtected =
    isWeFunnelsProtected || matchesSegment(pathname, PROTECTED_PREFIXES);
  const isAuthPage = isWeFunnelsAuthPage || matchesSegment(pathname, AUTH_PAGES);

  let user = null;
  // getUser() is the only thing `user` is used for below (deciding the two
  // redirects), and it makes a real network round-trip to Supabase's Auth
  // server to re-validate the JWT on every single call -- so only pay that
  // cost on the routes that can actually redirect based on it. Every public
  // page (marketing, blog, /demo, the webinar registration page...) used to
  // eat this latency unconditionally, most visibly on /demo: it redirects
  // to another page that repeated the exact same round-trip, so a visitor
  // paid for it twice before anything could paint.
  if (isProtected || isAuthPage) {
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
      // Don't let a Supabase outage/misconfiguration 500 every protected
      // page on the site — degrade to unauthenticated instead, and log the
      // real cause for diagnosis.
      console.error("[middleware] Supabase session check failed:", error);
    }
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

  if (!user && isProtected) {
    const url = request.nextUrl.clone();
    url.pathname = isWeFunnelsProtected ? "/entrar" : "/login";
    url.search = "";
    // Where they were going, carried across the login. Only ever a path on
    // this host: a value read back off the query string is a redirect
    // somebody else can write, and this one is written into a Location
    // header after a successful sign-in.
    url.searchParams.set("next", pathname + (request.nextUrl.search || ""));
    return withAnonymousId(NextResponse.redirect(url));
  }

  if (user && isAuthPage) {
    const url = request.nextUrl.clone();
    // Honour where they were headed. Dropping it was how somebody who was
    // already signed in and clicked "Iniciar sesión" on a WeFunnels page
    // ended up in the WeWebinars dashboard -- and from there, with no plan,
    // in its onboarding.
    const requested = request.nextUrl.searchParams.get("next");
    const fallback = isWeFunnelsAuthPage ? WEFUNNELS_HOME : "/dashboard";
    // A path on this host and nothing else. "//evil.example" is a protocol-
    // relative URL, so the second slash has to be refused as well as the
    // missing first one. The query comes along separately: assigning it to
    // pathname would escape the "?" and make it part of the path.
    const safe =
      requested && requested.startsWith("/") && !requested.startsWith("//")
        ? requested
        : fallback;
    const [safePath, safeQuery] = safe.split("?");
    url.pathname = safePath;
    url.search = safeQuery ? `?${safeQuery}` : "";
    return withAnonymousId(NextResponse.redirect(url));
  }

  return withAnonymousId(response);
}
