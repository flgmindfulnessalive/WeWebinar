import "server-only";

import { cookies } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { REFERRAL_COOKIE, parseTouch, type ReferralTouch } from "./referral";

// La invitación, sin depender de que la cookie sobreviva al salto.
//
// El recorrido de un regalo tiene un punto donde el navegador cambia casi
// siempre: la persona abre el enlace dentro de WhatsApp, crea su cuenta
// ahí, y luego abre el correo de confirmación en Gmail -- que lanza
// Chrome. La cookie se quedó en el primer navegador. El segundo llega con
// una sesión válida, sin cookie, y el panel le dice que WeFunnels es por
// invitación. Con su invitación en la mano, otra vez.
//
// Ninguna cookie arregla eso, porque no es un problema de caducidad ni de
// dominio: son dos almacenes distintos. Lo que sí sobrevive es la cuenta.
// Por eso el alta guarda la invitación en los metadatos de la persona, en
// el mismo formato que la cookie, y esto la lee cuando la cookie no está.
//
// Orden deliberado: manda la cookie. Quien abre un enlace de regalo nuevo
// está diciendo cuál quiere que cuente, y esa decisión es más reciente que
// lo que se guardó el día del alta.
export const REFERRAL_METADATA_KEY = "wf_ref";

export async function resolveReferralTouch(): Promise<ReferralTouch | null> {
  const fromCookie = parseTouch((await cookies()).get(REFERRAL_COOKIE)?.value);
  if (fromCookie) return fromCookie;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const stored = user?.user_metadata?.[REFERRAL_METADATA_KEY];

  return typeof stored === "string" ? parseTouch(stored) : null;
}
