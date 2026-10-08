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
    <main className="mx-auto flex max-w-[460px] flex-col gap-4 px-6 py-16 text-center">
      <h1 className="m-0 text-[clamp(24px,5vw,32px)] leading-tight font-extrabold tracking-[-0.03em] text-[#F3F7FF]">
        Esta página no cargó
      </h1>
      <p className="m-0 text-[15px] leading-relaxed text-[#B7C7DC]">
        El enlace está bien; el problema es nuestro. Vuelve a abrirlo en un momento.
      </p>
    </main>
  );
}
