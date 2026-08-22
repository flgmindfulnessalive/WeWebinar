"use client";

import { useState, useTransition } from "react";

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
              setError(data.error ?? "No se pudo iniciar el checkout.");
              return;
            }
            await goTo(data.url);
          })
        }
      >
        {isPending ? "Redirigiendo..." : label}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}

export function BillingPortalButton() {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
              setError(data.error ?? "No se pudo abrir el portal.");
              return;
            }
            await goTo(data.url);
          })
        }
      >
        {isPending ? "Redirigiendo..." : "Gestionar suscripción"}
      </Button>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </div>
  );
}
