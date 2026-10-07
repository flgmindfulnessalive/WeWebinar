import { redirect } from "next/navigation";

import { getPanelViewer } from "@/lib/wefunnels/site";
import { WEFUNNELS_HOST } from "@/lib/wefunnels/host";
import { createClient } from "@/lib/supabase/server";

const MONEY = new Intl.NumberFormat("es", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default async function PanelBadgePage() {
  const viewer = await getPanelViewer();
  if (!viewer) redirect("/login?next=/panel/badge");
  if (!viewer.site) redirect("/panel");

  // Claims, not clicks: the sentence beside this number says "people who
  // clicked your badge and claimed their own funnel", and counting clicks
  // that went nowhere would inflate the one figure this screen uses to
  // argue someone should become a distributor.
  const supabase = await createClient();
  const { data: stats } = await supabase.rpc("wefunnel_referral_stats");
  const arrivals = stats?.[0]?.arrivals ?? 0;
  const paying = stats?.[0]?.paying ?? 0;
  const monthly = Number(stats?.[0]?.monthly_usd ?? 0);

  return (
    <div className="flex flex-col gap-6">
      <h1 className="m-0 text-[28px] font-bold tracking-tight">Mi badge</h1>

      <div className="flex flex-wrap items-stretch gap-5">
        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-2.5 rounded-2xl border border-[#23233A] bg-[#0D0D15] p-6">
          <span className="text-xs font-semibold tracking-[0.08em] text-[#6E7694] uppercase">
            Llegaron desde tu página
          </span>
          <span className="text-[58px] leading-none font-extrabold tracking-tighter text-[#2BD7F5] tabular-nums">
            {arrivals}
          </span>
          <span className="text-[15px] leading-snug text-[#A9B0C9]">
            personas hicieron clic en tu badge y reclamaron su propio funnel
          </span>
        </div>

        <div className="flex min-w-0 flex-[1_1_260px] flex-col gap-3.5 rounded-2xl border border-[#23233A] bg-[#0D0D15] p-6">
          <span className="text-xs font-semibold tracking-[0.08em] text-[#6E7694] uppercase">
            Así se ve al pie de tu página
          </span>
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-[11px] border border-[#23233A] bg-[#050509] px-4 py-3.5">
            <span className="text-[13px] text-[#6E7694]">
              Creado con <span className="text-[#A9B0C9]">WeFunnels</span> — consigue el tuyo
            </span>
            <span className="text-xs text-[#4A5173]">Reportar</span>
          </div>
          <span className="text-sm leading-relaxed text-[#6E7694]">
            Va en todas las páginas y no se puede quitar. Es lo que mantiene la
            herramienta gratis.
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-6 rounded-[18px] border border-[#A855F7] bg-gradient-to-br from-[#0B1230] to-[#1B0C2E] p-7">
        <div className="min-w-0 flex-[999_1_380px]">
          <strong className="text-[25px] leading-snug font-extrabold tracking-tight text-balance">
            {arrivals === 0
              ? "Cuando alguien llegue por tu página, aparecerá aquí"
              : `${arrivals === 1 ? "Esa persona no es tuya" : `Esas ${arrivals} personas no son tuyas`} todavía`}
          </strong>
          <p className="mt-2.5 mb-0 text-[16px] leading-relaxed text-[#A9B0C9]">
            Como distribuidor repartes funnels con tu nombre, y cada persona que llegue
            por ti y contrate un plan te deja 10% todos los meses.
            {paying > 0 && (
              <>
                {" "}
                De las que ya llegaron, {paying} {paying === 1 ? "paga" : "pagan"} un plan
                — serían {MONEY.format(monthly * 0.1)} al mes.
              </>
            )}
          </p>
        </div>
        <span className="flex-none rounded-xl border border-[#23233A] bg-[#0D0D15] px-7 py-4 text-[16px] font-semibold text-[#6E7694]">
          Pronto
        </span>
      </div>

      <p className="m-0 text-sm leading-relaxed text-[#6E7694]">
        Tu página vive en{" "}
        <a
          href={`https://${WEFUNNELS_HOST}/${viewer.site.slug}`}
          className="no-underline"
          style={{ fontFamily: "var(--font-wefunnels-mono), ui-monospace, monospace" }}
        >
          {WEFUNNELS_HOST}/{viewer.site.slug}
        </a>
        . Es el único lugar del panel donde se menciona un pago.
      </p>
    </div>
  );
}
