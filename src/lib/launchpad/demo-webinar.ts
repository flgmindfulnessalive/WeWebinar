// La demo oficial de WeWebinars no es una maqueta: es un webinar evergreen
// real corriendo con el mismo stack público que usa cualquier cuenta. Hay
// una por idioma, así que "cuál es la demo" depende del locale -- estas
// variables de entorno siguen siendo la única fuente de verdad (renombrar
// la cuenta o la presentación solo obliga a actualizarlas acá).
//
// NEXT_PUBLIC_LAUNCHPAD_DEMO_WEBINAR_URL es la base histórica y se queda
// como respaldo de ambos idiomas: si solo está configurada esa, todo sigue
// funcionando igual que antes de este archivo.
//
// Los tres `process.env.NEXT_PUBLIC_*` se escriben literales a propósito:
// el bundler los reemplaza por texto al compilar, y eso es lo que permite
// usar este helper también desde componentes de cliente.
const BASE_URL = process.env.NEXT_PUBLIC_LAUNCHPAD_DEMO_WEBINAR_URL;
const ES_URL = process.env.NEXT_PUBLIC_LAUNCHPAD_DEMO_WEBINAR_URL_ES;
const EN_URL = process.env.NEXT_PUBLIC_LAUNCHPAD_DEMO_WEBINAR_URL_EN;

export function demoWebinarUrl(locale: string): string | undefined {
  const preferred = locale === "en" ? EN_URL : ES_URL;
  return preferred || BASE_URL || undefined;
}

export type DemoSlugs = { accountSlug: string; webinarSlug: string };

function parseSlugs(raw: string | undefined): DemoSlugs | null {
  if (!raw) return null;
  try {
    const segments = new URL(raw).pathname.split("/").filter(Boolean);
    const wIndex = segments.indexOf("w");
    if (wIndex === -1 || !segments[wIndex + 1] || !segments[wIndex + 2]) return null;
    return { accountSlug: segments[wIndex + 1], webinarSlug: segments[wIndex + 2] };
  } catch {
    return null;
  }
}

// Todas las demos oficiales, no solo la del idioma actual: quien se
// registró en la demo en español puede llegar a /demo/oferta con el locale
// en inglés (o al revés), y su token sigue siendo válido.
export function officialDemoSlugs(): DemoSlugs[] {
  const seen = new Set<string>();
  const slugs: DemoSlugs[] = [];
  for (const raw of [ES_URL, EN_URL, BASE_URL]) {
    const parsed = parseSlugs(raw);
    if (!parsed) continue;
    const key = `${parsed.accountSlug}/${parsed.webinarSlug}`;
    if (seen.has(key)) continue;
    seen.add(key);
    slugs.push(parsed);
  }
  return slugs;
}

export function isOfficialDemo(accountSlug: string, webinarSlug: string): boolean {
  return officialDemoSlugs().some(
    (slugs) => slugs.accountSlug === accountSlug && slugs.webinarSlug === webinarSlug
  );
}
