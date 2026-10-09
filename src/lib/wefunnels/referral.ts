// The badge cookie.
//
// It carries exactly one hop: the click on someone's badge, through to the
// moment the new person claims their own page. After that the referral is a
// row on their account and this cookie stops mattering -- which is the
// whole point, because the chain it would otherwise have to survive runs
// five hops and several months, across devices, and no cookie does that.
//
// Last touch, so a later click simply overwrites it. That rule was chosen
// because it is the one that can be explained to both claimants without
// argument: the badge that produced the registration is the one that gets
// the credit.

import { getSupabaseCookieDomain } from "@/lib/supabase/cookie-domain";

export const REFERRAL_COOKIE = "wf_ref";
export const REFERRAL_WINDOW_DAYS = 90;

export type ReferralTouch = { slug: string; touchedAt: Date };

// Cómo se escribe la cookie, en un solo sitio.
//
// La ponen tres cosas distintas -- /r/<slug>, /<slug>/curso/ver y el
// proxy al servir una página de regalo -- y antes cada una repetía las
// seis opciones a mano. Una sola que se desviara (un maxAge, un domain)
// daba una atribución que se pierde a mitad de camino, sin error y sin
// forma de verlo hasta que alguien reclama y no cuenta para nadie.
export function referralCookie(slug: string) {
  return {
    name: REFERRAL_COOKIE,
    value: serializeTouch(slug),
    path: "/",
    maxAge: REFERRAL_WINDOW_DAYS * 24 * 60 * 60,
    sameSite: "lax" as const,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    domain: getSupabaseCookieDomain(),
  };
}

// El slug de una página de regalo, cuando la ruta es una.
//
// Existe porque el enlace que un distribuidor reparte de verdad es
// /<slug>/regalo -- es literalmente lo que copia /panel/repartir -- y
// hasta ahora esa dirección no sellaba nada. La única ruta que sellaba
// era /r/<slug>, a la que no apunta ninguna pantalla.
//
// El efecto era que todo regalo repartido desde el panel llegaba sin
// atribución: la persona se registraba, confirmaba, y /panel/empezar la
// encontraba sin touch, así que no creaba ninguna página y el panel le
// decía que WeFunnels es por invitación. Con su invitación en la mano.
//
// Va en el proxy y no en la página porque un componente de servidor no
// puede escribir una cookie mientras renderiza, y los dos botones de esa
// página van directos a /registro.
const GIFT_PATH = /^\/([a-z0-9][a-z0-9-]{1,30}[a-z0-9])\/regalo\/?$/;

export function giftPageSlug(pathname: string): string | null {
  return GIFT_PATH.exec(pathname.toLowerCase())?.[1] ?? null;
}

export function serializeTouch(slug: string, touchedAt: Date = new Date()): string {
  return `${slug}.${touchedAt.getTime()}`;
}

// Anything malformed, in the future, or past the window reads as no touch.
// The database clamps the same way on the way in; this keeps a stale cookie
// from showing up as a referrer in the UI before it gets there.
export function parseTouch(raw: string | undefined): ReferralTouch | null {
  if (!raw) return null;
  const separator = raw.lastIndexOf(".");
  if (separator <= 0) return null;

  const slug = raw.slice(0, separator);
  const millis = Number(raw.slice(separator + 1));
  if (!Number.isFinite(millis) || millis <= 0) return null;
  if (!/^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$/.test(slug)) return null;

  const touchedAt = new Date(millis);
  const ageDays = (Date.now() - millis) / 86_400_000;
  if (ageDays < 0 || ageDays > REFERRAL_WINDOW_DAYS) return null;

  return { slug, touchedAt };
}
