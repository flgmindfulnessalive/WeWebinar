// WeFunnels is served from its own subdomain of the main app host --
// wefunnels.wewebinars.com by default -- and every personal page lives
// directly under it: wefunnels.wewebinars.com/<slug>.
//
// A subdomain rather than a separate domain was a deliberate trade (no
// second registration to buy), and it is why the content rules and the
// suspension switch matter more here than they would elsewhere: WhatsApp
// and Meta tend to act on the registrable domain, so a page published here
// shares its reputation with the paying product.
//
// Overridable through the environment so preview deployments and local dev
// can point it somewhere reachable without touching code.
export const WEFUNNELS_HOST =
  process.env.NEXT_PUBLIC_WEFUNNELS_HOST ?? "wefunnels.wewebinars.com";

// Internal URL namespace the subdomain rewrites onto. Short on purpose:
// it never appears in a visitor's address bar, but it does appear in every
// file path under src/app.
export const WEFUNNELS_PATH_PREFIX = "/f";

export function isWeFunnelsHostname(hostname: string): boolean {
  return hostname === WEFUNNELS_HOST;
}

export function wefunnelSiteUrl(slug: string): string {
  return `https://${WEFUNNELS_HOST}/${slug}`;
}

// WeFunnels' own origin. Used for the handful of links that have to leave
// the app host and come back here -- the canonical redirect for an old
// /panel bookmark, and the "volver" of anything hosted on the main app.
//
// http for a local host so a developer who points the subdomain at
// localhost still gets a usable link; everything else is https.
export function wefunnelOrigin(): string {
  const scheme = WEFUNNELS_HOST.startsWith("localhost") ? "http" : "https";
  return `${scheme}://${WEFUNNELS_HOST}`;
}

export function wefunnelUrl(path: string): string {
  return `${wefunnelOrigin()}${path}`;
}

// The paths that belong to WeFunnels but are not somebody's published page:
// the panel, the access screens, the legal pages. They live under /f like
// everything else here, and the proxy rewrites them onto it from any host,
// so a preview deployment and local dev work without a second hostname.
//
// Every one of them is also in wefunnel_reserved_slugs, which is what stops
// a person claiming the name that would shadow the route.
export const WEFUNNELS_APP_PATHS = [
  "/panel",
  "/entrar",
  "/recuperar",
  "/nueva-clave",
  "/confirmar",
  "/registro",
  "/comprar",
  "/reportar",
  "/reglas",
  "/legal",
] as const;

export function isWeFunnelsAppPath(pathname: string): boolean {
  return WEFUNNELS_APP_PATHS.some(
    (base) => pathname === base || pathname.startsWith(`${base}/`)
  );
}

// What still lives on the main app host, and has to: /auth/confirm, because
// that address is registered in Supabase's redirect allowlist, and the
// course room, because the video is hosted in WeWebinars and that is where
// the room resolves. Absolute links out of this host, never next/link
// navigations.
export function wefunnelAppUrl(path: string): string {
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.wewebinars.com";
  return `${origin.replace(/\/$/, "")}${path}`;
}
