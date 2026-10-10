"use client";

import { useEffect } from "react";
import Link from "next/link";

// What a failed read looks like. Says what they can do and keeps the one
// thing that matters visible: nothing of theirs was lost. A page, a lead
// list and a licence are rows in a database, not state in this screen.
export default function PanelError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[panel] render failed:", error);
  }, [error]);

  return (
    <div className="flex max-w-[560px] flex-col gap-4 rounded-[16px] border border-[var(--wf-edge)] bg-[var(--wf-card)] p-[clamp(20px,3vw,28px)]">
      <p className="m-0 text-[length:var(--wf-kicker)] font-bold tracking-[0.155em] text-[var(--wf-warn)] uppercase">
        Algo falló de nuestro lado
      </p>
      <h1 className="m-0 text-[clamp(22px,3.4vw,28px)] leading-tight font-bold tracking-[-0.025em] text-[var(--wf-fg)]">
        No pudimos cargar esta pantalla
      </h1>
      <p className="m-0 text-[length:var(--wf-body)] leading-relaxed text-[var(--wf-fg-body)]">
        Tu página, tus registros y tu licencia están intactos — esto es solo esta pantalla.
        Vuelve a intentarlo y, si sigue igual, escríbenos.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="wf-cta inline-flex min-h-[48px] items-center justify-center rounded-lg bg-gradient-to-r from-[#3FE4EC] to-[#83B9FF] px-5 py-3.5 text-[length:var(--wf-body)] font-bold text-[var(--wf-on-cta)]"
        >
          Volver a intentar
        </button>
        <Link
          href="/panel"
          className="inline-flex min-h-[48px] items-center justify-center rounded-lg border border-[var(--wf-edge)] px-5 py-3.5 text-[length:var(--wf-body)] font-semibold text-[var(--wf-fg-2)] no-underline"
        >
          Ir a mi panel
        </Link>
      </div>
      {error.digest && (
        <p className="m-0 text-[length:var(--wf-small)] text-[var(--wf-fg-faint)]">
          Referencia para soporte: {error.digest}
        </p>
      )}
    </div>
  );
}
