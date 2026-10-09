"use client";

import { useEffect } from "react";

// A public page that fails. Deliberately plain and without a retry loop:
// whoever is looking at this followed somebody's link, and the useful thing
// is telling them the link is fine and to try again, not debugging in front
// of them.
export default function WeFunnelsError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error("[wefunnels] public page failed:", error);
  }, [error]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-[520px] flex-col justify-center gap-5 px-6 py-16 text-center">
      <h1 className="m-0 text-[clamp(28px,4.6vw,40px)] leading-[1.08] font-extrabold tracking-[-0.035em] text-[#F3F7FF] text-balance">
        Esta página no cargó
      </h1>
      <p className="m-0 text-[length:var(--wf-lead)] leading-relaxed text-[#C1D1E6]">
        El enlace está bien; el problema es nuestro. Vuelve a abrirlo en un momento.
      </p>
    </main>
  );
}
