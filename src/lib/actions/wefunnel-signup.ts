"use server";

import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { verifyTurnstile } from "@/lib/turnstile";
import { wefunnelUrl } from "@/lib/wefunnels/host";
import { weFunnelsConfirmEmail, weFunnelsFromEmail } from "@/lib/wefunnels/email";

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

// Signup for someone arriving from WeFunnels, by either door: accepting a
// distributor's gift, or buying the licence from the official web.
//
// A sibling of auth.ts's signUpWithPassword rather than a flag on it,
// because the only thing that differs is where the confirmation lands --
// see DESTINATIONS. The WeWebinars signup goes to /onboarding, which asks
// about webinars: questions neither of these two people has any reason to
// answer yet.
//
// Everything else is deliberately the same account system: same Supabase
// project, same users table, same email confirmation requirement, same
// password policy.
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
  const intent: Intent = formData.get("destino") === "distribuidor" ? "distribuidor" : "regalo";
  const destination = DESTINATIONS[intent];

  if (!fullName) return { error: "Escribe tu nombre." };
  if (!email) return { error: "Escribe tu email." };

  const forwarded = (await headers()).get("x-forwarded-for") ?? "";
  const ip = forwarded.split(",")[0]?.trim() || null;
  const captcha = await verifyTurnstile(captchaToken, ip);

  if (captcha === "failed") {
    const t = await getTranslations("AuthActions");
    return { error: t("captchaFailed") };
  }

  // Sin TURNSTILE_SECRET_KEY no podemos comprobar el captcha nosotros, y
  // Supabase sí. Así que el alta sigue yendo por donde iba: su API lo
  // verifica al recibirla y manda su propio correo, el de la plantilla
  // única del proyecto -- con la marca de WeWebinars.
  //
  // Es el peor de los dos resultados y es el que había siempre, así que
  // dejarlo como reserva no quita nada. Lo que no se puede es tomar el
  // camino propio sin esa comprobación: dejaría este formulario, que es
  // público, abierto a cualquier script.
  if (captcha === "unconfigured") {
    // Que se vea en los registros. Este camino manda el correo de
    // Supabase -- cabecera de WeWebinars, enlace al host de la
    // aplicación -- a alguien que acaba de darse de alta en una pantalla
    // de WeFunnels, y no da ningún error: el alta funciona, solo que con
    // la marca equivocada. Sin esta línea la única forma de enterarse es
    // que alguien se registre y mire su bandeja de entrada.
    console.error(
      "[wefunnel] TURNSTILE_SECRET_KEY ausente: el alta usa el correo de Supabase, con la marca de WeWebinars. Revisa la variable en el entorno y vuelve a desplegar."
    );
    return signUpThroughSupabase({ email, password, fullName, captchaToken, destination });
  }

  return signUpWithOurOwnEmail({ email, password, fullName, destination, intent });
}

// El camino propio: la cuenta se crea con la API de administración, que no
// manda ningún correo, y el correo lo manda WeFunnels.
async function signUpWithOurOwnEmail({
  email,
  password,
  fullName,
  destination,
  intent,
}: {
  email: string;
  password: string;
  fullName: string;
  destination: string;
  intent: Intent;
}): Promise<WeFunnelSignUpState> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.auth.admin.generateLink({
      type: "signup",
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (error) {
      // Una dirección que ya tiene cuenta confirmada. Antes esto había que
      // deducirlo de un éxito con la lista de identidades vacía, que es la
      // forma en que supabase.auth.signUp evita confirmarle a un
      // desconocido qué direcciones están registradas. Aquí viene dicho.
      //
      // Una cuenta SIN confirmar no cae aquí: para ella generateLink
      // devuelve un enlace nuevo, que es justo lo que necesita quien se
      // registró y no encontró el correo.
      const message = error.message.toLowerCase();
      if (
        error.code === "email_exists" ||
        error.status === 422 ||
        message.includes("already") ||
        message.includes("registered")
      ) {
        return { exists: true };
      }
      console.error("[wefunnel] signup generateLink failed:", error.message);
      const t = await getTranslations("AuthActions");
      return { error: t("connectionError") };
    }

    const tokenHash = data?.properties?.hashed_token;
    const verificationType = data?.properties?.verification_type;
    if (!tokenHash || !verificationType) {
      console.error("[wefunnel] signup link came back without a token");
      const t = await getTranslations("AuthActions");
      return { error: t("connectionError") };
    }

    const actionUrl = wefunnelUrl(
      `/confirmar?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(
        verificationType
      )}&next=${encodeURIComponent(destination)}`
    );

    const { subject, html } = weFunnelsConfirmEmail(actionUrl, intent === "distribuidor" ? "compra" : "regalo");
    await sendEmail({ to: email, subject, html, from: weFunnelsFromEmail() });
  } catch (err) {
    // Lo único que llega aquí es el envío: lo de arriba devuelve en vez de
    // lanzar. La cuenta ya existe sin confirmar, así que volver a intentarlo
    // le dará un enlace nuevo en vez de chocar.
    console.error("[wefunnel] signup email failed:", err);
    return {
      error: "Creamos tu cuenta pero el correo no salió. Vuelve a intentarlo en un minuto.",
    };
  }

  return { sent: email };
}

// El camino de siempre, intacto. Supabase comprueba el captcha al recibir el
// alta y manda su propio correo.
async function signUpThroughSupabase({
  email,
  password,
  fullName,
  captchaToken,
  destination,
}: {
  email: string;
  password: string;
  fullName: string;
  captchaToken: string;
  destination: string;
}): Promise<WeFunnelSignUpState> {
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
    if (data.user && (data.user.identities?.length ?? 0) === 0) {
      return { exists: true };
    }
  } catch (err) {
    console.error("[wefunnel] signup failed:", err);
    const t = await getTranslations("AuthActions");
    return { error: t("connectionError") };
  }

  return { sent: email };
}
