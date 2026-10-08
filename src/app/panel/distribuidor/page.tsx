import Link from "next/link";
import { redirect } from "next/navigation";

import { Kicker } from "@/components/wefunnels/brand";
import { getPanelViewer } from "@/lib/wefunnels/site";
import { INVITATION_PRICE_LABEL, PUBLIC_PRICE_LABEL } from "@/lib/wefunnels/pricing";
import { DistributorCheckoutButton } from "./checkout-button";

// Inside the authenticated experience the invitation price can be shown,
// together with the public one. Which one this person pays is the server's
// decision (wefunnel_my_offer); this page only displays it.
export default async function PanelDistributorPage() {
  const viewer = await getPanelViewer();
  if (!viewer) redirect("/login?next=/panel/distribuidor");
  if (viewer.isDistributor) redirect(viewer.site ? "/panel/regalo" : "/panel");

  const offer = viewer.offer;
  const invited = offer?.price_tier === "invitation";
  const price = invited ? INVITATION_PRICE_LABEL : PUBLIC_PRICE_LABEL;
  const revoked = Boolean(viewer.distributor?.revoked_at);

  return (
    <div className="max-w-[760px]">
      <Kicker>Tu siguiente opción · Distribuidor</Kicker>
      <h1 className="mt-2.5 mb-2 text-[29px] leading-tight font-bold tracking-[-1px]">Abre conversaciones con un regalo.</h1>
      <p className="mt-0 mb-5 text-[15px] text-[#afc1d9]">
        Ofrece a otros constructores un funnel gratuito, su panel y un curso para aprender a usarlo.
      </p>

      {revoked && (
        <p role="status" className="mb-5 rounded-lg border border-[#6b4a2a] bg-[#2a1f14] p-4 text-[14px] text-[#ffd9a8]">
          Tu licencia Distribuidor anterior quedó sin efecto por una devolución o disputa del pago. Puedes
          activarla de nuevo; si crees que es un error, escríbenos.
        </p>
      )}

      <div className="rounded-[11px] border border-[#2b3c54] bg-[radial-gradient(ellipse_at_100%_0,#34265888,transparent_75%),#101b2c] p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-block rounded-[5px] bg-[#193a3c] px-2 py-1 text-[11px] text-[#a0f0df]">
              {invited ? "Precio por invitación" : "Precio público"}
            </span>
            <div className="my-2.5 text-[33px] font-bold tracking-[-1px] text-[#edf9ff]">{price}</div>
            <p className="m-0 text-[13px] text-[#a8bfd8]">Un solo pago · Regalos ilimitados de por vida</p>
          </div>
          {invited && offer?.referrer_name && (
            <p className="m-0 text-[13px] text-[#a8bfd8]">
              Llegaste por {offer.referrer_name}.
              <br />
              Precio público en la web: {PUBLIC_PRICE_LABEL}.
            </p>
          )}
        </div>
        <ul className="my-5 pl-5 text-[14px] text-[#bfd0e4]">
          <li className="my-2">Tu página de regalo para compartir funnels ilimitados.</li>
          <li className="my-2">Panel con analítica y registros de tu propia página.</li>
          <li className="my-2">Tu sala del curso de prospección.</li>
          <li className="my-2">
            <strong className="text-[#e9f2ff]">2 meses de Starter de WeWebinars</strong> para usar presentaciones grabadas en webinars automatizados.
          </li>
          <li className="my-2">
            <strong className="text-[#e9f2ff]">20%</strong> sobre los planes mensuales de WeWebinars de tus referidos directos, mientras mantengan su suscripción.
          </li>
        </ul>
        <DistributorCheckoutButton label={`Activar Distribuidor · ${price}`} />
        <p className="mt-4 mb-1 text-[13px] text-[#a8bfd8]">
          Continuar con Starter después de los 2 meses es opcional. Tu licencia Distribuidor, tu funnel y tu sala del curso permanecen activos.
        </p>
        <p className="m-0 text-[13px] text-[#a8bfd8]">Sin comisión por la licencia Distribuidor. Sin segundo nivel.</p>
      </div>

      <p className="mt-5 text-[13px] text-[#a8bfd8]">
        {viewer.site
          ? "Puedes seguir usando tu funnel, panel y curso gratuitos sin activar Distribuidor."
          : "Después del pago crearás tu página y obtendrás tu enlace de regalo."}{" "}
        <Link href="/panel" className="text-[#83e4ee] underline underline-offset-4">Volver a mi panel</Link>
      </p>
    </div>
  );
}
