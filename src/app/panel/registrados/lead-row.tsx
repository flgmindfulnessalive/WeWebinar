"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { setLeadStatus, type SaveState } from "@/lib/actions/wefunnel-site";

export type LeadStatus = "nuevo" | "contactado" | "en_conversacion" | "no_interesado";

export const STATUS_LABEL: Record<LeadStatus, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  en_conversacion: "En conversación",
  no_interesado: "No interesado",
};

// The four the approved panel offers, and no more: a lead list that grows a
// status vocabulary becomes a CRM nobody asked for.
const STATUS_STYLE: Record<LeadStatus, string> = {
  nuevo: "border-[#43E2EE] text-[#43E2EE]",
  contactado: "border-[#83B9FF] text-[#83B9FF]",
  en_conversacion: "border-[#4ED8A8] text-[#4ED8A8]",
  no_interesado: "border-[#5E7290] text-[#8498B4]",
};

export function StatusPill({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-1 text-[11px] whitespace-nowrap ${STATUS_STYLE[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function SaveStatus() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg border border-[#2D3E57] px-4 py-2.5 text-sm font-semibold text-[#D2DFEF] disabled:opacity-60"
    >
      {pending ? "Guardando…" : "Guardar estado"}
    </button>
  );
}

export type LeadCard = {
  id: string;
  name: string;
  email: string | null;
  whatsapp: string | null;
  answer: string | null;
  source: "form" | "course";
  status: LeadStatus;
  createdAt: string;
  question: string;
  whatsappLink: string | null;
};

// The ficha, opened per row. Inline rather than on its own route: the whole
// record is four fields and a state, and a page load to read four fields is
// the kind of thing that stops people from following up at all.
export function LeadRow({ lead }: { lead: LeadCard }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<SaveState, FormData>(setLeadStatus, null);

  return (
    <>
      <tr>
        <td className="border-b border-[#1A2537] px-5 py-3.5">
          <strong className="block text-[15px] font-semibold text-[#F3F7FF]">
            {lead.name}
          </strong>
          <span className="block text-xs break-all text-[#8498B4]">
            {lead.email ?? lead.whatsapp ?? "—"}
          </span>
        </td>
        <td className="border-b border-[#1A2537] px-5 py-3.5 text-sm whitespace-nowrap text-[#8498B4] tabular-nums">
          {lead.createdAt}
        </td>
        <td className="border-b border-[#1A2537] px-5 py-3.5">
          <StatusPill status={lead.status} />
        </td>
        <td className="border-b border-[#1A2537] px-5 py-3.5">
          <button
            type="button"
            onClick={() => setOpen((previous) => !previous)}
            aria-expanded={open}
            className="rounded-lg border border-[#2D3E57] px-3.5 py-2 text-sm font-semibold text-[#D2DFEF]"
          >
            {open ? "Cerrar" : "Ver"}
          </button>
        </td>
      </tr>

      {open && (
        <tr>
          <td colSpan={4} className="border-b border-[#1A2537] bg-[#091221] px-5 py-5">
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="m-0 text-[17px] font-semibold text-[#F3F7FF]">
                  {lead.name}
                </h3>
                <p className="m-0 mt-1 text-sm leading-relaxed text-[#8498B4]">
                  {lead.source === "course"
                    ? "Se registró al curso desde tu página de regalo."
                    : "Solicitó más información sobre tu propuesta desde tu funnel."}
                </p>
              </div>

              <dl className="m-0 grid gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <dt className="text-[11px] tracking-[0.1em] text-[#8498B4] uppercase">
                    Email
                  </dt>
                  <dd className="m-0 mt-1 text-sm break-all text-[#D2DFEF]">
                    {lead.email ?? "No lo dejó"}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[11px] tracking-[0.1em] text-[#8498B4] uppercase">
                    WhatsApp
                  </dt>
                  <dd className="m-0 mt-1 text-sm text-[#D2DFEF]">
                    {lead.whatsapp ?? "No lo dejó"}
                  </dd>
                </div>
                {lead.answer && (
                  <div className="min-w-0 sm:col-span-2">
                    <dt className="text-[11px] tracking-[0.1em] text-[#8498B4] uppercase">
                      {lead.question}
                    </dt>
                    <dd className="m-0 mt-1 text-sm leading-relaxed text-[#D2DFEF]">
                      {lead.answer}
                    </dd>
                  </div>
                )}
              </dl>

              <form action={action} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="leadId" value={lead.id} />
                <label className="min-w-0 flex-1">
                  <span className="block text-[13px] font-semibold text-[#D2DFEF]">
                    Estado del seguimiento
                  </span>
                  <select
                    name="status"
                    defaultValue={lead.status}
                    className="mt-2 w-full rounded-[10px] border border-[#2D3E57] bg-[#0B1423] px-3.5 py-3 text-[15px] text-[#F3F7FF]"
                  >
                    {(Object.keys(STATUS_LABEL) as LeadStatus[]).map((key) => (
                      <option key={key} value={key}>
                        {STATUS_LABEL[key]}
                      </option>
                    ))}
                  </select>
                </label>
                <SaveStatus />
                {lead.whatsappLink && (
                  <a
                    href={lead.whatsappLink}
                    className="rounded-lg bg-gradient-to-r from-[#3FE4EC] to-[#83B9FF] px-4 py-2.5 text-sm font-bold text-[#071521] no-underline"
                  >
                    WhatsApp
                  </a>
                )}
              </form>

              {state && "error" in state && (
                <p className="m-0 text-sm text-[#FF8A8A]" role="alert">
                  {state.error}
                </p>
              )}
              {state && "success" in state && (
                <p className="m-0 text-sm text-[#4ED8A8]" role="status">
                  Estado guardado.
                </p>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
