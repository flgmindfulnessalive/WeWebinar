import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getPanelViewer } from "@/lib/wefunnels/site";
import { LeadRow, type LeadCard, type LeadStatus } from "./lead-row";

const DATE = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

// The message the owner opens the chat with. Written from their side, so the
// first thing the lead reads is a person, not a template.
function whatsappLink(number: string, ownerName: string, leadName: string) {
  const first = leadName.split(/\s+/)[0] ?? "";
  const text = `Hola ${first}, soy ${ownerName}. Gracias por dejarme tus datos.`;
  return `https://wa.me/${number.replace(/^\+/, "")}?text=${encodeURIComponent(text)}`;
}

// Mis registros. Every row is somebody who filled in their page or took
// their gift, with a follow-up state they can move and a ficha they can
// open without leaving the list.
//
// RLS is what keeps this to their own page: wefunnel_leads_select_owner
// admits only the owning account, so there is no account filter in this
// query and no way to widen it from here.
export default async function PanelLeadsPage() {
  const viewer = await getPanelViewer();
  if (!viewer) redirect("/entrar?next=/panel/registrados");
  if (!viewer.site) redirect("/panel");

  const supabase = await createClient();
  const { data: leads } = await supabase
    .from("wefunnel_leads")
    .select("id, name, whatsapp, email, answer, source, status, created_at")
    .eq("site_id", viewer.site.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const question = viewer.site.question_label ?? "Su respuesta";
  const rows: LeadCard[] = (leads ?? []).map((lead) => ({
    id: lead.id,
    name: lead.name,
    email: lead.email,
    whatsapp: lead.whatsapp,
    answer: lead.answer,
    source: lead.source,
    status: lead.status as LeadStatus,
    createdAt: DATE.format(new Date(lead.created_at)),
    question,
    whatsappLink: lead.whatsapp
      ? whatsappLink(lead.whatsapp, viewer.site!.display_name, lead.name)
      : null,
  }));

  const pending = rows.filter((lead) => lead.status === "nuevo").length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="m-0 text-[clamp(24px,3.6vw,30px)] font-extrabold tracking-[-0.03em] text-[var(--wf-fg)]">
          Mis registros
        </h1>
        <p className="m-0 mt-2 text-[length:var(--wf-body)] leading-relaxed text-[var(--wf-fg-body)]">
          {rows.length === 0
            ? "Aquí aparecerá cada persona que llene tu formulario."
            : pending > 0
              ? `${pending} ${pending === 1 ? "persona espera" : "personas esperan"} que les escribas.`
              : "Al día. No tienes registros nuevos sin contactar."}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[14px] border border-[var(--wf-edge)] bg-[var(--wf-card)] p-6">
          <p className="m-0 text-[length:var(--wf-body)] leading-relaxed text-[var(--wf-fg-body)]">
            Todavía no hay nadie en tu lista. Aparecen aquí en cuanto alguien llena tu
            formulario, con todo lo que escribieron.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[14px] border border-[var(--wf-edge)] bg-[var(--wf-card)]">
          <table className="w-full min-w-[620px] border-collapse text-[length:var(--wf-body)]">
            <thead>
              <tr className="text-left">
                {["Persona", "Fecha", "Estado", "Ficha"].map((head) => (
                  <th
                    key={head}
                    scope="col"
                    className="border-b border-[var(--wf-edge)] bg-[var(--wf-strip)] px-5 py-3 text-[length:var(--wf-kicker)] font-semibold tracking-[0.1em] text-[var(--wf-fg-muted)] uppercase"
                  >
                    {head}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((lead) => (
                <LeadRow key={lead.id} lead={lead} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="m-0 text-[length:var(--wf-body)] leading-relaxed text-[var(--wf-fg-muted)]">
        Personas registradas en tu página. Solo tú accedes a estos contactos: quien te
        regaló tu funnel no los ve. El botón de WhatsApp abre el chat con el mensaje
        escrito; el envío automático de correos llega con un plan de WeWebinars.
      </p>
    </div>
  );
}
