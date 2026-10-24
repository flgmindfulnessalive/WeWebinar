"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { setLeadStatus, type SaveState } from "@/lib/actions/wefunnel-site";
import { WEFUNNELS_HOST } from "@/lib/wefunnels/host";

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
  nuevo: "border-[var(--wf-accent)] text-[var(--wf-accent)]",
  contactado: "border-[var(--wf-status-blue)] text-[var(--wf-status-blue)]",
  en_conversacion: "border-[var(--wf-ok)] text-[var(--wf-ok)]",
  no_interesado: "border-[var(--wf-fg-faint)] text-[var(--wf-fg-muted)]",
};

export function StatusPill({ status }: { status: LeadStatus }) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-1 text-[length:var(--wf-kicker)] whitespace-nowrap ${STATUS_STYLE[status]}`}
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
      className="rounded-lg border border-[var(--wf-edge)] px-4 py-2.5 text-[length:var(--wf-body)] font-semibold text-[var(--wf-fg-2)] disabled:opacity-60"
    >
      {pending ? "Guardando…" : "Guardar estado"}
    </button>
  );
}

// En qué punto está el funnel de alguien a quien este distribuidor se lo
// regaló. Null para una ficha que no es un referido suyo --- alguien que
// llenó el formulario de su página personal no tiene funnel que publicar,
// y una insignia vacía ahí sería ruido en la mayoría de las filas.
export type FunnelState = {
  slug: string | null;
  state: "publicada" | "borrador" | "suspendida" | "sin_pagina";
};

const FUNNEL_LABEL: Record<FunnelState["state"], string> = {
  publicada: "Publicó su funnel",
  borrador: "Su funnel está en borrador",
  suspendida: "Su funnel está suspendido",
  sin_pagina: "Todavía no eligió su dirección",
};

// Ámbar lo que pide una mano, verde lo que ya está. El borrador y el «sin
// dirección» son el motivo de que esta insignia exista, así que son los
// que se ven desde lejos.
const FUNNEL_STYLE: Record<FunnelState["state"], string> = {
  publicada: "border-[var(--wf-ok)] text-[var(--wf-ok)]",
  borrador: "border-[var(--wf-warn)] text-[var(--wf-warn)]",
  suspendida: "border-[var(--wf-danger)] text-[var(--wf-danger)]",
  sin_pagina: "border-[var(--wf-warn)] text-[var(--wf-warn)]",
};

export function FunnelPill({ funnel }: { funnel: FunnelState }) {
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-[length:var(--wf-kicker)] whitespace-nowrap ${FUNNEL_STYLE[funnel.state]}`}
    >
      {FUNNEL_LABEL[funnel.state]}
    </span>
  );
}

export type LeadCard = {
  id: string;
  name: string;
  email: string | null;
  whatsapp: string | null;
  // Pares pregunta/respuesta tal como se contestaron. Las filas de antes
  // de 20261015000001 no tienen ninguno y traen su texto en `answer`.
  answers: { q: string; a: string }[];
  answer: string | null;
  source: "form" | "course" | "claim" | "signup";
  status: LeadStatus;
  createdAt: string;
  whatsappLink: string | null;
  funnel: FunnelState | null;
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
        <td className="border-b border-[var(--wf-edge-soft-3)] px-5 py-3.5">
          <strong className="block text-[length:var(--wf-body)] font-semibold text-[var(--wf-fg)]">
            {lead.name}
          </strong>
          <span className="block text-[length:var(--wf-small)] break-all text-[var(--wf-fg-muted)]">
            {lead.email ?? lead.whatsapp ?? "—"}
          </span>
          {/* Debajo del correo y no en una columna propia: la tabla ya
              pide 620px de ancho, y una quinta columna la empujaría fuera
              del teléfono, que es donde se hace este seguimiento. */}
          {lead.funnel && (
            <span className="mt-1.5 flex flex-wrap items-center gap-2">
              <FunnelPill funnel={lead.funnel} />
              {/* Solo se enlaza lo publicado: un borrador abierto desde
                  aquí enseña «esta página todavía no está publicada», que
                  es un viaje para leer lo que ya dice la insignia. */}
              {lead.funnel.slug && lead.funnel.state === "publicada" && (
                <a
                  href={`https://${WEFUNNELS_HOST}/${lead.funnel.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[length:var(--wf-small)] text-[var(--wf-accent)] no-underline"
                >
                  /{lead.funnel.slug}
                </a>
              )}
            </span>
          )}
        </td>
        <td className="border-b border-[var(--wf-edge-soft-3)] px-5 py-3.5 text-[length:var(--wf-body)] whitespace-nowrap text-[var(--wf-fg-muted)] tabular-nums">
          {lead.createdAt}
        </td>
        <td className="border-b border-[var(--wf-edge-soft-3)] px-5 py-3.5">
          <StatusPill status={lead.status} />
        </td>
        <td className="border-b border-[var(--wf-edge-soft-3)] px-5 py-3.5">
          <button
            type="button"
            onClick={() => setOpen((previous) => !previous)}
            aria-expanded={open}
            className="rounded-lg border border-[var(--wf-edge)] px-3.5 py-2 text-[length:var(--wf-body)] font-semibold text-[var(--wf-fg-2)]"
          >
            {open ? "Cerrar" : "Ver"}
          </button>
        </td>
      </tr>

      {open && (
        <tr>
          <td colSpan={4} className="border-b border-[var(--wf-edge-soft-3)] bg-[var(--wf-strip)] px-5 py-5">
            <div className="flex flex-col gap-4">
              <div>
                <h3 className="m-0 text-[17px] font-semibold text-[var(--wf-fg)]">
                  {lead.name}
                </h3>
                <p className="m-0 mt-1 text-[length:var(--wf-body)] leading-relaxed text-[var(--wf-fg-muted)]">
                  {lead.source === "claim"
                    ? "Reclamó su funnel gratis con tu enlace de regalo."
                    : lead.source === "signup"
                      ? "Creó su cuenta con tu enlace de regalo. Todavía no eligió la dirección de su funnel."
                      : lead.source === "course"
                        ? "Se registró al curso desde tu página de regalo."
                        : "Solicitó más información sobre tu propuesta desde tu funnel."}
                </p>
              </div>

              <dl className="m-0 grid gap-3 sm:grid-cols-2">
                <div className="min-w-0">
                  <dt className="text-[length:var(--wf-kicker)] tracking-[0.1em] text-[var(--wf-fg-muted)] uppercase">
                    Email
                  </dt>
                  <dd className="m-0 mt-1 text-[length:var(--wf-body)] break-all text-[var(--wf-fg-2)]">
                    {lead.email ?? "No lo dejó"}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="text-[length:var(--wf-kicker)] tracking-[0.1em] text-[var(--wf-fg-muted)] uppercase">
                    WhatsApp
                  </dt>
                  <dd className="m-0 mt-1 text-[length:var(--wf-body)] text-[var(--wf-fg-2)]">
                    {lead.whatsapp ?? "No lo dejó"}
                  </dd>
                </div>
                {lead.answers.map((pair, index) => (
                  <div key={index} className="min-w-0 sm:col-span-2">
                    <dt className="text-[length:var(--wf-kicker)] tracking-[0.1em] text-[var(--wf-fg-muted)] uppercase">
                      {pair.q}
                    </dt>
                    <dd className="m-0 mt-1 text-[length:var(--wf-body)] leading-relaxed text-[var(--wf-fg-2)]">
                      {pair.a}
                    </dd>
                  </div>
                ))}

                {/* Las filas anteriores a las preguntas múltiples, y la
                    frase que registra a quien entra al curso: ninguna
                    tiene pares, pero sí texto que el dueño quiere leer. */}
                {lead.answers.length === 0 && lead.answer && (
                  <div className="min-w-0 sm:col-span-2">
                    <dt className="text-[length:var(--wf-kicker)] tracking-[0.1em] text-[var(--wf-fg-muted)] uppercase">
                      Su respuesta
                    </dt>
                    <dd className="m-0 mt-1 text-[length:var(--wf-body)] leading-relaxed text-[var(--wf-fg-2)]">
                      {lead.answer}
                    </dd>
                  </div>
                )}
              </dl>

              <form action={action} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="leadId" value={lead.id} />
                <label className="min-w-0 flex-1">
                  <span className="block text-[length:var(--wf-small)] font-semibold text-[var(--wf-fg-2)]">
                    Estado del seguimiento
                  </span>
                  <select
                    name="status"
                    defaultValue={lead.status}
                    className="mt-2 w-full rounded-[10px] border border-[var(--wf-edge)] bg-[var(--wf-card-2)] px-3.5 py-3 text-[length:var(--wf-body)] text-[var(--wf-fg)]"
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
                    className="wf-cta rounded-lg bg-gradient-to-r from-[#3FE4EC] to-[#83B9FF] px-4 py-2.5 text-[length:var(--wf-body)] font-bold text-[var(--wf-on-cta)] no-underline"
                  >
                    WhatsApp
                  </a>
                )}
              </form>

              {state && "error" in state && (
                <p className="m-0 text-[length:var(--wf-body)] text-[var(--wf-danger)]" role="alert">
                  {state.error}
                </p>
              )}
              {state && "success" in state && (
                <p className="m-0 text-[length:var(--wf-body)] text-[var(--wf-ok)]" role="status">
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
