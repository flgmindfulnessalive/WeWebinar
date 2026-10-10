"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { WhopCheckoutEmbed } from "@whop/checkout/react";

// El pago ocurre aquí dentro. Antes esto mandaba el navegador a
// whop.com con un window.location.href: la persona salía de WeFunnels
// justo en el paso que decide la compra, pagaba en una marca que no
// reconoce y volvía por redirect_url. El formulario incrustado es el
// mismo proveedor y el mismo cobro -- cambia dónde se teclea la tarjeta.
//
// El precio que se ve en el botón viene del servidor, de
// wefunnel_license_price. Es una etiqueta: la configuración de cobro la
// crea /api/whop/wefunnels-checkout resolviendo otra vez el origen desde
// las filas de referidos de la cuenta, así que un prop manipulado cambia
// el texto y nada de lo que se cobra.
type Started = { sessionId: string; url: string | null };

export function DistributorCheckoutButton({ price }: { price: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [started, setStarted] = useState<Started | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/whop/wefunnels-checkout", { method: "POST" });
      const body = (await response.json()) as {
        sessionId?: string;
        url?: string | null;
        error?: string;
      };
      if (body.sessionId) {
        setStarted({ sessionId: body.sessionId, url: body.url ?? null });
        return;
      }
      // Los fallos de aquí son todos nuestros -- un plan sin configurar,
      // una caída de Whop -- así que el mensaje lo dice en vez de dar a
      // entender que la persona hizo algo mal.
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

  if (started) {
    return (
      <div className="flex flex-col gap-3">
        <div className="overflow-hidden rounded-[14px] border border-[#2D3E57] bg-[#0B1423]">
          <WhopCheckoutEmbed
            sessionId={started.sessionId}
            theme="dark"
            fallback={
              <p className="m-0 p-6 text-[length:var(--wf-body)] text-[#B7C7DC]">
                Cargando el pago…
              </p>
            }
            // A la confirmación, que es donde se elige la dirección una vez
            // que la licencia ya está activa. La misma a la que apunta
            // redirect_url, para que el pago con redirección y el pago de
            // aquí terminen en la misma pantalla.
            onComplete={() => {
              // push y no un recargado entero: /listo es un componente de
              // servidor y se pide de nuevo al navegar, así que ya lee la
              // licencia que el webhook acaba de activar.
              router.push("/panel/distribuidor/listo");
            }}
            onPaymentError={(paymentError) => {
              console.error("[wefunnels] pago rechazado:", paymentError.code);
            }}
          />
        </div>
        {started.url && (
          // Un iframe de terceros no siempre carga: hay extensiones que lo
          // bloquean y navegadores sin cookies de terceros. Quien se quede
          // mirando un hueco tiene por dónde salir.
          <p className="m-0 text-[length:var(--wf-small)] leading-relaxed text-[#8498B4]">
            ¿No ves el formulario?{" "}
            <a href={started.url} className="font-semibold text-[#43E2EE]">
              Abre el pago en una pestaña nueva
            </a>
            .
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="wf-cta inline-flex min-h-[52px] items-center justify-center rounded-lg bg-gradient-to-r from-[#3FE4EC] to-[#83B9FF] px-6 py-4 text-[16px] font-bold text-[#071521] disabled:opacity-60"
      >
        {busy ? "Abriendo…" : `Activar Distribuidor · ${price} →`}
      </button>
      {error && (
        <p role="alert" className="m-0 text-[length:var(--wf-body)] text-[#FF8A8A]">
          {error}
        </p>
      )}
    </div>
  );
}
