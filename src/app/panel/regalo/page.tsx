import Link from "next/link";
import { redirect } from "next/navigation";

import { Kicker, SECONDARY_BUTTON } from "@/components/wefunnels/brand";
import { CopyLink } from "@/components/wefunnels/copy-link";
import { createClient } from "@/lib/supabase/server";
import { getPanelViewer } from "@/lib/wefunnels/site";
import { wefunnelGiftUrl } from "@/lib/wefunnels/host";
import { VISIT_DEFINITION } from "@/lib/wefunnels/visits";
import { Card, DATE_LONG, DATE_SHORT, Metric, PeriodPicker, formatConversion, parsePeriod } from "../ui";

type SearchParams = Promise<{ periodo?: string }>;

// The Distributor's own screen: their single public gift link, how it is
// performing, and the people who explicitly asked them for orientation.
// It never lists the prospects of the people they gave funnels to -- each
// page's leads belong to its owner, enforced by RLS.
export default async function PanelGiftPage({ searchParams }: { searchParams: SearchParams }) {
  const viewer = await getPanelViewer();
  if (!viewer) redirect("/login?next=/panel/regalo");
  if (!viewer.isDistributor) redirect("/panel/distribuidor");
  if (!viewer.site) redirect("/panel");

  const site = viewer.site;
  const { periodo } = await searchParams;
  const period = parsePeriod(periodo);
  const supabase = await createClient();

  const [{ data: metrics }, { data: requests }, { data: invitations }] = await Promise.all([
    supabase.rpc("wefunnel_panel_metrics", { p_days: period }),
    supabase
      .from("wefunnel_contact_requests")
      .select("id, name, email, message, created_at")
      .eq("referrer_site_id", site.id)
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.rpc("wefunnel_invitations"),
  ]);

  const gift = metrics?.find((m) => m.page === "gift");
  const visits = Number(gift?.visits ?? 0);
  const claims = Number(gift?.registrations ?? 0);
  const total = Number(invitations?.[0]?.used ?? 0);
  const published = site.status === "published";
  const starterUntil = viewer.distributor?.starter_until ? new Date(viewer.distributor.starter_until) : null;

  return (
    <div>
      <Kicker>Distribuidor</Kicker>
      <h1 className="mt-2 mb-1 text-[29px] font-bold tracking-[-1px]">Mi página de regalo</h1>
      <p className="mt-0 mb-5 text-[15px] text-[#afc1d9]">
        Tu enlace para decir «Te regalo tu funnel». Compártelo en contenido, anuncios y conversaciones.
      </p>

      <Card>
        <strong>Tu enlace de regalo</strong>
        <div className="mt-3 mb-3">
          <CopyLink url={wefunnelGiftUrl(site.slug)} />
        </div>
        {published ? (
          <a href={wefunnelGiftUrl(site.slug)} target="_blank" rel="noopener" className={SECONDARY_BUTTON}>Ver mi página de regalo ↗</a>
        ) : (
          <p className="m-0 text-[13px] text-[#ffd9a8]">
            Se activa cuando publiques tu página.{" "}
            <Link href="/panel/personalizar" className="text-[#83e4ee] underline underline-offset-4">Personalizar y publicar</Link>
          </p>
        )}
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <strong className="text-[15px]">Rendimiento de tu página de regalo</strong>
        <PeriodPicker period={period} basePath="/panel/regalo" />
      </div>
      <div className="mt-4 mb-2 grid grid-cols-3 gap-2 sm:gap-3">
        <Metric label="Visitas" value={String(visits)} hint="Navegadores en tu página de regalo" />
        <Metric label="Funnels regalados" value={String(claims)} hint="Cuentas creadas con tu enlace" />
        <Metric label="Conversión" value={formatConversion(visits, claims)} hint="Regalados / visitas" />
      </div>
      <p className="mt-0 mb-5 text-[12px] text-[#93a9c4]">
        Últimos {period} días. {VISIT_DEFINITION} En total has regalado {total} {total === 1 ? "funnel" : "funnels"}.
      </p>

      <Card>
        <h2 className="mt-0 mb-1 text-[18px] font-bold">Solicitudes de orientación</h2>
        <p className="mt-0 mb-3 text-[13px] text-[#afc1d9]">
          Personas que recibieron tu regalo y te pidieron, desde su panel, que las contactes.
        </p>
        {requests && requests.length > 0 ? (
          <ul className="m-0 list-none p-0">
            {requests.map((r) => (
              <li key={r.id} className="border-b border-[#25354b] py-3 text-[14px]">
                <strong className="text-[#f2f7ff]">{r.name}</strong>{" "}
                <span className="text-[12px] text-[#a5b9d1]">· {DATE_SHORT.format(new Date(r.created_at))}</span>
                <br />
                <a href={`mailto:${r.email}`} className="break-all text-[#83e4ee]">{r.email}</a>
                {r.message && <p className="mt-1 mb-0 text-[13px] whitespace-pre-line text-[#cbdcef]">{r.message}</p>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="m-0 text-[14px] text-[#afc1d9]">Aún no hay solicitudes.</p>
        )}
        <p className="mt-3 mb-0 text-[12px] text-[#a8bfd8]">
          De los funnels que regalaste solo ves cuántos son. Los registros de cada página pertenecen a
          su dueño, igual que los tuyos son solo tuyos.
        </p>
      </Card>

      {starterUntil && (
        <p className="text-[13px] leading-relaxed text-[#a8bfd8]">
          Tus 2 meses de Starter de WeWebinars incluidos van hasta el {DATE_LONG.format(starterUntil)}.
          Continuar con Starter después es opcional: tu licencia Distribuidor, tu funnel y tu sala del
          curso permanecen activos.
        </p>
      )}
    </div>
  );
}
