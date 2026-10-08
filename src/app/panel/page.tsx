import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { Kicker, PRIMARY_BUTTON, SECONDARY_BUTTON } from "@/components/wefunnels/brand";
import { CopyLink } from "@/components/wefunnels/copy-link";
import { createClient } from "@/lib/supabase/server";
import { firstName, getPanelViewer } from "@/lib/wefunnels/site";
import { wefunnelGiftUrl, wefunnelSiteUrl } from "@/lib/wefunnels/host";
import { REFERRAL_COOKIE, parseTouch } from "@/lib/wefunnels/referral";
import { VISIT_DEFINITION } from "@/lib/wefunnels/visits";
import { INVITATION_PRICE_LABEL, PUBLIC_PRICE_LABEL } from "@/lib/wefunnels/pricing";
import { ClaimForm } from "./claim-form";
import { OrientationRequest } from "./orientation-request";
import {
  Card,
  DATE_LONG,
  DATE_SHORT,
  Metric,
  PeriodPicker,
  STATUS_LABEL,
  Tag,
  formatConversion,
  parsePeriod,
} from "./ui";

type SearchParams = Promise<{ periodo?: string }>;

export default async function PanelHomePage({ searchParams }: { searchParams: SearchParams }) {
  const viewer = await getPanelViewer();
  if (!viewer) redirect("/login?next=/panel");
  const supabase = await createClient();

  // ---------------------------------------------------------- no page yet
  if (!viewer.site) {
    // Someone who signed up through a gift page: their attribution was
    // recorded server-side at signup, and the page is created now, on the
    // first visit after confirming their email. The account and the gift
    // exist before any question about publishing.
    const { data: claimed } = await supabase.rpc("wefunnel_claim_pending");
    if (claimed?.id) redirect("/panel/personalizar?bienvenida=1");

    if (viewer.isDistributor) {
      return (
        <ClaimForm
          title="Crea tu página"
          intro="Elige tu nombre público y tu dirección. Desde ella tendrás tu funnel personal y tu página de regalo. Nada se publica hasta que tú lo decidas."
          defaultName={viewer.fullName ?? ""}
        />
      );
    }

    // The legacy invitation path (an /r/<slug> touch from before this
    // model). Shown only when that invitation is still open -- which now
    // means it belongs to an active Distributor.
    const touch = parseTouch((await cookies()).get(REFERRAL_COOKIE)?.value);
    if (touch) {
      const { data: open } = await supabase.rpc("wefunnel_invitation_open", { p_slug: touch.slug });
      if (open) {
        return (
          <ClaimForm
            title="Crea tu página"
            intro="Tu nombre y tu dirección. Lo demás lo completas después, y nada se publica hasta que tú lo decidas."
            defaultName={viewer.fullName ?? ""}
          />
        );
      }
    }

    return (
      <div className="max-w-[620px]">
        <Kicker>Tu cuenta</Kicker>
        <h1 className="mt-2 mb-3 text-[28px] leading-tight font-bold tracking-[-1px]">Aún no tienes una página</h1>
        <p className="text-[15px] leading-relaxed text-[#afc1d9]">
          El funnel gratuito se recibe a través de la página de regalo de un Distribuidor. Si alguien
          te compartió la suya, ábrela y pulsa «Quiero mi funnel gratis».
        </p>
        <p className="text-[15px] leading-relaxed text-[#afc1d9]">
          Si quieres regalar funnels tú, activa la licencia Distribuidor.
        </p>
        <Link href="/panel/distribuidor" className={PRIMARY_BUTTON}>
          Conocer la licencia Distribuidor
        </Link>
      </div>
    );
  }

  // ------------------------------------------------------------ the panel
  const site = viewer.site;
  const { periodo } = await searchParams;
  const period = parsePeriod(periodo);

  const [{ data: metrics }, { data: latest }, { data: orientation }] = await Promise.all([
    supabase.rpc("wefunnel_panel_metrics", { p_days: period }),
    supabase
      .from("wefunnel_leads")
      .select("id, name, email, created_at, follow_up_status")
      .eq("site_id", site.id)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase.from("wefunnel_contact_requests").select("id, created_at").eq("referred_account_id", site.account_id).maybeSingle(),
  ]);

  const funnel = metrics?.find((m) => m.page === "funnel");
  const gift = metrics?.find((m) => m.page === "gift");
  const visits = Number(funnel?.visits ?? 0);
  const registrations = Number(funnel?.registrations ?? 0);
  const published = site.status === "published";
  const siteUrl = wefunnelSiteUrl(site.slug);
  const offer = viewer.offer;
  const invited = offer?.price_tier === "invitation";

  return (
    <div>
      <div className="mb-6">
        <h1 className="m-0 mb-1 text-[29px] font-bold tracking-[-1px]">Hola, {firstName(viewer)}.</h1>
        <p className="m-0 text-[15px] text-[#afc1d9]">
          {published
            ? "Tu página está activa. Dale seguimiento a las personas que mostraron interés."
            : "Tu página está en borrador. Personalízala y publícala cuando quieras."}
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <strong className="text-[15px]">Rendimiento de tu página</strong>
        <PeriodPicker period={period} basePath="/panel" />
      </div>
      <div className="mt-4 mb-2 grid grid-cols-3 gap-2 sm:gap-3">
        <Metric label="Visitas" value={String(visits)} hint="Navegadores en tu página" />
        <Metric label="Registros" value={String(registrations)} hint="Contactos nuevos" />
        <Metric label="Conversión" value={formatConversion(visits, registrations)} hint="Registros / visitas" />
      </div>
      <p className="mt-0 mb-5 text-[12px] text-[#93a9c4]">
        Últimos {period} días. {VISIT_DEFINITION}
        {funnel?.tracking_since ? ` Medimos visitas desde el ${DATE_LONG.format(new Date(`${funnel.tracking_since}T12:00:00`))}.` : ""}
      </p>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <strong>Tu funnel personal</strong>
          <Tag tone={published ? "ok" : "draft"}>{published ? "Publicado" : "Borrador"}</Tag>
        </div>
        <div className="mt-3 mb-3">
          <CopyLink url={siteUrl} />
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Link href="/panel/personalizar" className={SECONDARY_BUTTON}>Editar mi página</Link>
          <a href={siteUrl} target="_blank" rel="noopener" className={SECONDARY_BUTTON}>Ver mi página ↗</a>
        </div>
        {!published && (
          <p className="mt-3 mb-0 text-[12px] text-[#a8bfd8]">
            Tu página es privada hasta que la publiques. Solo tú puedes verla.
          </p>
        )}
      </Card>

      {viewer.isDistributor && (
        <Card className="bg-[radial-gradient(ellipse_at_100%_0,#34265855,transparent_75%),#101b2c]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <strong>Tu página de regalo</strong>
            <Tag>{published ? "Activa" : "Se activa al publicar tu página"}</Tag>
          </div>
          <div className="mt-3 mb-3">
            <CopyLink url={wefunnelGiftUrl(site.slug)} />
          </div>
          <p className="m-0 text-[13px] text-[#afc1d9]">
            {Number(gift?.visits ?? 0)} visitas y {Number(gift?.registrations ?? 0)} funnels regalados en los
            últimos {period} días. <Link href="/panel/regalo" className="text-[#83e4ee] underline underline-offset-4">Ver detalle</Link>
          </p>
        </Card>
      )}

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="m-0 text-[18px] font-bold">Últimos registros</h2>
          <Link href="/panel/registros" className="text-[13px] text-[#83e4ee] underline underline-offset-4">Ver todos</Link>
        </div>
        {latest && latest.length > 0 ? (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[460px] border-collapse text-[13px]">
              <thead>
                <tr className="text-left text-[11px] text-[#f2f7ff]">
                  <th scope="col" className="border-b border-[#3b4e68] px-2 py-3 font-medium">Persona</th>
                  <th scope="col" className="border-b border-[#3b4e68] px-2 py-3 font-medium">Fecha</th>
                  <th scope="col" className="border-b border-[#3b4e68] px-2 py-3 font-medium">Estado</th>
                  <th scope="col" className="border-b border-[#3b4e68] px-2 py-3 font-medium">Ficha</th>
                </tr>
              </thead>
              <tbody>
                {latest.map((lead) => (
                  <tr key={lead.id}>
                    <td className="border-b border-[#25354b] px-2 py-3 text-[#cbdcef]">
                      <strong className="text-[#f2f7ff]">{lead.name}</strong>
                      {lead.email && <small className="block text-[11px] break-all text-[#a5b9d1]">{lead.email}</small>}
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
        ) : (
          <p className="mt-3 mb-0 text-[14px] text-[#afc1d9]">
            {published
              ? "Todavía no hay registros. Aparecerán aquí en cuanto alguien deje sus datos en tu página."
              : "Cuando publiques tu página, las personas que dejen sus datos aparecerán aquí."}
          </p>
        )}
        <p className="mt-3 mb-0 text-[12px] text-[#a8bfd8]">Personas registradas en tu página. Solo tú accedes a estos contactos.</p>
      </Card>

      <div className="grid gap-x-5 md:grid-cols-2">
        <Card className="bg-[radial-gradient(ellipse_at_95%_0,#35306577,transparent_65%),#111c2d]">
          <div className="mb-2 text-[10px] tracking-[1.1px] text-[#78e8ed] uppercase">Tu curso incluido</div>
          <h2 className="mt-0 mb-2 text-[18px] font-bold">Cómo NUNCA quedarte sin prospectos</h2>
          <p className="mb-4 text-[13px] text-[#a8bfd8]">Aprende a llevar tráfico a tu funnel. Video incluido en WeWebinars.</p>
          <Link href="/panel/curso" className={PRIMARY_BUTTON}>Ver mi curso →</Link>
        </Card>

        {!viewer.isDistributor && (
          <Card className="bg-[radial-gradient(ellipse_at_100%_0,#34265888,transparent_75%),#101b2c]">
            <div className="mb-2 text-[10px] tracking-[1.1px] text-[#78e8ed] uppercase">
              {invited ? "Disponible por tu invitación" : "Licencia Distribuidor"}
            </div>
            <h2 className="mt-0 mb-2 text-[18px] font-bold">Ahora tú puedes regalar funnels.</h2>
            <p className="mb-2 text-[13px] text-[#a8bfd8]">Activa Distribuidor y regala funnels ilimitados de por vida.</p>
            <div className="my-2.5 text-[28px] font-bold tracking-[-1px] text-[#edf9ff]">
              {invited ? INVITATION_PRICE_LABEL : PUBLIC_PRICE_LABEL} <small className="text-[12px] font-normal tracking-normal text-[#b3c9de]">· Pago único</small>
            </div>
            <Link href="/panel/distribuidor" className={SECONDARY_BUTTON}>Conocer los beneficios →</Link>
            <p className="mt-3 mb-0 text-[12px] text-[#a8bfd8]">Opcional. Tu cuenta gratuita sigue activa.</p>
          </Card>
        )}
      </div>

      {!viewer.isDistributor && offer?.referrer_is_distributor && offer.referrer_name && (
        <Card>
          <OrientationRequest
            referrerName={offer.referrer_name}
            alreadyRequested={orientation ? DATE_LONG.format(new Date(orientation.created_at)) : null}
          />
        </Card>
      )}
    </div>
  );
}
