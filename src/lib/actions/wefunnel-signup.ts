"use server";

import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";

export type WeFunnelSignUpState =
  | { error: string }
  | { sent: string }
  // Ya tenía cuenta. Su propio estado y no un error: no hizo nada mal, y
  // lo que le falta es un enlace, no una corrección.
  | { exists: true }
  | null;

// Where the confirmation email lands, by intent. A fixed map and not a path
// read off the form: that path is written into a link we email, so accepting
// whatever the browser sent would turn every signup into an open redirect
// with our own domain in front of it.
const DESTINATIONS = {
  // Accepting the gift: creates their page and opens the editor.
  regalo: "/panel/empezar",
  // Buying the licence: the only screen that can price it, from the
  // account's own referral rows.
  distribuidor: "/panel/distribuidor",
} as const;

type Intent = keyof typeof DESTINATIONS;

function destinationFor(value: FormDataEntryValue | null): string {
  const key = String(value ?? "");
  return DESTINATIONS[key as Intent] ?? DESTINATIONS.regalo;
}

// Signup for someone arriving from WeFunnels, by either door: accepting a
// distributor's gift, or buying the licence from the official web.
//
// A sibling of auth.ts's signUpWithPassword rather than a flag on it,
// because the only thing that differs is where the confirmation lands --
// see DESTINATIONS. The WeWebinars signup goes to /onboarding, which asks
// about webinars: questions neither of these two people has any reason to
// answer yet.
//
// Everything else is deliberately the same account system: same
// supabase.auth.signUp, same Turnstile verification, same email
// confirmation requirement, same password policy. The approved mock asks
// for 8 characters; whatever the project already enforces is stronger or
// equal and is what applies.
//
// The distributor's attribution is not in this payload. It lives in the
// wf_ref cookie and is validated against the database by
// claim_wefunnel_site, so a form field claiming to have been invited by
// somebody would change nothing.
export async function weFunnelSignUp(
  _prev: WeFunnelSignUpState,
  formData: FormData
): Promise<WeFunnelSignUpState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("name") ?? "").trim().slice(0, 80);
  const captchaToken = String(formData.get("cf-turnstile-response") ?? "").trim();
  const destination = destinationFor(formData.get("destino"));

  if (!fullName) return { error: "Escribe tu nombre." };
  if (!email) return { error: "Escribe tu email." };

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=${encodeURIComponent(destination)}`,
        ...(captchaToken ? { captchaToken } : {}),
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes("captcha")) {
        const t = await getTranslations("AuthActions");
        return { error: t("captchaFailed") };
      }
      return { error: error.message };
    }

    // Un alta sobre un email que ya tiene cuenta devuelve éxito y no manda
    // nada: Supabase lo hace así para no confirmarle a un desconocido qué
    // direcciones están registradas. El usuario vuelve sin identidades, que
    // es la única señal de que eso ha pasado.
    //
    // Sin mirarla, esta pantalla decía "revisa tu correo" por un correo que
    // nunca salió, y la persona se quedaba esperándolo. En un embudo eso no
    // es una molestia, es la pérdida completa: se ha ido y no sabe por qué.
    //
    // Se gana decirle a quien pregunta si un email está registrado. Es un
    // precio consciente: quien llega aquí viene de un enlace de regalo o de
    // la web de compra, y dejarlo en un callejón sin salida cuesta más que
    // lo que ese dato vale.
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      return { exists: true };
    }
  } catch (err) {
    console.error("[wefunnel] signup failed:", err);
    const t = await getTranslations("AuthActions");
    return { error: t("connectionError") };
  }

  // Confirmation is required, so there is no session to redirect with. The
  // screen says to go to their inbox, which is the truth and the only thing
  // they can act on.
  return { sent: email };
}
