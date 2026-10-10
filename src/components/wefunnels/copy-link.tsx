"use client";

import { useState } from "react";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard permission denied, or an insecure context. The link is
      // already on screen and selectable, so there is nothing to recover
      // from and nothing worth interrupting them about.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <code
        className="min-w-0 flex-1 rounded-[10px] border border-[var(--wf-edge)] bg-[var(--wf-field)] px-3.5 py-3 text-[15px] break-all text-[var(--wf-accent)]"
        style={{ fontFamily: "var(--font-wefunnels-mono), ui-monospace, monospace" }}
      >
        {url}
      </code>
      <button
        type="button"
        onClick={copy}
        className="rounded-[10px] bg-gradient-to-br from-[#1E5BF5] to-[#9333EA] px-5 py-3 text-[15px] font-semibold text-white"
      >
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}
