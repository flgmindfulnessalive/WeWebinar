import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { SECONDARY_BUTTON } from "@/components/wefunnels/brand";
import { createClient } from "@/lib/supabase/server";
import { getPanelViewer } from "@/lib/wefunnels/site";
import { setLeadStatus } from "@/lib/actions/wefunnel-site";
import { Card, DATE_LONG, STATUS_LABEL, STATUS_ORDER } from "../../ui";

// A lead's file: what they shared, when, and where the follow-up stands.
// Only the owner of the page can open it (RLS returns nothing otherwise,
// which reads as not found).
export default async function PanelLeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getPanelViewer();
  if (!viewer) redirect("/login?next=/panel/registros");
  if (!viewer.site) redirect("/panel");
  const { id } = await params;

  const supabase = await createClient();
  const { data: lead } = await supabase
    .from("wefunnel_leads")
    .select("id, site_id, name, email, whatsapp, answer, created_at, follow_up_status, follow_up_updated_at, source")
    .eq("id", id)
    .eq("site_id", viewer.site.id)
    .maybeSingle();
  if (!lead) notFound();

  const first = lead.name.split(/\s+/)[0] ?? lead.name;
  const waText = `Hola ${first}, soy ${viewer.site.display_name}. Gracias por dejarme tus datos.`;
  const waUrl = lead.whatsapp ? `https://wa.me/${lead.whatsapp.replace(/^\+/, "")}?text=${encodeURIComponent(waText)}` : null;

  return (
    <div className="max-w-[680px]">
      <Link href="/panel/registros" className="text-[13px] text-[#83e4ee] underline underline-offset-4">← Mis registros</Link>
      <h1 className="mt-4 mb-1 text-[27px] font-bold tracking-[-1px]">{lead.name}</h1>
      <p className="mt-0 mb-5 text-[14px] text-[#afc1d9]">
        {lead.source === "course"
          ? "Se registró al curso desde tu antigua sala."
          : "Solicitó más información sobre tu propuesta desde tu funnel."}{" "}
        {DATE_LONG.format(new Date(lead.created_at))}.
      </p>

      <Card>
        <h2 className="mt-0 mb-3 text-[16px] font-bold">Datos compartidos</h2>
        <dl className="m-0 grid grid-cols-[110px_1fr] gap-x-3 gap-y-2.5 text-[14px]">
          <dt className="text-[#a8bfd8]">Email</dt>
          <dd className="m-0 break-all">{lead.email ? <a href={`mailto:${lead.email}`} className="text-[#83e4ee]">{lead.email}</a> : "—"}</dd>
          <dt className="text-[#a8bfd8]">WhatsApp</dt>
          <dd className="m-0">{lead.whatsapp ?? "—"}</dd>
          {lead.answer && (
            <>
              <dt className="text-[#a8bfd8]">{viewer.site.question_label ?? "Respuesta"}</dt>
              <dd className="m-0 whitespace-pre-line">{lead.answer}</dd>
            </>
          )}
        </dl>
        {waUrl && (
          <a href={waUrl} target="_blank" rel="noopener" className={`${SECONDARY_BUTTON} mt-4`}>
            Escribir por WhatsApp ↗
          </a>
        )}
      </Card>

      <Card>
        <form action={setLeadStatus}>
          <input type="hidden" name="leadId" value={lead.id} />
          <label htmlFor="lead-status" className="mb-1.5 block text-[13px] text-[#e2edfc]">Estado del seguimiento</label>
          <div className="flex flex-wrap gap-2.5">
            <select id="lead-status" name="status" defaultValue={lead.follow_up_status} className="min-h-[44px] min-w-[200px] rounded-[7px] border border-[#425d79] bg-[#081421] px-3 text-[14px] text-[#e7f6ff]">
              {STATUS_ORDER.map((s) => (
                <option key={s} value={s}>{STATUS_LABEL[s]}</option>
              ))}
            </select>
            <button type="submit" className={SECONDARY_BUTTON}>Guardar estado</button>
          </div>
          <p className="mt-2 mb-0 text-[12px] text-[#a8bfd8]">
            Estado actual: {STATUS_LABEL[lead.follow_up_status]}
            {lead.follow_up_updated_at ? ` · actualizado el ${DATE_LONG.format(new Date(lead.follow_up_updated_at))}` : ""}
          </p>
        </form>
      </Card>
    </div>
  );
}
