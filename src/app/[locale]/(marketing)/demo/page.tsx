import { redirect } from "next/navigation";

import { redirect as localeRedirect } from "@/i18n/navigation";

// Entrada pública desde el nav de marketing -- redirige a la demo oficial
// de WeWebinars, la misma que usa el Launchpad (ver
// NEXT_PUBLIC_LAUNCHPAD_DEMO_WEBINAR_URL, única fuente de verdad de "cuál
// es"). Sin URL configurada, cae a /pricing en el locale actual (no al
// español por defecto) -- next/navigation's redirect() para la URL externa
// de la demo (absoluta, fuera del espacio de rutas de next-intl) y
// @/i18n/navigation's redirect() para el fallback interno.
export default async function DemoRedirectPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const url = process.env.NEXT_PUBLIC_LAUNCHPAD_DEMO_WEBINAR_URL;
  if (url) redirect(url);
  localeRedirect({ href: "/pricing", locale: locale === "en" ? "en" : "es" });
}
