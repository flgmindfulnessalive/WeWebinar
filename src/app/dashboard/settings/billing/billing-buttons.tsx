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
            const res = await fetch("/api/whop/checkout", {
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

// Replaces the old BillingPortalButton (Lemon Squeezy had a hosted portal
// URL to redirect to; Whop doesn't -- cancellation is a direct API call,
// so this confirms in place instead of navigating away).
export function CancelSubscriptionButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [canceled, setCanceled] = useState(false);
  const t = useTranslations("BillingSettings");

  if (canceled) {
    return <p className="text-sm text-muted-foreground">{t("cancelScheduled")}</p>;
  }

  return (
    <div className="flex flex-col gap-1">
      <Button
        variant="outline"
        disabled={isPending}
        onClick={() => {
          if (!window.confirm(t("confirmCancel"))) return;
          startTransition(async () => {
            setError(null);
            const res = await fetch("/api/whop/cancel", { method: "POST" });
            const data = await res.json();
            if (!res.ok) {
              setError(data.error ?? t("cancelFailed"));
              return;
            }
            setCanceled(true);
          });
        }}
      >
        {isPending ? t("redirecting") : t("cancelSubscription")}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
