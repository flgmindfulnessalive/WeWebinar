"use client";

import { useState } from "react";

export function CopyLink({ url, label = "Copiar enlace" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard denied or insecure context: the link is on screen and
      // selectable, nothing to recover from.
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <code
        className="min-w-0 flex-1 basis-[220px] rounded-lg border border-[#2d4157] bg-[#081421] px-3 py-2.5 text-[13px] break-all text-[#77deeb]"
        style={{ fontFamily: "var(--font-wefunnels-mono), ui-monospace, monospace" }}
      >
        {url}
      </code>
      <button
        type="button"
        onClick={copy}
        className="min-h-[40px] rounded-[7px] border border-[#456181] bg-transparent px-3.5 py-2 text-[13px] text-[#dcecff] hover:border-[#6f8db0]"
        aria-live="polite"
      >
        {copied ? "Copiado ✓" : label}
      </button>
    </div>
  );
}
