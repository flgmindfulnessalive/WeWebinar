"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import type { EmailOtpType } from "@supabase/supabase-js";
import { useTranslations } from "next-intl";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const EMAIL_OTP_TYPES: EmailOtpType[] = [
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email_change",
];

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return EMAIL_OTP_TYPES.includes(value as EmailOtpType);
}

// Email links (signup confirmation, password recovery) route here instead
// of through a server Route Handler. A plain server-side GET would also
// fire for corporate email security scanners that pre-visit links to check
// them for phishing/malware -- that consumes the one-time code before the
// real person ever clicks, so the genuine click then fails. Doing the
// verification here, client-side in an effect, means it only runs when an
// actual browser renders and executes this page's JS -- link scanners
// fetch HTML but don't run it.
//
// Prefers token_hash + type (Supabase's own email templates carry these as
// {{ .TokenHash }} / a fixed type) over the older `code` (PKCE) param: a
// PKCE exchange needs the code_verifier cookie that was set in whichever
// browser initiated the flow, so it silently fails whenever the link is
// opened somewhere else -- signed up on a computer, opened the email on a
// phone, the single most common way people actually check their inbox.
// verifyOtp has no such requirement, so the link works from any device.
// `code` is kept as a fallback for any email template not yet updated to
// the token_hash link (see DEPLOY.md).
//
// The Supabase browser client also auto-detects and exchanges a `?code=`
// in the URL as soon as it's created (detectSessionInUrl: true, the
// default), stripping the param from the URL as part of that. So by the
// time this effect reads `code` via useSearchParams, it can already be
// null even though the exchange already succeeded -- we have to check for
// an existing session (and listen for the sign-in event) before concluding
// the link is actually invalid.
export function AuthConfirmClient() {
  const t = useTranslations("AuthConfirm");
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = searchParams.get("type");
  // "invalid" / "expired" are translated at render time (below) instead of
  // storing the translated string itself, so this effect never needs `t`
  // (from useTranslations, not stable across renders) in its dep array.
  const [error, setError] = useState<
    { kind: "invalid" } | { kind: "expired" } | { kind: "raw"; message: string } | null
  >(null);

  useEffect(() => {
    const supabase = createClient();
    const next = searchParams.get("next") ?? "/dashboard";
    let redirected = false;

    const goNext = () => {
      if (redirected) return;
      redirected = true;
      router.replace(next);
    };

    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_IN" || event === "PASSWORD_RECOVERY") {
        goNext();
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (redirected) return;
      if (data.session) {
        goNext();
        return;
      }
      const verify = isEmailOtpType(otpType) && tokenHash
        ? supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType })
        : code
          ? supabase.auth.exchangeCodeForSession(code)
          : null;

      if (!verify) {
        setError({ kind: "invalid" });
        return;
      }
      verify.then(({ error: verifyError }) => {
        if (redirected) return;
        if (verifyError) {
          setError(
            verifyError.code === "bad_code_verifier" || verifyError.code === "otp_expired"
              ? { kind: "expired" }
              : { kind: "raw", message: verifyError.message }
          );
          return;
        }
        goNext();
      });
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [code, tokenHash, otpType, searchParams, router]);

  if (error) {
    let message: string;
    if (error.kind === "invalid") {
      message = t("invalidLink");
    } else if (error.kind === "expired") {
      message = t("usedOrExpired");
    } else {
      message = error.message;
    }
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-sm text-destructive">{message}</p>
        <Button asChild variant="outline">
          <Link href="/login">{t("backToLogin")}</Link>
        </Button>
      </div>
    );
  }

  return <p className="text-center text-sm text-muted-foreground">{t("confirming")}</p>;
}
