"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { submitWeFunnelReport, type ReportState } from "@/lib/actions/wefunnel-report";
import { WEFUNNELS_HOST } from "@/lib/wefunnels/host";

// The same rules the content policy lists, in the words a visitor would
// use. Picking one is what makes a report actionable -- a free-text-only
// box produces a queue nobody can triage.
const RULES = [
  { value: "promesas-de-ingresos", label: "Promete ganancias o ingresos" },
  { value: "reclutamiento", label: "Recluta para un negocio o una red" },
  { value: "marcas", label: "Usa el nombre o el logo de una empresa" },
  { value: "criptomonedas", label: "Criptomonedas, trading, apuestas o préstamos" },
  { value: "salud", label: "Promete curas o resultados de salud" },
  { value: "suplantacion", label: "Se hace pasar por otra persona" },
  { value: "datos-bancarios", label: "Pide dinero o datos bancarios" },
  { value: "otro", label: "Otra cosa" },
];

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="wf-cta rounded-xl bg-gradient-to-br from-[#1E5BF5] to-[#9333EA] px-6 py-4 text-[length:var(--wf-lead)] font-semibold text-white disabled:opacity-60"
    >
      {pending ? "Enviando…" : "Enviar el reporte"}
    </button>
  );
}

export function ReportForm({ slug }: { slug: string }) {
  const [state, formAction] = useActionState<ReportState, FormData>(
    submitWeFunnelReport,
    null
  );

  if (state && "success" in state) {
    return (
      <main className="mx-auto flex min-h-svh max-w-[560px] flex-col justify-center px-6">
        <h1 className="m-0 text-[clamp(28px,4.4vw,38px)] leading-[1.1] font-extrabold tracking-[-0.032em] text-balance">
          Gracias, lo vamos a revisar
        </h1>
        <p className="mt-4 mb-0 text-[length:var(--wf-lead)] leading-relaxed text-[#C1D1E6]">
          Alguien lo mira en persona. No podemos contarte en qué termina, pero cada
          reporte se revisa.
        </p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-[560px] px-6 py-14">
      <h1 className="m-0 text-[clamp(28px,4.4vw,38px)] leading-[1.1] font-extrabold tracking-[-0.032em] text-balance">
        Reportar una página
      </h1>
      <p className="mt-4 mb-0 text-[length:var(--wf-lead)] leading-relaxed text-[#C1D1E6]">
        {slug ? (
          <>
            Estás reportando{" "}
            <span
              className="break-all text-[#43E2EE]"
              style={{ fontFamily: "var(--font-wefunnels-mono), ui-monospace, monospace" }}
            >
              {WEFUNNELS_HOST}/{slug}
            </span>
            .
          </>
        ) : (
          "Dinos qué página y qué viste."
        )}
      </p>

      <form action={formAction} className="mt-7 flex flex-col gap-5">
        {slug ? (
          <input type="hidden" name="slug" value={slug} />
        ) : (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="rp-slug" className="text-[length:var(--wf-small)] font-semibold text-[#D2DFEF]">
              Dirección de la página
            </label>
            <input
              id="rp-slug"
              name="slug"
              type="text"
              required
              placeholder="nombre"
              className="w-full rounded-[10px] border border-[#2D3E57] bg-[#0B1423] px-3.5 py-3.5 text-[length:var(--wf-body)] text-white outline-none focus-visible:border-[#43E2EE]"
            />
          </div>
        )}

        <fieldset className="m-0 flex flex-col gap-2.5 border-0 p-0">
          <legend className="mb-1 p-0 text-[length:var(--wf-small)] font-semibold text-[#D2DFEF]">
            ¿Qué viste?
          </legend>
          {RULES.map((rule) => (
            <label
              key={rule.value}
              className="flex cursor-pointer items-center gap-3 rounded-[10px] border border-[#23233A] bg-[#0D0D15] px-4 py-3 text-[15px] has-[:checked]:border-[#2BD7F5]"
            >
              <input
                type="radio"
                name="rule"
                value={rule.value}
                required
                className="h-4 w-4 accent-[#2BD7F5]"
              />
              {rule.label}
            </label>
          ))}
        </fieldset>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="rp-note" className="text-[length:var(--wf-small)] font-semibold text-[#D2DFEF]">
            Cuéntanos más (opcional)
          </label>
          <textarea
            id="rp-note"
            name="note"
            rows={3}
            className="w-full resize-y rounded-[10px] border border-[#23233A] bg-[#0D0D15] px-3.5 py-3 text-[15px] leading-relaxed text-white outline-none focus-visible:border-[#2BD7F5]"
          />
        </div>

        {state && "error" in state && (
          <p role="alert" className="m-0 text-sm text-[#FF8A8A]">
            {state.error}
          </p>
        )}

        <Submit />
      </form>
    </main>
  );
}
