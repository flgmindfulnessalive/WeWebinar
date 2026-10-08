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

// Anything that is not a published page -- the panel, the report form, the
// rules -- lives on the main host, because the subdomain rewrites every
// path onto /f and those routes simply do not resolve there. They have to
// be absolute links out of this host, never next/link navigations.
export function wefunnelAppUrl(path: string): string {
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? "https://www.wewebinars.com";
  return `${origin.replace(/\/$/, "")}${path}`;
}
