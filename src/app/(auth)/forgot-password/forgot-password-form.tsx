"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import Script from "next/script";
import { useTranslations } from "next-intl";

import { requestPasswordReset } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

// Same Cloudflare Turnstile setup as signup-form.tsx/login-form.tsx --
// Supabase's captcha protection covers resetPasswordForEmail too.
const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

declare global {
  interface Window {
    onTurnstileVerified?: (token: string) => void;
  }
}

export function ForgotPasswordForm() {
  const t = useTranslations("ForgotPasswordForm");
  const [state, formAction, isPending] = useActionState(
    requestPasswordReset,
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

  if (state && "success" in state) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("successTitle")}</CardTitle>
          <CardDescription>{t("successDescription")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/login" className="text-sm underline underline-offset-4">
            {t("backToLogin")}
          </Link>
        </CardContent>
      </Card>
    );
  }

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
        <form action={formAction} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor="email">{t("emailLabel")}</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          {TURNSTILE_SITE_KEY && (
            <div
              className="cf-turnstile"
              data-sitekey={TURNSTILE_SITE_KEY}
              data-callback="onTurnstileVerified"
            />
          )}
          {state && "error" in state && (
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
          <Link href="/login" className="underline underline-offset-4">
            {t("backToLogin")}
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
