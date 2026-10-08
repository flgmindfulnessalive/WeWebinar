"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { FIELD, LABEL } from "@/components/wefunnels/brand";
import { submitWeFunnelLead, type WeFunnelLeadState } from "@/lib/actions/wefunnel-leads";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="wf-btn-primary mt-1 min-h-[48px] w-full rounded-lg px-4 py-3 text-[15px] font-bold disabled:opacity-60"
    >
      {pending ? "Enviando…" : "Quiero más información →"}
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
  const [state, formAction] = useActionState<WeFunnelLeadState, FormData>(submitWeFunnelLead, null);
  const firstName = ownerName.split(/\s+/)[0] ?? ownerName;

  // Confirmation replaces the form in place, on the same URL: nothing extra
  // to moderate, the back button doesn't resubmit, and this state change is
  // the conversion event an owner's ad pixel fires on.
  if (state && "success" in state) {
    return (
      <section
        className="mt-7 flex flex-col gap-4 rounded-[13px] border border-[#35445d] bg-[#0d1727] p-5"
        role="status"
        aria-live="polite"
      >
        <span className="wf-btn-primary inline-grid h-11 w-11 place-items-center rounded-full text-[18px] font-bold" aria-hidden="true">
          ✓
        </span>
        <h2 className="m-0 text-[24px] leading-tight font-bold tracking-tight text-[#f2f7ff]">
          Listo, recibí tus datos
        </h2>
        {state.whatsappUrl ? (
          <>
            <p className="m-0 text-[15px] leading-relaxed text-[#b4c6dc]">
              {firstName} se pondrá en contacto contigo. Si prefieres, escríbele ahora: el mensaje ya
              va escrito.
            </p>
            <a
              href={state.whatsappUrl}
              className="wf-btn-primary rounded-lg px-5 py-3.5 text-center text-[15px] font-bold no-underline"
            >
              Escribirle a {firstName} por WhatsApp
            </a>
          </>
        ) : (
          <p className="m-0 text-[15px] leading-relaxed text-[#b4c6dc]">
            {firstName} se pondrá en contacto contigo sobre esta propuesta.
          </p>
        )}
      </section>
    );
  }

  return (
    <form action={formAction} className="mt-7 flex flex-col gap-3.5 border-t border-[#35445d] pt-6">
      <input type="hidden" name="siteId" value={siteId} />

      <div>
        <label htmlFor="wf-name" className={LABEL}>Tu nombre</label>
        <input id="wf-name" name="name" type="text" required maxLength={120} autoComplete="name" placeholder="¿Cómo te llamas?" className={FIELD} />
      </div>

      <div>
        <label htmlFor="wf-email" className={LABEL}>Email</label>
        <input id="wf-email" name="email" type="email" required maxLength={320} autoComplete="email" placeholder="tu@email.com" className={FIELD} />
      </div>

      <div>
        <label htmlFor="wf-whatsapp" className={LABEL}>
          WhatsApp <span className="font-normal text-[#a8bdd5]">· opcional</span>
        </label>
        <input id="wf-whatsapp" name="whatsapp" type="tel" inputMode="tel" autoComplete="tel" maxLength={32} className={FIELD} />
      </div>

      {questionLabel && (
        <div>
          <label htmlFor="wf-answer" className={LABEL}>{questionLabel}</label>
          <input id="wf-answer" name="answer" type="text" maxLength={1000} className={FIELD} />
        </div>
      )}

      {state && "error" in state && (
        <p role="alert" className="m-0 text-[14px] leading-relaxed text-[#ffb4b4]">
          {state.error}
        </p>
      )}

      {disabled ? (
        <p className="m-0 text-[13px] leading-relaxed text-[#a8bdd5]">
          El formulario se activa cuando publiques la página.
        </p>
      ) : (
        <SubmitButton />
      )}

      <p className="m-0 text-[12px] leading-relaxed text-[#a8bdd5]">
        Al enviar, solicitas que {ownerName} te contacte sobre esta propuesta.
      </p>
    </form>
  );
}
