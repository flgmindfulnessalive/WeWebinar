"use client";

import { useEffect } from "react";

// The beacon. One POST on mount, never retried: a visit that misses is one
// row off a daily rollup, and a retry loop on a public page is a worse
// trade. The route does the deduplication, so mounting twice in a
// development double-render cannot double-count.
export function CountVisit({ slug, surface }: { slug: string; surface: "funnel" | "gift" }) {
  useEffect(() => {
    const controller = new AbortController();
    void fetch("/api/visita", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ slug, surface }),
      signal: controller.signal,
      keepalive: true,
    }).catch(() => {
      // Blocked, offline, or navigated away. Nothing to tell the visitor.
    });
    return () => controller.abort();
  }, [slug, surface]);

  return null;
}
