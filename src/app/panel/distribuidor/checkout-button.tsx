"use client";

import { useState } from "react";

import { PRIMARY_BUTTON } from "@/components/wefunnels/brand";

// Starts the Whop checkout. It sends nothing about the price: the server
// decides the tier from the account's referral and creates the checkout
// with the matching plan.
export function DistributorCheckoutButton({ label }: { label: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/whop/wefunnels-checkout", { method: "POST" });
      const body = (await response.json().catch(() => ({}))) as { url?: string };
      if (body.url) {
        window.location.href = body.url;
        return;
      }
      setError(
        response.status === 409
          ? "Tu licencia Distribuidor ya está activa."
          : response.status === 401
            ? "Tu sesión expiró. Vuelve a iniciar sesión."
            : "El pago no está disponible en este momento. Vuelve a intentarlo en un rato."
      );
    } catch {
      setError("No pudimos abrir el pago. Revisa tu conexión e intenta de nuevo.");
    }
    setBusy(false);
  }

  return (
    <div>
      <button type="button" onClick={start} disabled={busy} className={`${PRIMARY_BUTTON} w-full`}>
        {busy ? "Abriendo el pago…" : label} {!busy && <span aria-hidden="true">→</span>}
      </button>
      {error && (
        <p role="alert" className="mt-2.5 mb-0 text-[14px] text-[#ffb4b4]">
          {error}
        </p>
      )}
    </div>
  );
}
