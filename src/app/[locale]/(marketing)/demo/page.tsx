import { redirect } from "next/navigation";

// Entrada pública desde el nav de marketing -- redirige a la demo oficial
// de WeWebinars, la misma que usa el Launchpad (ver
// NEXT_PUBLIC_LAUNCHPAD_DEMO_WEBINAR_URL, única fuente de verdad de "cuál
// es"). Sin URL configurada, mejor un 404 franco que una redirección rota.
export default function DemoRedirectPage() {
  const url = process.env.NEXT_PUBLIC_LAUNCHPAD_DEMO_WEBINAR_URL;
  redirect(url || "/pricing");
}
