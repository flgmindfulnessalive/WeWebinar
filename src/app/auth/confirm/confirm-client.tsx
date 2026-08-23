"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

// Email links (signup confirmation, password recovery) route here instead
// of through a server Route Handler. A plain server-side GET would also
// fire for corporate email security scanners that pre-visit links to check
// them for phishing/malware -- that consumes the one-time PKCE code before
// the real person ever clicks, so the genuine click then fails with
// "bad_code_verifier". Doing the exchange here, client-side in an effect,
// means it only runs when an actual browser renders and executes this
// page's JS -- link scanners fetch HTML but don't run it.
//
// The Supabase browser client also auto-detects and exchanges a `?code=`
// in the URL as soon as it's created (detectSessionInUrl: true, the
// default), stripping the param from the URL as part of that. So by the
// time this effect reads `code` via useSearchParams, it can already be
// null even though the exchange already succeeded -- we have to check for
// an existing session (and listen for the sign-in event) before concluding
// the link is actually invalid.
export function AuthConfirmClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const [error, setError] = useState<string | null>(null);

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
      if (!code) {
        setError("Este link no es válido o está incompleto.");
        return;
      }
      supabase.auth.exchangeCodeForSession(code).then(({ error: exchangeError }) => {
        if (redirected) return;
        if (exchangeError) {
          setError(
            exchangeError.code === "bad_code_verifier"
              ? "Este link ya fue usado o expiró. Pedí uno nuevo."
              : exchangeError.message
          );
          return;
        }
        goNext();
      });
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [code, searchParams, router]);

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button asChild variant="outline">
          <a href="/login">Volver a ingresar</a>
        </Button>
      </div>
    );
  }

  return <p className="text-center text-sm text-muted-foreground">Confirmando...</p>;
}
