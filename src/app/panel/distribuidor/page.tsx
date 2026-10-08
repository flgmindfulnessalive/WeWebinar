import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { getPanelViewer } from "@/lib/wefunnels/site";
import { DistributorCheckoutButton } from "./checkout-button";

// Ser Distribuidor, inside the authenticated panel, which is the only place
// the invitation price may be named: the official web shows 199 and nothing
// else, because 100 is a fact about who invited you and not a public offer.
//
// The figure is not written in this file. wefunnel_license_price decides it
// from the account's own referral rows, and wefunnel_activate_distributor
// checks the same rows again before granting anything -- so a page that
// hardcoded 100 would be claiming an entitlement it cannot confer.
const INCLUDES = [
  "Tu página de regalo para compartir funnels ilimitados.",
  "Panel con analítica y registros de tu propia página.",
  "Tu sala del curso de prospección.",
  "2 meses de Starter de WeWebinars para usar presentaciones grabadas en webinars automatizados.",
  "20% sobre los planes de WeWebinars de tus referidos directos, mensuales o anuales, mientras mantengan su suscripción.",
];

const MONEY = new Intl.NumberFormat("es", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export default async function PanelDistributorPage() {
  const viewer = await getPanelViewer();
  if (!viewer) redirect("/login?next=/panel/distribuidor");
  if (viewer.distributor) redirect("/panel/repartir");

  // No redirect for a missing page. Somebody who bought from the public web
  // has no page yet and this is the screen they came for; the page comes
  // after the payment, because claiming before it would hand out a free
  // funnel to anyone who started a purchase and walked away
  // (20261007000014).

  const supabase = await createClient();
  const { data } = await supabase.rpc("wefunnel_license_price");
  const pricing = data?.[0];
  const invited = pricing?.source === "invited";
  const price = Number(pricing?.price_usd ?? 199);
  const publicPrice = Number(pricing?.public_price_usd ?? 199);

  return (
    <div className="flex max-w-[760px] flex-col gap-6">
      <div>
        <p className="m-0 text-[11px] font-bold tracking-[0.155em] text-[#D8B4FE] uppercase">
          Tu siguiente opción · Distribuidor
        </p>
        <h1 className="m-0 mt-2.5 text-[clamp(26px,4.2vw,36px)] leading-[1.08] font-extrabold tracking-[-0.035em] text-[#F3F7FF] text-balance">
          Abre conversaciones con un regalo.
        </h1>
        <p className="m-0 mt-3 text-[15px] leading-relaxed text-[#B7C7DC]">
          Ofrece a otros constructores un funnel gratuito, su panel y un curso para
          aprender a usarlo.
        </p>
      </div>

      <section className="flex flex-col gap-5 rounded-[16px] border border-[#A855F7] bg-gradient-to-br from-[#0B1230] to-[#1B0C2E] p-[clamp(20px,3vw,30px)]">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0">
            <span className="inline-block rounded-full border border-[#D8B4FE] px-3 py-1 text-[11px] text-[#E9D5FF]">
              {invited ? "Precio por invitación" : "Precio público"}
            </span>
            <p className="m-0 mt-3 text-[clamp(34px,5vw,46px)] leading-none font-extrabold tracking-[-0.04em] text-[#F3F7FF]">
              {MONEY.format(price)}
            </p>
            <p className="m-0 mt-2 text-sm text-[#B7C7DC]">
              Un solo pago · Regalos ilimitados de por vida
            </p>
          </div>
          {invited && (
            <p className="m-0 max-w-[24ch] text-sm leading-relaxed text-[#8498B4]">
              Llegaste por invitación.
              <br />
              Precio público en la web: {MONEY.format(publicPrice)}.
            </p>
          )}
        </div>

        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {INCLUDES.map((item) => (
            <li key={item} className="flex gap-2.5 text-[15px] leading-relaxed text-[#D2DFEF]">
              <span className="shrink-0 text-[#6EE8E5]" aria-hidden="true">
                ✓
              </span>
              <span className="min-w-0">{item}</span>
            </li>
          ))}
        </ul>

        <DistributorCheckoutButton price={MONEY.format(price)} />

        <div className="flex flex-col gap-2 border-t border-[#3B2A5C] pt-4">
          <p className="m-0 text-sm leading-relaxed text-[#B7C7DC]">
            Los 2 meses de Starter son para que pruebes la plataforma. Continuar después es
            opcional: tu licencia Distribuidor, tu funnel y tu sala del curso permanecen
            activos.
          </p>
          <p className="m-0 text-sm leading-relaxed text-[#8498B4]">
            Sin comisión por la licencia Distribuidor. Sin segundo nivel.
          </p>
        </div>
      </section>

      <p className="m-0 text-sm leading-relaxed text-[#8498B4]">
        Puedes seguir usando tu funnel, tu panel y tu curso gratuitos sin activar
        Distribuidor.
      </p>
    </div>
  );
}
