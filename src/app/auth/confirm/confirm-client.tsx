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
export function AuthConfirmClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const [exchangeError, setExchangeError] = useState<string | null>(null);

  useEffect(() => {
    if (!code) return;
    const next = searchParams.get("next") ?? "/dashboard";

    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (error) {
        setExchangeError(
          error.code === "bad_code_verifier"
            ? "Este link ya fue usado o expiró. Pedí uno nuevo."
            : error.message
        );
        return;
      }
      router.replace(next);
    });
  }, [code, searchParams, router]);

  const error =
    exchangeError ?? (!code ? "Este link no es válido o está incompleto." : null);

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
