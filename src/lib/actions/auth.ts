"use server";

import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { isUpgradePlanKey } from "@/lib/billing";

export type AuthActionState = { error: string } | null;

export async function signInWithPassword(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/dashboard");
  // Supabase's captcha protection (Authentication -> Attack Protection) is
  // a single project-wide toggle covering every password/OTP grant, sign-in
  // included, not just sign-up -- see the matching comment in
  // signUpWithPassword. Populated by the Turnstile widget in login-form.tsx.
  const captchaToken = String(formData.get("cf-turnstile-response") ?? "").trim();

  let redirectTo: string;
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
      return { error: error.message };
    }
    redirectTo = next;
  } catch (err) {
    console.error("[auth] signInWithPassword failed:", err);
    const t = await getTranslations("AuthActions");
    return { error: t("connectionError") };
  }

  redirect(redirectTo);
}

export type SignUpActionState = { error: string } | { checkEmail: true } | null;

export async function signUpWithPassword(
  _prevState: SignUpActionState,
  formData: FormData
): Promise<SignUpActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("full_name") ?? "");
  const rawPlan = String(formData.get("plan") ?? "");
  // Populated by the Cloudflare Turnstile widget's own hidden input (see
  // signup-form.tsx) once it's solved -- Supabase Auth verifies it
  // server-side against the secret key configured in its own dashboard
  // (Authentication -> Attack Protection), not against anything in this
  // codebase. Omitted entirely when there's no token so a signup attempt
  // before the widget finishes still gets Supabase's own rejection message
  // rather than us silently letting it through.
  const captchaToken = String(formData.get("cf-turnstile-response") ?? "").trim();
  // Carries the plan a host clicked "Get started" on from Pricing through
  // to onboarding -- as a query string on `next` rather than a separate
  // param, since that's the one value every redirect path here (email
  // confirm, Google OAuth callback) already forwards verbatim.
  const next = isUpgradePlanKey(rawPlan) ? `/onboarding?plan=${rawPlan}` : "/onboarding";

  let hasSession: boolean;
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=${encodeURIComponent(next)}`,
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
    // Email confirmation is required, so signUp doesn't return an active
    // session -- redirecting to /onboarding (a protected route) here would
    // just bounce them straight to /login with no explanation, since
    // there's nothing yet for the middleware to authenticate.
    hasSession = data.session !== null;
  } catch (err) {
    console.error("[auth] signUpWithPassword failed:", err);
    const t = await getTranslations("AuthActions");
    return { error: t("connectionError") };
  }

  if (!hasSession) return { checkEmail: true };
  redirect(next);
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
  // Same project-wide captcha requirement as signInWithPassword/signUp --
  // see the comment there. Populated by the Turnstile widget in
  // forgot-password-form.tsx.
  const captchaToken = String(formData.get("cf-turnstile-response") ?? "").trim();
  const t = await getTranslations("AuthActions");
  if (!email) return { error: t("emailRequired") };

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/confirm?next=/reset-password`,
      ...(captchaToken ? { captchaToken } : {}),
    });
    // Never reveal whether the email exists -- always report success from
    // the caller's point of view, but still surface a real infra failure.
    if (error) {
      if (error.message.toLowerCase().includes("captcha")) {
        return { error: t("captchaFailed") };
      }
      console.error("[auth] requestPasswordReset failed:", error);
      return { error: t("sendEmailFailed") };
    }
  } catch (err) {
    console.error("[auth] requestPasswordReset failed:", err);
    return { error: t("sendEmailFailed") };
  }

  return { success: true };
}

export async function updatePassword(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const password = String(formData.get("password") ?? "");
  const t = await getTranslations("AuthActions");
  if (password.length < 8) {
    return { error: t("passwordTooShort") };
  }

  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) return { error: error.message };
  } catch (err) {
    console.error("[auth] updatePassword failed:", err);
    return { error: t("connectionError") };
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
