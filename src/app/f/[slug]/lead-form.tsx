"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { submitWeFunnelLead, type WeFunnelLeadState } from "@/lib/actions/wefunnel-leads";

const FIELD =
  "w-full rounded-[10px] border border-[#23233A] bg-[#050509] px-3.5 py-3.5 text-[16px] text-white outline-none focus-visible:border-[#2BD7F5]";
const LABEL = "text-[13px] font-semibold text-[#A9B0C9]";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-[11px] bg-gradient-to-br from-[#1E5BF5] to-[#9333EA] px-5 py-4 text-[16px] font-semibold text-white disabled:opacity-60"
    >
      {pending ? "Enviando…" : "Enviar"}
    </button>
  );
}

export function LeadForm({
  siteId,
  ownerName,
  questionLabel,
  disabled,
}: {
  siteId: string;
  ownerName: string;
  questionLabel: string | null;
  disabled: boolean;
}) {
  const [state, formAction] = useActionState<WeFunnelLeadState, FormData>(
    submitWeFunnelLead,
    null
  );

  // The thank-you screen replaces the form in place, on the same URL. It
  // never becomes its own page: nothing extra to moderate, the back button
  // doesn't resubmit, and this state change is the conversion event an
  // owner's ad pixel fires on.
  if (state && "success" in state) {
    return (
      <section className="mt-7 flex flex-col gap-4 rounded-2xl border border-[#23233A] bg-[#0D0D15] p-5">
        <span
          className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-[#1E5BF5] to-[#9333EA]"
          aria-hidden="true"
        >
          <svg width="20" height="15" viewBox="0 0 20 15" fill="none">
            <path
              d="M2 7.5L7.5 13L18 2"
              stroke="#FFFFFF"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
        <h2 className="m-0 text-[24px] leading-tight font-extrabold tracking-tight">
          Listo, ya tengo tus datos
        </h2>
        {state.whatsappUrl ? (
          <>
            <p className="m-0 text-[16px] leading-relaxed text-[#A9B0C9]">
              Si quieres, escríbeme ahora y empezamos hoy mismo. El mensaje ya va escrito.
            </p>
            <a
              href={state.whatsappUrl}
              className="rounded-[13px] bg-gradient-to-br from-[#1E5BF5] to-[#9333EA] px-5 py-4 text-center text-[17px] font-semibold text-white no-underline"
            >
              Escribirle a {ownerName.split(/\s+/)[0]} por WhatsApp
            </a>
            <p className="m-0 text-sm leading-relaxed text-[#6E7694]">
              Si prefieres esperar, {ownerName.split(/\s+/)[0]} te escribe.
            </p>
          </>
        ) : (
          <p className="m-0 text-[16px] leading-relaxed text-[#A9B0C9]">
            {ownerName.split(/\s+/)[0]} te escribirá pronto.
          </p>
        )}
      </section>
    );
  }

  return (
    <form
      action={formAction}
      className="mt-7 flex flex-col gap-3.5 rounded-2xl border border-[#23233A] bg-[#0D0D15] p-5"
    >
      <h2 className="m-0 text-[19px] font-bold tracking-tight">
        Déjame tus datos y te escribo
      </h2>
      <input type="hidden" name="siteId" value={siteId} />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="wf-name" className={LABEL}>
          Tu nombre
        </label>
        <input id="wf-name" name="name" type="text" required className={FIELD} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="wf-whatsapp" className={LABEL}>
          Tu WhatsApp
        </label>
        <input id="wf-whatsapp" name="whatsapp" type="tel" inputMode="tel" className={FIELD} />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="wf-email" className={LABEL}>
          Tu email
        </label>
        <input id="wf-email" name="email" type="email" className={FIELD} />
      </div>

      {questionLabel && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="wf-answer" className={LABEL}>
            {questionLabel}
          </label>
          <input id="wf-answer" name="answer" type="text" className={FIELD} />
        </div>
      )}

      {state && "error" in state && (
        <p role="alert" className="m-0 text-sm leading-relaxed text-[#FF8A8A]">
          {state.error}
        </p>
      )}

      {disabled ? (
        <p className="m-0 text-sm leading-relaxed text-[#6E7694]">
          El formulario se activa cuando publiques la página.
        </p>
      ) : (
        <SubmitButton />
      )}
    </form>
  );
}
