"use client";

import { useState } from "react";

// El pago se abre en la página de Whop.
//
// Aquí vivía un formulario incrustado, y la intención era buena --- que
// nadie saliera de WeFunnels en el paso que decide la compra ---, pero no
// funcionaba: enseñaba «This checkout is no longer available» mientras el
// mismo cobro, abierto en una pestaña, se completaba sin problema.
//
// El motivo está en los tipos de @whop/checkout: WhopCheckoutEmbed acepta
// `planId` o `sessionId`, y lo que nosotros tenemos es un id de
// CONFIGURACIÓN de checkout. Son objetos distintos de Whop, y el formulario
// no sabe resolver el nuestro. `planId` tampoco sirve: la configuración es
// lo que lleva el account_id como metadato, y sin él el webhook no sabe a
// qué cuenta activarle la licencia. Crear una sesión de verdad tampoco se
// puede: el SDK solo expone checkoutConfigurations, no sesiones ---
// comprobado también en la versión 0.7.0.
//
// Así que se va a la página de Whop, que sí resuelve la configuración,
// conserva los metadatos y devuelve a /panel/distribuidor/listo por el
// redirect_url que ya le damos. El día que el SDK sepa crear sesiones, el
// formulario puede volver.
//
// El precio que se ve en el botón viene del servidor, de
// wefunnel_license_price. Es una etiqueta: la configuración de cobro la
// crea /api/whop/wefunnels-checkout resolviendo otra vez el origen desde
// las filas de referidos de la cuenta, así que un prop manipulado cambia
// el texto y nada de lo que se cobra.
export function DistributorCheckoutButton({ price }: { price: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    // El navegador tarda en irse, y sin esto el finally devolvía el botón
    // a «Activar» mientras la página todavía estaba cambiando: parecía que
    // no había pasado nada y la gente lo pulsa otra vez.
    let leaving = false;
    try {
      const response = await fetch("/api/whop/wefunnels-checkout", { method: "POST" });
      const body = (await response.json()) as {
        sessionId?: string;
        url?: string | null;
        error?: string;
      };
      if (body.url) {
        leaving = true;
        // assign y no replace: así el botón «atrás» del navegador devuelve
        // al panel a quien se arrepienta en la pasarela, en vez de dejarlo
        // encerrado en ella.
        window.location.assign(body.url);
        return;
      }

      // Una configuración sin dirección de compra no se puede abrir. No
      // debería pasar --- Whop la devuelve siempre ---, pero callarlo
      // dejaría el botón girando para siempre.
      if (body.sessionId) {
        setError("El pago se creó pero no pudimos abrirlo. Vuelve a intentarlo.");
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
      if (!leaving) setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="wf-cta inline-flex min-h-[52px] items-center justify-center rounded-lg bg-gradient-to-r from-[#3FE4EC] to-[#83B9FF] px-6 py-4 text-[16px] font-bold text-[var(--wf-on-cta)] disabled:opacity-60"
      >
        {busy ? "Abriendo el pago…" : `Activar Licencia Distribuidor · ${price} →`}
      </button>
      {error && (
        <p role="alert" className="m-0 text-[length:var(--wf-body)] text-[var(--wf-danger)]">
          {error}
        </p>
      )}
    </div>
  );
}
