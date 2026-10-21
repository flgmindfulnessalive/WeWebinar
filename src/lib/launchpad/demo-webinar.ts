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

// El prefijo de idioma de una URL de la app es cosa de next-intl
// (localePrefix "as-needed": /w/... en español, /en/w/... en inglés), y
// quien copia la URL de la demo desde la barra del navegador mientras
// navega en español se lleva la versión sin prefijo. Pegada tal cual en la
// variable de inglés, el resultado es un webinar en inglés con el
// formulario de registro en español.
//
// Así que el prefijo lo pone el código, no la configuración: la variable
// solo tiene que decir CUÁL es la demo, y de qué idioma es ya lo sabe
// quien la pide. Se normaliza únicamente en el host de la app, que es el
// único sitio donde ese prefijo existe -- un dominio propio de un cliente
// sirve sus páginas sin ningún /en, y meterle uno sería romperlo.
function withLocalePrefix(raw: string | undefined, locale: string): string | undefined {
  if (!raw) return undefined;

  let url: URL;
  let appHost: string;
  try {
    url = new URL(raw);
    appHost = new URL(process.env.NEXT_PUBLIC_APP_URL ?? "https://www.wewebinars.com").hostname;
  } catch {
    // Una variable mal escrita se devuelve tal cual: que falle visiblemente
    // donde se usa es mejor que tragársela acá y servir undefined, que el
    // Launchpad lee como "la demo todavía no existe".
    return raw;
  }
  if (url.hostname !== appHost) return raw;

  const segments = url.pathname.split("/").filter(Boolean);
  if (segments[0] === "es" || segments[0] === "en") segments.shift();
  if (locale === "en") segments.unshift("en");
  url.pathname = `/${segments.join("/")}`;
  return url.toString();
}

export function demoWebinarUrl(locale: string): string | undefined {
  const preferred = locale === "en" ? EN_URL : ES_URL;
  return withLocalePrefix(preferred || BASE_URL || undefined, locale);
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
