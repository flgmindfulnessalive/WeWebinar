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
    <div className="flex max-w-[560px] flex-col gap-4 rounded-[16px] border border-[#2D3E57] bg-[#0E192A] p-[clamp(20px,3vw,28px)]">
      <p className="m-0 text-[11px] font-bold tracking-[0.155em] text-[#F5BE52] uppercase">
        Algo falló de nuestro lado
      </p>
      <h1 className="m-0 text-[clamp(22px,3.4vw,28px)] leading-tight font-bold tracking-[-0.025em] text-[#F3F7FF]">
        No pudimos cargar esta pantalla
      </h1>
      <p className="m-0 text-[15px] leading-relaxed text-[#B7C7DC]">
        Tu página, tus registros y tu licencia están intactos — esto es solo esta pantalla.
        Vuelve a intentarlo y, si sigue igual, escríbenos.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="inline-flex min-h-[48px] items-center justify-center rounded-lg bg-gradient-to-r from-[#3FE4EC] to-[#83B9FF] px-5 py-3.5 text-[15px] font-bold text-[#071521]"
        >
          Volver a intentar
        </button>
        <Link
          href="/panel"
          className="inline-flex min-h-[48px] items-center justify-center rounded-lg border border-[#2D3E57] px-5 py-3.5 text-[15px] font-semibold text-[#D2DFEF] no-underline"
        >
          Ir a mi panel
        </Link>
      </div>
      {error.digest && (
        <p className="m-0 text-xs text-[#5E7290]">
          Referencia para soporte: {error.digest}
        </p>
      )}
    </div>
  );
}
