import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";

import { getPanelViewer } from "@/lib/wefunnels/site";

export const metadata: Metadata = {
  title: "Facturación y compras · WeFunnels",
  robots: { index: false, follow: false },
};

const H1 =
  "m-0 text-[clamp(24px,3.6vw,30px)] font-extrabold tracking-[-0.03em] text-[#F3F7FF]";
const H2 = "m-0 text-[length:var(--wf-h3)] font-semibold text-[#F3F7FF]";
const CARD = "rounded-[14px] border border-[#2D3E57] bg-[#0E192A] p-[clamp(18px,2.6vw,24px)]";
const BODY = "m-0 text-[length:var(--wf-body)] leading-relaxed text-[#B7C7DC]";
const SMALL = "m-0 text-[length:var(--wf-small)] leading-relaxed text-[#8498B4]";
const KEY = "m-0 text-[length:var(--wf-kicker)] tracking-[0.07em] text-[#8498B4] uppercase";
const VALUE = "m-0 mt-1 text-[length:var(--wf-body)] font-semibold text-[#F3F7FF]";

const SUPPORT_EMAIL = "operaciones@wewebinars.com";

const DATE = new Intl.DateTimeFormat("es", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

// Cómo se llaman los tres orígenes de una licencia, en castellano. 'granted'
// es la que regala la plataforma y no pasó por ningún cobro: decirle
// "comprada" a eso sería inventarle una factura.
const SOURCE_LABEL: Record<string, string> = {
  public: "Comprada en la web oficial",
  invited: "Comprada con enlace de distribuidor",
  granted: "Otorgada por WeFunnels, sin cobro",
};

// Facturación y compras, ajustado a lo que WeFunnels de verdad cobra.
//
// Lo que NO hay aquí, a propósito: ni planes, ni suscripción, ni botón de
// cancelar. La licencia Distribuidor es un pago único de por vida, así que
// no hay nada que renovar ni nada que cancelar, y una pantalla que ofreciera
// cualquiera de las dos cosas estaría describiendo un negocio distinto del
// que la persona compró.
//
// Tampoco hay enlace a un portal de cliente de Whop: no existe -- el propio
// lib/whop.ts lo documenta, no hay campo de portal en ninguno de sus tipos.
// El comprobante lo manda Whop por correo. Decir eso es más útil que mandar
// a alguien a una dirección inventada.
export default async function PanelBillingPage() {
  const viewer = await getPanelViewer();
  if (!viewer) redirect("/entrar?next=/panel/cuenta/facturacion");

  const licence = viewer.distributor;
  const source = licence?.license_source ?? null;
  const price = licence?.license_price_usd;
  const starterUntil = licence?.starter_until ? new Date(licence.starter_until) : null;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className={H1}>Facturación y compras</h1>
        <p className="m-0 mt-2 text-[length:var(--wf-body)] leading-relaxed text-[#B7C7DC]">
          Qué tienes contratado y qué has pagado.
        </p>
      </div>

      {licence ? (
        <>
          <section className={`${CARD} flex flex-col gap-5`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h2 className={H2}>Licencia Distribuidor</h2>
              <span className="rounded-full border border-[#43E2EE] px-3 py-1 text-[length:var(--wf-kicker)] font-bold tracking-[0.06em] text-[#8EEFF5] uppercase">
                Activa de por vida
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className={KEY}>Cómo la conseguiste</p>
                <p className={VALUE}>
                  {source ? (SOURCE_LABEL[source] ?? source) : "Registro anterior"}
                </p>
              </div>
              <div>
                <p className={KEY}>Lo que pagaste</p>
                {/* Sin precio es exactamente lo que significa: nadie cobró
                    nada. Es lo que mantiene fuera de los ingresos una
                    licencia regalada (20261007000011), y aquí se dice igual
                    en vez de dibujar un cero que parezca un error. */}
                <p className={VALUE}>
                  {price === null || price === undefined
                    ? "Nada: no hubo cobro"
                    : `$${Number(price).toFixed(0)} · un solo pago`}
                </p>
              </div>
              <div>
                <p className={KEY}>Desde cuándo</p>
                <p className={VALUE}>{DATE.format(new Date(licence.activated_at))}</p>
              </div>
              <div>
                <p className={KEY}>Próximo cobro</p>
                <p className={VALUE}>Ninguno</p>
              </div>
            </div>

            <p className={SMALL}>
              Es un pago único: no hay mensualidad, no se renueva y no hay nada que
              cancelar. Tus derechos no caducan.
            </p>
          </section>

          <section className={`${CARD} flex flex-col gap-3`}>
            <h2 className={H2}>Starter de WeWebinars incluido</h2>
            {starterUntil ? (
              <>
                {/* La fecha y nada más. Decir "activos" o "terminaron"
                    obligaría a comparar con el reloj durante el render, y
                    la fecha ya es el dato: quien la lee sabe si ha pasado. */}
                <p className={BODY}>
                  Tu licencia incluyó 2 meses de Starter de WeWebinars, contados hasta
                  el {DATE.format(starterUntil)}.
                </p>
                <p className={SMALL}>
                  Cuando se acaban no se apaga nada de WeFunnels: tu página, tus
                  registros, tu curso y tu página de regalo son de por vida. Lo que
                  necesita un plan activo de WeWebinars es el beneficio de comisión del
                  20% sobre las suscripciones de tus referidos directos.
                </p>
              </>
            ) : (
              <p className={BODY}>
                Esta licencia no tiene meses de Starter registrados. Si crees que
                debería tenerlos, escríbenos y lo revisamos.
              </p>
            )}
          </section>
        </>
      ) : (
        <section className={`${CARD} flex flex-col gap-4`}>
          <h2 className={H2}>No has pagado nada</h2>
          <p className={BODY}>
            Tu funnel es gratis de por vida: no hay tarjeta, no hay mensualidad y no hay
            ningún cobro asociado a esta cuenta. Nada de lo que usas hoy depende de un
            pago.
          </p>
          <p className={SMALL}>
            Si quieres repartir funnels sin límite y abrir la comisión del 20%, eso es la
            licencia Distribuidor: un pago único, de por vida.
          </p>
          <Link
            href="/panel/distribuidor"
            className="wf-cta inline-flex items-center justify-center self-start rounded-[11px] bg-gradient-to-r from-[#3FE4EC] to-[#83B9FF] px-5 py-3 text-[length:var(--wf-body)] font-bold text-[#051521] no-underline"
          >
            Ver la licencia Distribuidor →
          </Link>
        </section>
      )}

      <section className={`${CARD} flex flex-col gap-3`}>
        <h2 className={H2}>Comprobantes</h2>
        <p className={BODY}>
          Los cobros de WeFunnels los procesa Whop, y es Whop quien manda el comprobante
          por correo a la dirección con la que pagaste, en el momento de la compra.
          Nosotros no emitimos un segundo documento.
        </p>
        <p className={SMALL}>
          Si no lo encuentras o necesitas los datos fiscales en otro formato, escríbenos
          a{" "}
          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Comprobante de WeFunnels")}`}
            className="font-semibold text-[#43E2EE]"
          >
            {SUPPORT_EMAIL}
          </a>{" "}
          desde {viewer.email} y te lo resolvemos a mano.
        </p>
      </section>
    </div>
  );
}
