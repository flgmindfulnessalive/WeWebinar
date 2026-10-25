import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getPanelViewer } from "@/lib/wefunnels/site";
import { LeadRow, type FunnelState, type LeadCard, type LeadStatus } from "./lead-row";

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

  // Dos lecturas. La segunda dice, de cada persona a la que este
  // distribuidor le regaló un funnel, si ya lo publicó --- que es el
  // trabajo que queda después de regalarlo, y hasta ahora había que ir
  // mirando página por página para saberlo.
  //
  // Va aparte y no en un join porque son dos cosas distintas: la lista son
  // sus registros, y esto es lo que sabemos de los que además son
  // referidos suyos. Quien no reparte funnels recibe el conjunto vacío y
  // la columna no aparece.
  //
  // Su error sí se traga, al revés que el de la lista: sin esto la
  // pantalla pierde una insignia, y eso no justifica dejar a nadie sin
  // ver sus registros.
  const [leadsResult, pagesResult] = await Promise.all([
    supabase
      .from("wefunnel_leads")
      .select("id, name, whatsapp, email, answer, answers, source, status, created_at")
      .eq("site_id", viewer.site.id)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.rpc("wefunnel_referred_pages"),
  ]);

  // Antes solo se escribía en el log, y eso convirtió un fallo en una
  // columna de guiones que parecía un dato: «ninguno de tus referidos
  // tiene página». Son dos cosas muy distintas y la pantalla tiene que
  // poder decir cuál de las dos. Sigue sin tumbar la lista --- los
  // registros se ven igual ---, pero lo dice.
  const funnelStateFailed = Boolean(pagesResult.error);
  if (pagesResult.error) {
    console.error("[wefunnel] referred pages failed:", pagesResult.error.message);
  }

  const pageByEmail = new Map<string, FunnelState>();
  for (const row of pagesResult.data ?? []) {
    if (!row.email) continue;
    pageByEmail.set(row.email.trim().toLowerCase(), {
      slug: row.slug,
      state: row.suspended
        ? "suspendida"
        : row.site_status === "published"
          ? "publicada"
          : row.slug
            ? "borrador"
            : "sin_pagina",
    });
  }

  // El error no se traga. Una lectura fallida no es una lista vacía, y la
  // pantalla de "todavía no hay nadie" es exactamente lo que no hay que
  // enseñarle a alguien que sí tiene registros: se pasa el resto del día
  // creyendo que su página no captura. Mejor el límite de error.
  const { data: leads, error } = leadsResult;

  if (error) throw new Error(`wefunnel_leads: ${error.message}`);

  const rows: LeadCard[] = (leads ?? []).map((lead) => ({
    id: lead.id,
    name: lead.name,
    email: lead.email,
    whatsapp: lead.whatsapp,
    answers: Array.isArray(lead.answers) ? lead.answers : [],
    answer: lead.answer,
    source: lead.source,
    status: lead.status as LeadStatus,
    createdAt: DATE.format(new Date(lead.created_at)),
    whatsappLink: lead.whatsapp
      ? whatsappLink(lead.whatsapp, viewer.site!.display_name, lead.name)
      : null,
    funnel: lead.email ? (pageByEmail.get(lead.email.trim().toLowerCase()) ?? null) : null,
  }));

  const pending = rows.filter((lead) => lead.status === "nuevo").length;
  // Los que se quedaron a medias con su propio funnel. Es el resumen que
  // justifica la insignia: sin él habría que recorrer la lista para
  // enterarse de a quién le falta una mano.
  const unpublished = rows.filter(
    (lead) => lead.funnel && lead.funnel.state !== "publicada" && lead.funnel.state !== "suspendida"
  ).length;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="m-0 text-[clamp(24px,3.6vw,30px)] font-extrabold tracking-[-0.03em] text-[var(--wf-fg)]">
          Mis registros
        </h1>
        <p className="m-0 mt-2 text-[length:var(--wf-body)] leading-relaxed text-[var(--wf-fg-body)]">
          {rows.length === 0
            ? viewer.distributor
              ? "Aquí aparecerá cada persona que llene tu formulario o reclame su funnel con tu enlace de regalo."
              : "Aquí aparecerá cada persona que llene tu formulario."
            : pending > 0
              ? `${pending} ${pending === 1 ? "persona espera" : "personas esperan"} que les escribas.`
              : "Al día. No tienes registros nuevos sin contactar."}
        </p>
        {unpublished > 0 && (
          <p className="m-0 mt-1.5 text-[length:var(--wf-body)] leading-relaxed text-[var(--wf-warn)]">
            {unpublished === 1
              ? "1 de ellos todavía no publicó el funnel que le regalaste."
              : `${unpublished} de ellos todavía no publicaron el funnel que les regalaste.`}
          </p>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[14px] border border-[var(--wf-edge)] bg-[var(--wf-card)] p-6">
          <p className="m-0 text-[length:var(--wf-body)] leading-relaxed text-[var(--wf-fg-body)]">
            Todavía no hay nadie en tu lista. Aparecen aquí en cuanto alguien llena tu
            formulario, con todo lo que escribieron
            {viewer.distributor ? ", y también quien reclama su funnel con tu enlace de regalo." : "."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-[14px] border border-[var(--wf-edge)] bg-[var(--wf-card)]">
          <table className="w-full min-w-[760px] border-collapse text-[length:var(--wf-body)]">
            <thead>
              <tr className="text-left">
                {["Persona", "Su funnel", "Fecha", "Estado", "Ficha"].map((head) => (
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

      {funnelStateFailed && (
        <p className="m-0 rounded-[14px] border border-[var(--wf-warn)] bg-[var(--wf-card)] p-4 text-[length:var(--wf-body)] leading-relaxed text-[var(--wf-warn)]">
          No pudimos leer en qué punto está el funnel de tus referidos, así que la
          columna «Su funnel» sale vacía. Tus registros son correctos; vuelve a cargar
          en un momento.
        </p>
      )}

      {/* En plural: en esta lista caen los de la página personal y los de
          la página de regalo, que son dos orígenes y una sola lista. */}
      <p className="m-0 text-[length:var(--wf-body)] leading-relaxed text-[var(--wf-fg-muted)]">
        Personas registradas en tus páginas. Solo tú accedes a estos contactos.
      </p>
    </div>
  );
}
