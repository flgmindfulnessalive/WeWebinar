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

      {/* Nothing in the offer is conditional any more, so this block says
          exactly that and stops. It used to end with "the only thing that
          needs an active plan is collecting the 20%" -- a clause that made
          WeWebinars something you buy in order to be allowed to get paid,
          and that at $3 per referred Starter asked most distributors for
          $15 to collect less than that. */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[#1E4FA8] bg-gradient-to-br from-[#081026] to-[#0D1430] p-6">
        <span className="text-xs font-semibold tracking-[0.08em] text-[#2BD7F5] uppercase">
          Qué no cambia
        </span>
        <span className="text-[16px] leading-snug text-[#D7DCEC]">
          Tu funnel sigue gratis, el curso sigue siendo tuyo, tu sala no se apaga nunca y
          tu 20% se sigue pagando — pagues o no pagues una mensualidad después. No hay
          nada que mantener activo.
        </span>
      </div>

      <div className="flex flex-wrap items-baseline gap-2.5">
        <span className="text-[26px] font-semibold text-[#6E7694] line-through">$199</span>
        <span className="text-[48px] leading-none font-extrabold tracking-tighter">$99</span>
        <span className="text-[17px] text-[#A9B0C9]">una sola vez, de por vida</span>
      </div>

      {/* Still said up front, because a charge on month three that nobody
          mentioned is a refund request. What changed is that it is now an
          offer and not a condition: the two months are a trial of the
          platform, and nothing in the tier stops if they end. */}
      <p className="m-0 text-[15px] leading-relaxed text-[#A9B0C9]">
        Los 2 meses de Starter son para que pruebes la plataforma. Si te sirve, son $15 al
        mes desde el tercero; si no, no pagas nada y no pierdes nada — ni los funnels, ni
        la sala, ni tu 20%.
      </p>

      <DistributorCheckoutButton />
    </div>
  );
}
