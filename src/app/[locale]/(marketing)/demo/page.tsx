import { redirect } from "next/navigation";

import { redirect as localeRedirect } from "@/i18n/navigation";
import { demoWebinarUrl } from "@/lib/launchpad/demo-webinar";

// Entrada pública desde el nav de marketing -- redirige a la demo oficial
// de WeWebinars, la misma que usa el Launchpad. Hay una demo por idioma,
// así que el locale de quien llega decide a cuál va (ver
// @/lib/launchpad/demo-webinar). Sin URL configurada, cae a /pricing en el
// locale actual (no al español por defecto) -- next/navigation's
// redirect() para la URL externa de la demo (absoluta, fuera del espacio
// de rutas de next-intl) y @/i18n/navigation's redirect() para el
// fallback interno.
export default async function DemoRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const url = demoWebinarUrl(locale);
  if (url) redirect(url);
  localeRedirect({ href: "/pricing", locale: locale === "en" ? "en" : "es" });
}
