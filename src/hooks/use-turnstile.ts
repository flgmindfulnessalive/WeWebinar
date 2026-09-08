"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: { sitekey: string; callback: (token: string) => void }
      ) => string;
      remove: (widgetId: string) => void;
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
export function useTurnstile(siteKey: string | undefined) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [token, setToken] = useState("");

  useEffect(() => {
    if (!siteKey) return;
    ensureTurnstileScript();

    let widgetId: string | null = null;
    let cancelled = false;

    const interval = setInterval(() => {
      if (cancelled || !window.turnstile || !containerRef.current) return;
      clearInterval(interval);
      widgetId = window.turnstile.render(containerRef.current, { sitekey: siteKey, callback: setToken });
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey]);

  return { containerRef, token };
}
