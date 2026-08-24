"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

export type AuthActionState = { error: string } | null;

export async function signInWithPassword(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");

  let redirectTo: string;
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    redirectTo = next;
  } catch (err) {
    console.error("[auth] signInWithPassword failed:", err);
    return { error: "No pudimos conectar con el servidor de autenticación. Prueba de nuevo en un momento." };
  }

  redirect(redirectTo);
}

export async function signUpWithPassword(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "");

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/onboarding`,
      },
    });
    if (error) return { error: error.message };
  } catch (err) {
    console.error("[auth] signUpWithPassword failed:", err);
    return { error: "No pudimos conectar con el servidor de autenticación. Prueba de nuevo en un momento." };
  }

  redirect("/onboarding");
}

export async function signInWithGoogle(next: string = "/dashboard") {
  // Never call redirect() inside this try block — it throws internally to
  // perform the navigation, and that throw would just get swallowed by our
  // own catch below instead of actually redirecting.
  let destination: string;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=${encodeURIComponent(
          next
        )}`,
      },
    });
    destination =
      error || !data.url
        ? `/login?error=${encodeURIComponent(error?.message ?? "oauth_failed")}`
        : data.url;
  } catch (err) {
    console.error("[auth] signInWithGoogle failed:", err);
    destination = `/login?error=${encodeURIComponent("oauth_failed")}`;
  }

  redirect(destination);
}

export type ForgotPasswordState = { error: string } | { success: true } | null;

export async function requestPasswordReset(
  _prevState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "El email es obligatorio." };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/reset-password`,
    });
    // Never reveal whether the email exists -- always report success from
    // the caller's point of view, but still surface a real infra failure.
    if (error) {
      console.error("[auth] requestPasswordReset failed:", error);
      return { error: "No pudimos enviar el email. Prueba de nuevo en un momento." };
    }
  } catch (err) {
    console.error("[auth] requestPasswordReset failed:", err);
    return { error: "No pudimos enviar el email. Prueba de nuevo en un momento." };
  }

  return { success: true };
}

export async function updatePassword(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    return { error: "La contraseña debe tener al menos 8 caracteres." };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: error.message };
  } catch (err) {
    console.error("[auth] updatePassword failed:", err);
    return { error: "No pudimos conectar con el servidor de autenticación. Prueba de nuevo en un momento." };
  }

  redirect("/dashboard");
}

export async function signOut() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error("[auth] signOut failed:", err);
  }
  redirect("/login");
}
