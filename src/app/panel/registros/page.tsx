import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getPanelViewer } from "@/lib/wefunnels/site";
import type { WeFunnelFollowUpStatus } from "@/lib/supabase/database.types";
import { Card, DATE_SHORT, STATUS_LABEL, STATUS_ORDER } from "../ui";

type SearchParams = Promise<{ estado?: string }>;

export default async function PanelLeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const viewer = await getPanelViewer();
  if (!viewer) redirect("/login?next=/panel/registros");
  if (!viewer.site) redirect("/panel");

  const { estado } = await searchParams;
  const filter = STATUS_ORDER.includes(estado as WeFunnelFollowUpStatus) ? (estado as WeFunnelFollowUpStatus) : null;

  // RLS already limits this to the caller's own page; the site filter is
  // for clarity, not for security.
  const supabase = await createClient();
  let query = supabase
    .from("wefunnel_leads")
    .select("id, name, email, whatsapp, answer, created_at, follow_up_status, source")
    .eq("site_id", viewer.site.id)
    .order("created_at", { ascending: false })
    .limit(500);
  if (filter) query = query.eq("follow_up_status", filter);
  const { data: leads, error } = await query;

  const rows = leads ?? [];

  return (
    <div>
      <h1 className="mt-0 mb-1 text-[29px] font-bold tracking-[-1px]">Mis registros</h1>
      <p className="mt-0 mb-5 text-[15px] text-[#afc1d9]">Personas registradas en tu página. Solo tú accedes a estos contactos.</p>

      <nav aria-label="Filtrar por estado" className="mb-4 flex flex-wrap gap-2 text-[12px]">
        <Link href="/panel/registros" aria-current={!filter ? "true" : undefined} className={`rounded-[7px] border px-3 py-2 no-underline ${!filter ? "border-[#4be5ed] text-[#a1f0f1]" : "border-[#3d516d] text-[#dcecff]"}`}>
          Todos
        </Link>
        {STATUS_ORDER.map((s) => (
          <Link key={s} href={`/panel/registros?estado=${s}`} aria-current={filter === s ? "true" : undefined} className={`rounded-[7px] border px-3 py-2 no-underline ${filter === s ? "border-[#4be5ed] text-[#a1f0f1]" : "border-[#3d516d] text-[#dcecff]"}`}>
            {STATUS_LABEL[s]}
          </Link>
        ))}
      </nav>

      <Card>
        {error ? (
          <p role="alert" className="m-0 text-[14px] text-[#ffb4b4]">No pudimos cargar tus registros. Recarga la página.</p>
        ) : rows.length === 0 ? (
          <p className="m-0 text-[14px] text-[#afc1d9]">
            {filter
              ? `No tienes registros con estado «${STATUS_LABEL[filter]}».`
              : "Todavía no hay nadie en tu lista. Aparecen aquí en cuanto alguien deja sus datos en tu página."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-[11px] text-[#f2f7ff]">
                  <th scope="col" className="border-b border-[#3b4e68] px-2 py-3 font-medium">Persona</th>
                  <th scope="col" className="border-b border-[#3b4e68] px-2 py-3 font-medium">Datos compartidos</th>
                  <th scope="col" className="border-b border-[#3b4e68] px-2 py-3 font-medium">Fecha</th>
                  <th scope="col" className="border-b border-[#3b4e68] px-2 py-3 font-medium">Estado</th>
                  <th scope="col" className="border-b border-[#3b4e68] px-2 py-3 font-medium">Ficha</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((lead) => (
                  <tr key={lead.id}>
                    <td className="border-b border-[#25354b] px-2 py-3 font-bold text-[#f2f7ff]">{lead.name}</td>
                    <td className="border-b border-[#25354b] px-2 py-3 break-all text-[#cbdcef]">
                      {[lead.email, lead.whatsapp].filter(Boolean).join(" · ") || "—"}
                    </td>
                    <td className="border-b border-[#25354b] px-2 py-3 whitespace-nowrap text-[#cbdcef]">{DATE_SHORT.format(new Date(lead.created_at))}</td>
                    <td className="border-b border-[#25354b] px-2 py-3 text-[#cbdcef]">{STATUS_LABEL[lead.follow_up_status]}</td>
                    <td className="border-b border-[#25354b] px-2 py-3">
                      <Link href={`/panel/registros/${lead.id}`} className="inline-flex min-h-[36px] items-center rounded-[7px] border border-[#456181] px-3 text-[12px] text-[#dcecff] no-underline">
                        Ver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
