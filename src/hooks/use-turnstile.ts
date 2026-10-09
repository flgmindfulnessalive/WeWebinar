"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          callback: (token: string) => void;
          "expired-callback"?: () => void;
          "error-callback"?: () => void;
          "timeout-callback"?: () => void;
        }
      ) => string;
      remove: (widgetId: string) => void;
      reset: (widgetId: string) => void;
    };
  }
}

const TURNSTILE_SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js";
const POLL_INTERVAL_MS = 100;

function ensureTurnstileScript(): void {
  if (window.turnstile || document.querySelector(`script[src="${TURNSTILE_SCRIPT_SRC}"]`)) return;
  const script = document.createElement("script");
  script.src = TURNSTILE_SCRIPT_SRC;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}

// Turnstile's own script auto-renders any `.cf-turnstile` element present
// in the DOM the moment it finishes loading -- fine on a hard page load,
// but breaks on a client-side route change (a Next <Link> from home to
// /signup, say): the script is often already loaded from an earlier page
// in the same session, so it never re-scans for the fresh container this
// page just mounted, leaving the widget blank and the submit button stuck
// disabled until a hard refresh. Rendering the widget ourselves --
// explicitly, once the script's API is confirmed ready -- works the same
// whether this is a fresh load or an in-app navigation.
//
// `resetOn` es el resultado de la acción del formulario. Un token de
// Turnstile sirve UNA vez y caduca a los pocos minutos, así que el de
// memoria queda gastado en cuanto se envía. Sin pedir uno nuevo, el
// segundo intento manda el mismo: Cloudflare responde
// `timeout-or-duplicate`, la verificación falla, y el formulario queda
// roto hasta recargar la página -- que es, literalmente, lo que el
// mensaje de error acababa pidiéndole a la persona. Un fallo de red o un
// email ya registrado bastaban para dejarla encerrada ahí.
export function useTurnstile(siteKey: string | undefined, resetOn?: unknown) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!siteKey) return;
    ensureTurnstileScript();

    let cancelled = false;

    const interval = setInterval(() => {
      if (cancelled || !window.turnstile || !containerRef.current) return;
      clearInterval(interval);
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: setToken,
        // Los tres casos en los que el token deja de valer sin que nadie
        // toque nada. Vaciarlo deshabilita el botón de envío, que es
        // mejor que dejarlo pulsable para mandar algo que ya no sirve.
        "expired-callback": () => setToken(""),
        "error-callback": () => setToken(""),
        "timeout-callback": () => setToken(""),
      });
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
      const widgetId = widgetIdRef.current;
      widgetIdRef.current = null;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey]);

  // Cada resultado de la acción es un objeto nuevo, así que esto corre
  // también cuando el error que vuelve es el mismo de antes -- que es
  // justo cuando hace falta.
  useEffect(() => {
    if (!resetOn) return;
    // set-state-in-effect: aquí es lo que toca. El token no lo pierde
    // React, lo pierde Cloudflare -- se consumió al enviarse, y el widget
    // no avisa de eso por ninguna de sus tres devoluciones de llamada. Es
    // una sincronización con un sistema externo, que es el caso que la
    // propia regla exceptúa, y vaciarlo deja el botón deshabilitado hasta
    // que llegue el token nuevo. Sin esto queda pulsable con uno muerto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setToken("");
    const widgetId = widgetIdRef.current;
    if (widgetId && window.turnstile) window.turnstile.reset(widgetId);
  }, [resetOn]);

  return { containerRef, token };
}
