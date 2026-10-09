"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { wefunnelAppUrl, wefunnelUrl } from "@/lib/wefunnels/host";
import { weFunnelsFromEmail, weFunnelsResetEmail } from "@/lib/wefunnels/email";

// WeFunnels' own access actions.
//
// Siblings of lib/actions/auth.ts, not a flag on it, for one reason that
// runs through all of them: every destination in that file is a WeWebinars
// address. signInWithPassword defaults to /dashboard, updatePassword
// redirects there outright, signOut lands on /login, and changeEmail's
// confirmation link comes back to /dashboard/settings/profile. A WeFunnels
// user taken to any of those is taken to a product they did not buy -- and
// since getCurrentAccount() returns null without a plan, /dashboard then
// sends them on to the WeWebinars onboarding, which asks them to set up a
// webinar account.
//
// The authentication itself is deliberately the same: same Supabase project,
// same users, same cookie (scoped to the registrable domain, so one session
// covers both hosts -- see lib/supabase/cookie-domain.ts), same Turnstile,
// same password policy. There is no second user system here, and there
// should not be one: a distributor's 2 included months of WeWebinars Starter
// are an entitlement on the same account.

export type WeFunnelAuthState = { error: string } | null;
export type WeFunnelSentState = { error: string } | { sent: true } | null;
export type WeFunnelSavedState = { error: string } | { success: string } | null;

// Everything a signed-in WeFunnels person can be sent to lives under the
// panel. Anything else coming in as a destination is refused rather than
// followed: this value ends up in a Location header.
function safeNext(value: FormDataEntryValue | null): string {
  const next = String(value ?? "");
  if (!next.startsWith("/panel") || next.startsWith("//")) return "/panel";
  return next;
}

export async function weFunnelSignIn(
  _prev: WeFunnelAuthState,
  formData: FormData
): Promise<WeFunnelAuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  // Supabase's captcha protection is one project-wide switch covering every
  // password grant, sign-in included -- the same reason the WeWebinars login
  // passes it. Populated by the Turnstile widget in the form.
  const captchaToken = String(formData.get("cf-turnstile-response") ?? "").trim();
  const next = safeNext(formData.get("next"));

  if (!email) return { error: "Escribe tu email." };
  if (!password) return { error: "Escribe tu contraseña." };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: { ...(captchaToken ? { captchaToken } : {}) },
    });

    if (error) {
      if (error.message.toLowerCase().includes("captcha")) {
        const t = await getTranslations("AuthActions");
        return { error: t("captchaFailed") };
      }
      // Supabase answers "Invalid login credentials" to a wrong password and
      // to an address with no account alike, which is the right answer to
      // give a stranger. Said in Spanish, with the two things they can do
      // about it, because the raw English string in the middle of this
      // screen reads as a crash.
      if (error.message.toLowerCase().includes("invalid login credentials")) {
        // Nombra las dos salidas, no solo una. Supabase da esta misma
        // respuesta a una contraseña equivocada y a una cuenta que nunca
        // tuvo contraseña -- la creada con Google, o la que abrió un
        // administrador sin ponerle una. Decir únicamente "no coinciden"
        // dejaba a esas personas probando contraseñas que no existen.
        return {
          error:
            "Ese email y esa contraseña no coinciden. Si creaste tu cuenta con Google, entra con el botón de arriba; si no, pide una contraseña nueva desde «Olvidé mi contraseña».",
        };
      }
      if (error.message.toLowerCase().includes("email not confirmed")) {
        return {
          error:
            "Todavía no has confirmado tu email. Busca el correo que te mandamos al registrarte y abre su enlace.",
        };
      }
      return { error: error.message };
    }
  } catch (err) {
    console.error("[wefunnel] sign in failed:", err);
    const t = await getTranslations("AuthActions");
    return { error: t("connectionError") };
  }

  redirect(next);
}

// "Olvidé mi contraseña", con el correo de WeFunnels.
//
// Lo manda esta función, por Resend, en vez de dejarlo en manos de
// supabase.auth.resetPasswordForEmail. La razón es que Supabase tiene UNA
// plantilla por proyecto: el mismo encabezado y la misma marca salen para
// quien se registra en WeWebinars y para quien pide su contraseña aquí, así
// que no hay forma de que diga las dos cosas. Quien acababa de pulsar el
// enlace en una pantalla de WeFunnels recibía un correo de WeWebinars.
//
// Lo que se pierde al salirse de ahí, y hay que reponer:
//
//   el límite de frecuencia -- la API de administración no lo tiene, así
//   que lo pone wefunnel_reset_allowed (20261009000003), por dirección y
//   por IP, en la misma llamada que lo registra;
//
//   la verificación del captcha -- Supabase comprobaba el token de
//   Turnstile al recibir la petición. Aquí ya no pasa por ahí, y el
//   proyecto no tiene la clave secreta de Turnstile para comprobarlo por su
//   cuenta, así que el freno de arriba es lo que queda sosteniendo esto.
//
// El enlace apunta a /auth/confirm en el host de la app, igual que antes:
// es la pantalla que gasta el token de un clic y no del escaneo antivirus
// de un correo corporativo. Desde ahí salta a /nueva-clave en el host de
// WeFunnels.
export async function weFunnelRequestReset(
  _prev: WeFunnelSentState,
  formData: FormData
): Promise<WeFunnelSentState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) return { error: "Escribe tu email." };

  // Lo mismo se responde pase lo que pase a partir de aquí. Decir "esa
  // dirección no tiene cuenta" convertiría esta pantalla, que es pública,
  // en una forma de averiguar quién está registrado.
  const sent: WeFunnelSentState = { sent: true };

  try {
    const admin = createAdminClient();

    const forwarded = (await headers()).get("x-forwarded-for") ?? "";
    const ip = forwarded.split(",")[0]?.trim() || null;

    const { data: allowed, error: throttleError } = await admin.rpc(
      "wefunnel_reset_allowed",
      { p_email: email, p_ip: ip }
    );

    if (throttleError) {
      // La migración todavía no está aplicada, o la base falló. No se manda
      // nada: un correo sin freno es peor que un correo que no sale.
      console.error("[wefunnel] reset throttle failed:", throttleError.message);
      return {
        error: "No pudimos mandar el correo. Inténtalo en unos minutos.",
      };
    }

    if (allowed !== true) return sent;

    // Que la cuenta exista se comprueba antes de pedir el enlace, y no se
    // deduce del error de generateLink: para los tipos 'signup' y
    // 'magiclink' esa llamada CREA el usuario que no existe, y una pantalla
    // pública que crea cuentas de paso no es una pantalla de recuperación.
    const { data: existing } = await admin
      .from("users")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    if (!existing) return sent;

    const { data: link, error: linkError } = await admin.auth.admin.generateLink({
      type: "recovery",
      email,
    });

    const tokenHash = link?.properties?.hashed_token;
    // El tipo que devuelve GoTrue, no el que pedimos: es el que
    // verifyOtp va a esperar al otro lado, y es lo que hace el otro sitio
    // del proyecto que manda un enlace así (whop-starter-kit-claim.ts).
    const verificationType = link?.properties?.verification_type;
    if (linkError || !tokenHash || !verificationType) {
      console.error("[wefunnel] reset generateLink failed:", linkError?.message);
      return sent;
    }

    // En el host de WeFunnels, no en el de la app. Con generateLink la
    // dirección la construimos nosotros, así que no hay lista de
    // redirecciones de Supabase que respetar -- esa lista gobierna los
    // parámetros redirectTo, y aquí no se usa ninguno. El enlace que la
    // persona ve en su correo dice wefunnels, que es de donde viene.
    const actionUrl = wefunnelUrl(
      `/confirmar?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(verificationType)}&next=${encodeURIComponent("/nueva-clave")}`
    );

    const { subject, html } = weFunnelsResetEmail(actionUrl);
    await sendEmail({ to: email, subject, html, from: weFunnelsFromEmail() });
  } catch (err) {
    console.error("[wefunnel] reset request failed:", err);
    return { error: "No pudimos mandar el correo. Inténtalo en unos minutos." };
  }

  return sent;
}

export async function weFunnelSetPassword(
  _prev: WeFunnelAuthState,
  formData: FormData
): Promise<WeFunnelAuthState> {
  const password = String(formData.get("password") ?? "");
  const repeat = String(formData.get("repeat") ?? "");

  if (password.length < 8) {
    return { error: "La contraseña necesita al menos 8 caracteres." };
  }
  if (repeat && password !== repeat) {
    return { error: "Las dos contraseñas no coinciden." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.updateUser({ password });

    if (error) {
      // The recovery link is single-use and expires. Without this the
      // screen showed "Auth session missing!", which tells somebody whose
      // link went stale nothing about asking for a new one.
      if (
        error.message.toLowerCase().includes("session") ||
        error.message.toLowerCase().includes("expired")
      ) {
        return {
          error:
            "Ese enlace ya no vale: solo sirve una vez y caduca. Pide uno nuevo desde «Olvidé mi contraseña».",
        };
      }
      return { error: error.message };
    }

    // Turns the dashboard's "set your password" banner off for good, same
    // as the WeWebinars flow does. Never blocks the change on it: the
    // password is already saved in Auth by this point.
    if (user) {
      await supabase.from("users").update({ password_set: true }).eq("id", user.id);
    }
  } catch (err) {
    console.error("[wefunnel] set password failed:", err);
    const t = await getTranslations("AuthActions");
    return { error: t("connectionError") };
  }

  redirect("/panel");
}

// Signing out of WeFunnels lands on the WeFunnels home, not on a WeWebinars
// login screen. A POST and not a link: a GET that ends a session can be
// fired by anything that prefetches it.
export async function weFunnelSignOut(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error("[wefunnel] sign out failed:", err);
  }
  redirect("/");
}

// Cerrar la sesión en todos los dispositivos, no solo en este navegador.
// Es la respuesta real a «entré desde el ordenador de otra persona», que
// hasta ahora no tenía ninguna: scope 'global' revoca todos los refresh
// tokens de la cuenta, así que las demás sesiones caen en cuanto les toca
// renovarse.
export async function weFunnelSignOutEverywhere(): Promise<void> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut({ scope: "global" });
  } catch (err) {
    console.error("[wefunnel] global sign out failed:", err);
  }
  redirect("/entrar");
}

// ------------------------------------------------------------------ cuenta

// The name on the account. Deliberately not lib/actions/profile.ts's
// updateProfile: that one starts with getCurrentAccount(), which returns
// null for a free WeFunnels account because it has no plan -- so it would
// refuse every WeFunnels user with "sesión no encontrada".
//
// display_name on public.users, which is what the account menu shows. The
// name on the public page is a different field with a different job
// (wefunnel_sites.display_name, edited in Mi página) and is left alone.
export async function weFunnelUpdateName(
  _prev: WeFunnelSavedState,
  formData: FormData
): Promise<WeFunnelSavedState> {
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
  if (!name) return { error: "Escribe tu nombre." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Tu sesión ha caducado. Vuelve a entrar." };

  const { data, error } = await supabase
    .from("users")
    .update({ display_name: name })
    .eq("id", user.id)
    .select("id");

  if (error) {
    console.error("[wefunnel] update name failed:", error.message);
    return { error: "No pudimos guardar tu nombre. Intenta de nuevo." };
  }
  if (!data || data.length === 0) {
    return { error: "No pudimos guardar tu nombre: tu sesión ya no coincide." };
  }

  // Also on the auth user, so the next screen that reads the metadata
  // (the signup's full_name, the course registration) agrees with this one.
  await supabase.auth.updateUser({ data: { full_name: name } });

  revalidatePath("/f/panel", "layout");
  return { success: "Guardado." };
}

export async function weFunnelChangePassword(
  _prev: WeFunnelSavedState,
  formData: FormData
): Promise<WeFunnelSavedState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    return { error: "La contraseña necesita al menos 8 caracteres." };
  }

  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.updateUser({ password });
    if (error) return { error: error.message };
    if (user) {
      await supabase.from("users").update({ password_set: true }).eq("id", user.id);
    }
  } catch (err) {
    console.error("[wefunnel] change password failed:", err);
    const t = await getTranslations("AuthActions");
    return { error: t("connectionError") };
  }

  return { success: "Contraseña cambiada." };
}

// Changing the address is a confirmation flow, not a write: Supabase asks
// both the old and the new inbox to approve it ("Secure email change"), and
// public.users.email is synced by the on_auth_user_email_updated trigger
// once they do. So this screen can only start it -- and it says so.
export async function weFunnelChangeEmail(
  _prev: WeFunnelSavedState,
  formData: FormData
): Promise<WeFunnelSavedState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email || !email.includes("@")) return { error: "Escribe un email válido." };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { error: "Tu sesión ha caducado. Vuelve a entrar." };
    if (email === user.email) return { error: "Ese ya es tu email." };

    const { error } = await supabase.auth.updateUser(
      { email },
      { emailRedirectTo: wefunnelAppUrl("/auth/confirm?next=/panel/cuenta") }
    );
    if (error) return { error: error.message };
  } catch (err) {
    console.error("[wefunnel] change email failed:", err);
    const t = await getTranslations("AuthActions");
    return { error: t("connectionError") };
  }

  return {
    success:
      "Te mandamos un correo a las dos direcciones. El cambio se aplica cuando abras los dos enlaces.",
  };
}

// Re-sending the confirmation of the address they signed up with. This is
// the one thing somebody stuck before publishing can do for themselves:
// wefunnel_publish_site refuses an unverified address, and until now the
// only instruction was "busca el correo" for a message that may have
// arrived days ago.
/* eslint-disable @typescript-eslint/no-unused-vars -- useActionState exige esta firma */
export async function weFunnelResendConfirmation(
  _prev: WeFunnelSavedState,
  _formData: FormData
): Promise<WeFunnelSavedState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: "Tu sesión ha caducado. Vuelve a entrar." };
  if (user.email_confirmed_at) return { success: "Tu email ya está verificado." };

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: user.email,
    options: { emailRedirectTo: wefunnelAppUrl("/auth/confirm?next=/panel/pagina") },
  });

  if (error) {
    console.error("[wefunnel] resend confirmation failed:", error.message);
    // Supabase rate-limits this per address, and that limit is the usual
    // reason it fails. Said as a wait rather than as a breakage.
    return {
      error:
        "No pudimos mandarlo ahora mismo. Espera un minuto y vuelve a intentarlo.",
    };
  }

  return { success: `Te lo mandamos de nuevo a ${user.email}.` };
}
