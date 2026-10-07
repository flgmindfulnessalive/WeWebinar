import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getPanelViewer } from "@/lib/wefunnels/site";

const DATE = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

// The message the owner opens the chat with. Written from their side, so
// the first thing the lead reads is a person, not a template.
function whatsappLink(number: string, ownerName: string, leadName: string) {
  const first = leadName.split(/\s+/)[0] ?? "";
  const text = `Hola ${first}, soy ${ownerName}. Gracias por dejarme tus datos.`;
  return `https://wa.me/${number.replace(/^\+/, "")}?text=${encodeURIComponent(text)}`;
}

export default async function PanelLeadsPage() {
  const viewer = await getPanelViewer();
  if (!viewer) redirect("/login?next=/panel/registrados");
  if (!viewer.site) redirect("/panel");

  const supabase = await createClient();
  const { data: leads } = await supabase
    .from("wefunnel_leads")
    .select("id, name, whatsapp, email, answer, created_at")
    .eq("site_id", viewer.site.id)
    .order("created_at", { ascending: false })
    .limit(200);

  const rows = leads ?? [];
  const question = viewer.site.question_label ?? "Su respuesta";

  return (
    <div className="flex flex-col gap-5">
      <h1 className="m-0 text-[28px] font-bold tracking-tight">Mis registrados</h1>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-[#23233A] bg-[#0D0D15] p-6">
          <p className="m-0 text-[16px] leading-relaxed text-[#A9B0C9]">
            Todavía no hay nadie en tu lista. Aparecen aquí en cuanto alguien llena tu
            formulario, con todo lo que escribieron.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[#23233A] bg-[#0D0D15]">
          <table className="w-full min-w-[620px] border-collapse text-[15px]">
            <thead>
              <tr className="text-left text-[#6E7694]">
                <th scope="col" className="border-b border-[#1A1A2A] px-5 py-3.5 text-xs font-semibold tracking-[0.08em] uppercase">Fecha</th>
                <th scope="col" className="border-b border-[#1A1A2A] px-5 py-3.5 text-xs font-semibold tracking-[0.08em] uppercase">Nombre</th>
                <th scope="col" className="border-b border-[#1A1A2A] px-5 py-3.5 text-xs font-semibold tracking-[0.08em] uppercase">{question}</th>
                <th scope="col" className="border-b border-[#1A1A2A] px-5 py-3.5 text-xs font-semibold tracking-[0.08em] uppercase">Contacto</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((lead) => (
                <tr key={lead.id}>
                  <td className="border-b border-[#14141F] px-5 py-3.5 whitespace-nowrap text-[#6E7694] tabular-nums">
                    {DATE.format(new Date(lead.created_at))}
                  </td>
                  <td className="border-b border-[#14141F] px-5 py-3.5 font-semibold">{lead.name}</td>
                  <td className="border-b border-[#14141F] px-5 py-3.5 text-[#A9B0C9]">{lead.answer ?? "—"}</td>
                  <td className="border-b border-[#14141F] px-5 py-3.5">
                    {lead.whatsapp ? (
                      <a
                        href={whatsappLink(lead.whatsapp, viewer.site!.display_name, lead.name)}
                        className="inline-block rounded-[9px] bg-gradient-to-br from-[#1E5BF5] to-[#9333EA] px-4 py-2.5 text-sm font-semibold whitespace-nowrap text-white no-underline"
                      >
                        WhatsApp
                      </a>
                    ) : (
                      <span className="text-sm break-all text-[#A9B0C9]">{lead.email ?? "—"}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="m-0 text-sm leading-relaxed text-[#6E7694]">
        El botón de WhatsApp abre el chat con el mensaje escrito. El envío automático de
        correos llega con un plan de WeWebinars.
      </p>
    </div>
  );
}
