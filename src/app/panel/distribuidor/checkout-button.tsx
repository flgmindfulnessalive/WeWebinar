"use client";

import { useState } from "react";

export function DistributorCheckoutButton() {
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
        className="self-start rounded-xl bg-gradient-to-br from-[#1E5BF5] to-[#9333EA] px-7 py-4 text-[17px] font-semibold text-white disabled:opacity-60"
        style={{ boxShadow: "0 0 28px rgba(147,51,234,0.36)" }}
      >
        {busy ? "Abriendo…" : "Hacerme distribuidor"}
      </button>
      {error && (
        <p role="alert" className="m-0 text-sm text-[#FF8A8A]">
          {error}
        </p>
      )}
    </div>
  );
}
