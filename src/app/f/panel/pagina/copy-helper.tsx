"use client";

import { useActionState, useState } from "react";
import { Sparkles } from "lucide-react";

import { generateMyCopy, type CopyState } from "@/lib/actions/wefunnel-copy";
import type { WeFunnelCopy } from "@/lib/ai/pipeline/generate-wefunnel-copy";

const FIELD =
  "w-full rounded-[10px] border border-[#2D3E57] bg-[#091221] px-3.5 py-3 text-[length:var(--wf-body)] text-[#F3F7FF] outline-none placeholder:text-[#5E7290] focus-visible:border-[#43E2EE] focus-visible:ring-2 focus-visible:ring-[#43E2EE]/30";

// "Escríbelo por mí".
//
// Vive en su propio <form>, fuera del formulario del editor, porque un
// formulario dentro de otro no es HTML válido y el navegador lo desarma de
// maneras que no se ven hasta que algo deja de enviarse.
//
// Lo que devuelve NO se guarda: se escribe en los campos del editor, donde
// su dueño lo lee, lo corrige y decide. Un botón que cambiara una página ya
// publicada sin que llegara a verla no es una ayuda.
export function CopyHelper({ onCopy }: { onCopy: (copy: WeFunnelCopy) => void }) {
  const [state, action, pending] = useActionState<CopyState, FormData>(
    async (prev, formData) => {
      const result = await generateMyCopy(prev, formData);
      if (result && "copy" in result) onCopy(result.copy);
      return result;
    },
    null
  );
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-[14px] border border-[#2A3B55] bg-[#0B1423] p-[clamp(16px,2.2vw,20px)]">
      <button
        type="button"
        onClick={() => setOpen((shown) => !shown)}
        aria-expanded={open}
        className="flex w-full items-center gap-2.5 border-0 bg-transparent p-0 text-left"
      >
        <Sparkles className="size-4 shrink-0 text-[#8EEFF5]" aria-hidden="true" />
        <span className="flex-1 text-[length:var(--wf-body)] font-semibold text-[#E6EFFA]">
          ¿No sabes qué escribir?
        </span>
        <span
          className={`text-[#8498B4] transition-transform duration-200 ${open ? "rotate-45" : ""}`}
          aria-hidden="true"
        >
          +
        </span>
      </button>

      {open && (
        <form action={action} className="mt-4 flex flex-col gap-3">
          <label
            className="block text-[length:var(--wf-small)] font-semibold text-[#D2DFEF]"
            htmlFor="wf-brief"
          >
            Cuéntame a qué te dedicas, con tus palabras
          </label>
          <textarea
            id="wf-brief"
            name="brief"
            rows={3}
            maxLength={600}
            required
            minLength={20}
            placeholder="Trabajo con mujeres que quieren empezar algo propio sin dejar su trabajo. Les enseño a organizarse y a dar los primeros pasos."
            aria-describedby="wf-brief-help"
            className={`${FIELD} resize-y`}
          />
          <p
            id="wf-brief-help"
            className="m-0 text-[length:var(--wf-kicker)] leading-relaxed text-[#8498B4]"
          >
            Escribo tu antetítulo, tu titular y tu descripción. Los tres respetan las
            reglas de contenido de WeFunnels, así que no te van a mandar a revisión.
          </p>

          <button
            type="submit"
            disabled={pending}
            className="wf-cta inline-flex items-center justify-center self-start rounded-[10px] border border-[#2D3E57] bg-[#111C2E] px-4 py-2.5 text-[length:var(--wf-small)] font-semibold text-[#E6EFFA] disabled:opacity-60"
          >
            {pending ? "Escribiendo…" : "Escríbelo por mí"}
          </button>

          {state && "error" in state && (
            <p
              className="m-0 text-[length:var(--wf-small)] leading-relaxed text-[#FF9A9A]"
              role="alert"
            >
              {state.error}
            </p>
          )}

          {state && "copy" in state && (
            <p
              className="m-0 text-[length:var(--wf-small)] leading-relaxed text-[#8EEFF5]"
              role="status"
            >
              Listo, lo escribí en los campos de abajo. Léelo, cámbialo a tu gusto y
              guárdalo cuando te convenza. Si no te gusta, dime algo más y lo vuelvo a
              intentar.
            </p>
          )}
        </form>
      )}
    </div>
  );
}
