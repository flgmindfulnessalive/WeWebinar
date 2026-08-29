"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

async function goTo(url: string) {
  window.location.href = url;
}

export function CheckoutButton({
  planKey,
  label,
}: {
  planKey: string;
  label: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("BillingSettings");

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await fetch("/api/stripe/checkout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ plan_key: planKey }),
            });
            const data = await res.json();
            if (!res.ok) {
              setError(data.error ?? t("checkoutFailed"));
              return;
            }
            await goTo(data.url);
          })
        }
      >
        {isPending ? t("redirecting") : label}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}

export function BillingPortalButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const t = useTranslations("BillingSettings");

  return (
    <div className="flex flex-col gap-1">
      <Button
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const res = await fetch("/api/stripe/portal", { method: "POST" });
            const data = await res.json();
            if (!res.ok) {
              setError(data.error ?? t("portalFailed"));
              return;
            }
            await goTo(data.url);
          })
        }
      >
        {isPending ? t("redirecting") : t("manageSubscription")}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
