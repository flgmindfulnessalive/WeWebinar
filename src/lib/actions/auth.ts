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
    return { error: "No pudimos conectar con el servidor de autenticación. Probá de nuevo en un momento." };
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
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
      },
    });
    if (error) return { error: error.message };
  } catch (err) {
    console.error("[auth] signUpWithPassword failed:", err);
    return { error: "No pudimos conectar con el servidor de autenticación. Probá de nuevo en un momento." };
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

export async function signOut() {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch (err) {
    console.error("[auth] signOut failed:", err);
  }
  redirect("/login");
}
