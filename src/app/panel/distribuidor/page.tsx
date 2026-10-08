import { redirect } from "next/navigation";

import { getPanelViewer } from "@/lib/wefunnels/site";
import { DistributorCheckoutButton } from "./checkout-button";

const CHANGES = [
  "Repartes funnels sin límite — hoy tienes tres invitaciones",
  "Tu sala del curso, en tu dirección y con tu nombre",
  "2 meses de WeWebinars Starter incluidos",
  "20% del plan de cada cuenta que llegue por ti, mientras lo tenga",
];

const DOTS = ["#2BD7F5", "#4F8BFF", "#8B5CF6", "#A855F7"];

export default async function PanelDistributorPage() {
  const viewer = await getPanelViewer();
  if (!viewer) redirect("/login?next=/panel/distribuidor");
  if (!viewer.site) redirect("/panel");
  if (viewer.distributor) redirect("/panel/repartir");

  return (
    <div className="flex max-w-[620px] flex-col gap-6">
      <h1 className="m-0 text-[32px] leading-tight font-extrabold tracking-tight text-balance">
        Reparte funnels con tu nombre
      </h1>

      <div className="flex flex-col gap-4 rounded-2xl border border-[#23233A] bg-[#0D0D15] p-6">
        <span className="text-xs font-semibold tracking-[0.08em] text-[#6E7694] uppercase">
          Qué cambia
        </span>
        {CHANGES.map((change, index) => (
          <div key={change} className="flex items-start gap-3">
            <span
              className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ background: DOTS[index] }}
              aria-hidden="true"
            />
            <span className="text-[16px] leading-snug text-[#D7DCEC]">{change}</span>
          </div>
        ))}
      </div>

      {/* Said as plainly as what they are buying, not in smaller type at the
          bottom. Hidden, every charge on month four is a surprise and a
          refund request; said up front it is one of the reasons the offer
          reads as honest -- and it is true, which no competitor can say. */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#1E4FA8] bg-gradient-to-br from-[#081026] to-[#0D1430] p-6">
        <span className="text-xs font-semibold tracking-[0.08em] text-[#2BD7F5] uppercase">
          Qué no cambia
        </span>
        <span className="text-[16px] leading-snug text-[#D7DCEC]">
          Tu funnel sigue gratis, el curso sigue siendo tuyo, y tu sala no se apaga nunca
          — pagues o no pagues una mensualidad después. Lo único que necesita plan activo
          es cobrar el 20%.
        </span>
      </div>

      <div className="flex flex-wrap items-baseline gap-2.5">
        <span className="text-[26px] font-semibold text-[#6E7694] line-through">$199</span>
        <span className="text-[48px] leading-none font-extrabold tracking-tighter">$99</span>
        <span className="text-[17px] text-[#A9B0C9]">una sola vez, de por vida</span>
      </div>

      {/* Said plainly and up front, like the price. The one condition in the
          whole offer is this one, and burying it would turn month two into
          a surprise and a refund request. */}
      <p className="m-0 text-[15px] leading-relaxed text-[#A9B0C9]">
        Desde el tercer mes, $15 al mes. Repartir funnels y tu sala del curso no dependen
        de eso y no se apagan nunca; el plan activo es lo que mantiene tu 20% corriendo —
        y para entonces ya sabrás si te está entrando.
      </p>

      <DistributorCheckoutButton />
    </div>
  );
}
