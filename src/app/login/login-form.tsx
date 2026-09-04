"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useTranslations } from "next-intl";

import { signInWithPassword } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { GoogleButton } from "@/components/google-button";

// Same Cloudflare Turnstile setup as signup-form.tsx -- Supabase's captcha
// protection (Authentication -> Attack Protection) is one project-wide
// toggle covering every password/OTP grant, sign-in included, so this needs
// the identical widget or every login gets rejected with "captcha
// protection: request disallowed (no captcha_token found)".
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

declare global {
  interface Window {
    onTurnstileVerified?: (token: string) => void;
  }
}

export function LoginForm({ next }: { next: string }) {
  const t = useTranslations("LoginForm");
  const [state, formAction, isPending] = useActionState(
    signInWithPassword,
    null
  );
  const [captchaToken, setCaptchaToken] = useState("");

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    window.onTurnstileVerified = (token: string) => setCaptchaToken(token);
    return () => {
      delete window.onTurnstileVerified;
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {TURNSTILE_SITE_KEY && (
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            strategy="afterInteractive"
            async
            defer
          />
        )}
        <GoogleButton next={next} />

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">{t("orEmail")}</span>
          </div>
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <input type="hidden" name="next" value={next} />
          <div className="grid gap-2">
            <Label htmlFor="email">{t("emailLabel")}</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t("passwordLabel")}</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-muted-foreground underline underline-offset-4"
              >
                {t("forgotPassword")}
              </Link>
            </div>
            <PasswordInput
              id="password"
              name="password"
              required
              autoComplete="current-password"
            />
          </div>
          {TURNSTILE_SITE_KEY && (
            <div
              className="cf-turnstile"
              data-sitekey={TURNSTILE_SITE_KEY}
              data-callback="onTurnstileVerified"
            />
          )}
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={isPending || (Boolean(TURNSTILE_SITE_KEY) && !captchaToken)}
          >
            {isPending ? t("submitting") : t("submit")}
          </Button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {t("noAccount")}{" "}
          <Link href="/signup" className="underline underline-offset-4">
            {t("signupLink")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
