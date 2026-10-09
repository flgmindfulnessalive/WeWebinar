import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";

import { updateSession } from "@/lib/supabase/middleware";
import { routing } from "@/i18n/routing";
import { lookupAccountSlugByHostname, lookupPendingDomainStatus } from "@/lib/domains/lookup";
import {
  WEFUNNELS_PATH_PREFIX,
  isWeFunnelsAppPath,
  isWeFunnelsHostname,
  wefunnelUrl,
} from "@/lib/wefunnels/host";

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
    if (!appHostname) return false;
    // Con y sin www. Los dos sirven la aplicación -- wewebinars.com redirige
    // a www en el borde -- y comparar la cadena exacta contra
    // NEXT_PUBLIC_APP_URL hacía que uno de los dos no se reconociera como
    // nuestro, según cuál de las dos formas estuviera configurada. El
    // síntoma era un 404 en www.wewebinars.com/entrar: el host no se
    // reconocía, así que la rama de WeFunnels no llegaba a correr.
    const bare = (value: string) => value.replace(/^www\./, "");
    return bare(hostname) === bare(appHostname);
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
    pathname.startsWith("/blog") ||
    pathname.startsWith("/en/blog") ||
    pathname.startsWith("/readiness") ||
    pathname.startsWith("/en/readiness") ||
    pathname.startsWith("/script-builder") ||
    pathname.startsWith("/en/script-builder") ||
    pathname.startsWith("/starter-kit") ||
    pathname.startsWith("/en/starter-kit") ||
    pathname.startsWith("/whop/the-execution-mindset-libro") ||
    pathname.startsWith("/en/whop/the-execution-mindset-libro") ||
    pathname.startsWith("/whop/evergreen-starter-kit") ||
    pathname.startsWith("/en/whop/evergreen-starter-kit") ||
    pathname.startsWith("/demo") ||
    pathname.startsWith("/en/demo") ||
    pathname.startsWith("/w/") ||
    pathname.startsWith("/en/w/")
  );
}

function resolveLocaleFromPath(pathname: string): "es" | "en" {
  return pathname === "/en" || pathname.startsWith("/en/") ? "en" : "es";
}

export async function proxy(request: NextRequest) {
  const hostname = request.headers.get("host")?.split(":")[0] ?? "";

  // La vuelta al host de WeFunnels se decide antes que nada.
  //
  // Antes iba después de la puerta de sesión, y eso rompía justo el caso
  // que existe para resolver: quien abría una marca de libro de
  // www.wewebinars.com/panel sin sesión era mandado por la puerta a
  // /entrar EN EL HOST DE LA APP, donde esa pantalla no existe. El 308
  // hacia WeFunnels ya no llegaba a correr nunca.
  //
  // Ponerlo aquí también le ahorra a Supabase una llamada por cada
  // petición que de todos modos se va a ir a otro host.
  if (
    isOwnHostname(hostname) &&
    hostname !== "localhost" &&
    !hostname.endsWith(".vercel.app") &&
    isWeFunnelsAppPath(request.nextUrl.pathname)
  ) {
    return NextResponse.redirect(
      wefunnelUrl(`${request.nextUrl.pathname}${request.nextUrl.search}`),
      308
    );
  }

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

  // WeFunnels (wefunnels.wewebinars.com): every path on this host is a
  // personal funnel page, so the whole subdomain rewrites onto the /f
  // namespace and nothing else on it resolves. That is deliberate twice
  // over -- it keeps the slug namespace flat (one segment, one name), and
  // it means the dashboard, admin and auth routes simply do not exist on
  // the host that strangers' pages are published under.
  //
  // Checked before the custom-domain branch below so this never costs a
  // database lookup, and left out of the next-intl branch entirely:
  // WeFunnels launches in Spanish only, with no /en prefix.
  if (isWeFunnelsHostname(hostname)) {
    const url = request.nextUrl.clone();
    const suffix = url.pathname === "/" ? "" : url.pathname;
    url.pathname = `${WEFUNNELS_PATH_PREFIX}${suffix}`;
    const rewriteResponse = NextResponse.rewrite(url);
    for (const cookie of sessionResponse.cookies.getAll()) {
      rewriteResponse.cookies.set(cookie);
    }
    return rewriteResponse;
  }

  // Las rutas propias de WeFunnels -- el panel, las pantallas de acceso, las
  // legales -- pedidas en un host que no es el de WeFunnels. En producción
  // eso es una marca de libro antigua (el panel vivía en el host de la app)
  // o un enlace de un correo ya enviado.
  //
  // Solo en nuestros propios hosts. Un dominio personalizado de un cliente
  // (custom_domains, la rama de abajo) sirve SUS páginas de webinar, y
  // cualquier ruta en él tiene que seguir yendo a /w/<cuenta>/...: servir el
  // panel de WeFunnels desde el dominio de otra empresa sería peor que el
  // 404 que daba antes.
  // Lo que queda aquí es local y preview: no hay segundo host al que mandar
  // a nadie (el 308 de arriba ya los excluyó), así que la misma ruta se
  // reescribe en sitio. Es lo que mantiene el panel entero alcanzable en
  // desarrollo sin apuntar un subdominio a un portátil.
  if (isOwnHostname(hostname) && isWeFunnelsAppPath(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = `${WEFUNNELS_PATH_PREFIX}${url.pathname}`;
    const rewriteResponse = NextResponse.rewrite(url);
    for (const cookie of sessionResponse.cookies.getAll()) {
      rewriteResponse.cookies.set(cookie);
    }
    return rewriteResponse;
  }

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
    // Not active yet -- but is it a domain someone actually added (still
    // verifying DNS, or verification failed)? From the visitor's side that
    // could well be a link already shared before DNS finished propagating,
    // so show a "still configuring" page instead of a bare 404.
    const pendingStatus = await lookupPendingDomainStatus(hostname);
    if (pendingStatus) {
      const url = request.nextUrl.clone();
      url.pathname = "/domain-pending";
      url.search = "";
      const rewriteResponse = NextResponse.rewrite(url);
      for (const cookie of sessionResponse.cookies.getAll()) {
        rewriteResponse.cookies.set(cookie);
      }
      return rewriteResponse;
    }
    // Foreign host with no matching custom domain at all -- fall through
    // to normal handling, which 404s. That's the right outcome for a
    // stray domain pointed here without being configured.
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
