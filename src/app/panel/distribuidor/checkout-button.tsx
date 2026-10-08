"use client";

import { useState } from "react";

// The price shown on the button comes from the server, formatted by the page
// that read wefunnel_license_price. It is a label: the checkout route resolves
// the plan again from the account's own referral rows, so a tampered prop
// changes the text and nothing that is charged.
export function DistributorCheckoutButton({ price }: { price: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/whop/wefunnels-checkout", { method: "POST" });
      const body = (await response.json()) as { url?: string; error?: string };
      if (body.url) {
        window.location.href = body.url;
        return;
      }
      // The failure modes here are all ours -- an unset plan id, a Whop
      // outage -- so the message says so instead of implying they did
      // something wrong.
      setError(
        response.status === 409
          ? "Ya eres distribuidor."
          : "El pago no está disponible en este momento. Vuelve a intentarlo en un rato."
      );
    } catch {
      setError("No pudimos abrir el pago. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="inline-flex min-h-[52px] items-center justify-center rounded-lg bg-gradient-to-r from-[#3FE4EC] to-[#83B9FF] px-6 py-4 text-[16px] font-bold text-[#071521] disabled:opacity-60"
      >
        {busy ? "Abriendo…" : `Activar Distribuidor · ${price} →`}
      </button>
      {error && (
        <p role="alert" className="m-0 text-sm text-[#FF8A8A]">
          {error}
        </p>
      )}
    </div>
  );
}
