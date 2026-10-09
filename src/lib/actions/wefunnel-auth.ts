"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { wefunnelAppUrl } from "@/lib/wefunnels/host";

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

// "Olvidé mi contraseña". The link in the email comes back through
// /auth/confirm, which is on the app host because that is the address
// registered in Supabase's redirect allowlist -- and from there to
// /nueva-clave, which the proxy sends to the WeFunnels host. So the only
// WeWebinars-shaped thing left in this flow is a URL nobody reads.
export async function weFunnelRequestReset(
  _prev: WeFunnelSentState,
  formData: FormData
): Promise<WeFunnelSentState> {
  const email = String(formData.get("email") ?? "").trim();
  const captchaToken = String(formData.get("cf-turnstile-response") ?? "").trim();

  if (!email) return { error: "Escribe tu email." };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: wefunnelAppUrl("/auth/confirm?next=/nueva-clave"),
      ...(captchaToken ? { captchaToken } : {}),
    });

    if (error) {
      if (error.message.toLowerCase().includes("captcha")) {
        const t = await getTranslations("AuthActions");
        return { error: t("captchaFailed") };
      }
      console.error("[wefunnel] reset request failed:", error.message);
      return { error: "No pudimos mandar el correo. Inténtalo en un minuto." };
    }
  } catch (err) {
    console.error("[wefunnel] reset request failed:", err);
    return { error: "No pudimos mandar el correo. Inténtalo en un minuto." };
  }

  // Said the same whether or not that address has an account: confirming
  // which emails are registered is not something this screen gets to do.
  return { sent: true };
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
