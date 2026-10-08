"use client";

import { useEffect } from "react";

// Fires once per page load. The route decides whether it counts.
export function VisitBeacon({ slug, page }: { slug: string; page: "funnel" | "gift" }) {
  useEffect(() => {
    // On the WeFunnels host every path is rewritten onto /f, so the beacon
    // lives at /v there; anywhere else (local dev on the main host) the
    // internal /f prefix is still in the address bar.
    const endpoint = window.location.pathname.startsWith("/f/") ? "/f/v" : "/v";
    fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, page }),
      keepalive: true,
    }).catch(() => {});
  }, [slug, page]);

  return null;
}
