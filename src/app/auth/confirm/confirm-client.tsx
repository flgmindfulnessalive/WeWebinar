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

// Email links (signup confirmation, password recovery, magic links) route
// here instead of through a server Route Handler, and -- for the
// token_hash + type path Supabase's own email templates use -- verifyOtp is
// only ever called from handleContinue(), gated behind the "Entrar"/button
// click below, never automatically on page load.
//
// That gate is the actual fix, not just a nice-to-have: a plain server-side
// GET route would consume the one-time code the moment a corporate email
// security scanner pre-visits the link to check it for phishing, and doing
// the verification client-side in a useEffect (the first version of this
// file) only raised the bar -- plenty of scanners (Microsoft Safe Links,
// Proofpoint URL Defense, etc.) render pages in a real headless browser and
// execute JS same as a person's browser would, so an auto-run effect still
// got silently consumed before the real recipient ever saw the page. A
// scanner fetching and even rendering the page is something we can't
// distinguish from a real visit -- but it doesn't click buttons. Requiring
// an explicit tap before the one-time token is ever spent means only an
// actual person can burn it, so this is the point where "link already
// used" for someone who never clicked anything stops happening.
//
// Prefers token_hash + type over the older `code` (PKCE) param: a PKCE
// exchange needs the code_verifier cookie that was set in whichever browser
// initiated the flow, so it silently fails whenever the link is opened
// somewhere else -- signed up on a computer, opened the email on a phone,
// the single most common way people actually check their inbox. verifyOtp
// has no such requirement, so the link works from any device. `code` is
// kept as a legacy fallback (see DEPLOY.md -- every current email template
// already uses token_hash) and, since the Supabase browser client
// auto-exchanges a `?code=` in the URL the moment it's created
// (detectSessionInUrl: true, the default) regardless of anything this
// component does, it can't be gated behind a click the same way -- that
// path stays as it was.
export function AuthConfirmClient() {
  const t = useTranslations("AuthConfirm");
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = searchParams.get("type");
  const next = searchParams.get("next") ?? "/dashboard";
  // "checking": looking for an existing/just-exchanged (code path) session.
  // "ready": token_hash + type present, waiting on the user's click.
  // "verifying": the click happened, verifyOtp is in flight.
  const [status, setStatus] = useState<"checking" | "ready" | "verifying">("checking");
  // "invalid" / "expired" are translated at render time (below) instead of
  // storing the translated string itself, so this effect never needs `t`
  // (from useTranslations, not stable across renders) in its dep array.
  const [error, setError] = useState<
    { kind: "invalid" } | { kind: "expired" } | { kind: "connection" } | { kind: "raw"; message: string } | null
  >(null);

  useEffect(() => {
    const supabase = createClient();
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
      if (isEmailOtpType(otpType) && tokenHash) {
        // Wait for handleContinue() -- do not verify yet.
        setStatus("ready");
      } else if (!code) {
        setError({ kind: "invalid" });
      }
      // else: a `code` was present -- detectSessionInUrl already attempted
      // (or is about to trigger) the exchange above; nothing else to do
      // here, `status` just stays "checking".
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [code, tokenHash, otpType, next, router]);

  async function handleContinue() {
    if (!isEmailOtpType(otpType) || !tokenHash) return;
    setStatus("verifying");
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });
    if (verifyError) {
      // AuthRetryableFetchError: the browser's fetch() to Supabase's auth
      // endpoint itself failed (network blip, DNS, ad-blocker) rather than
      // Supabase rejecting the token -- the SDK's own message for this is
      // just the raw browser error ("Failed to fetch"), which read as a
      // dead end rather than "try again". Same connection-failure class
      // AuthActions.connectionError already covers for the server-action
      // side of auth (see lib/actions/auth.ts).
      setError(
        verifyError.code === "bad_code_verifier" || verifyError.code === "otp_expired"
          ? { kind: "expired" }
          : verifyError.name === "AuthRetryableFetchError"
            ? { kind: "connection" }
            : { kind: "raw", message: verifyError.message }
      );
      setStatus("ready");
      return;
    }
    router.replace(next);
  }

  if (error) {
    let message: string;
    if (error.kind === "invalid") {
      message = t("invalidLink");
    } else if (error.kind === "expired") {
      message = t("usedOrExpired");
    } else if (error.kind === "connection") {
      message = t("connectionError");
    } else {
      message = error.message;
    }
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-sm text-destructive">{message}</p>
        {error.kind === "connection" ? (
          <Button variant="outline" onClick={handleContinue}>
            {t("tryAgain")}
          </Button>
        ) : (
          <Button asChild variant="outline">
            <Link href="/login">{t("backToLogin")}</Link>
          </Button>
        )}
      </div>
    );
  }

  if (status === "ready") {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-sm text-muted-foreground">{t("readyBody")}</p>
        <Button onClick={handleContinue}>{t("continueButton")}</Button>
      </div>
    );
  }

  return <p className="text-center text-sm text-muted-foreground">{t("confirming")}</p>;
}
