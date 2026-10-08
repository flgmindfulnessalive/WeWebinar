import type { Metadata } from "next";
import { ChartNoAxesCombined, Gift, PanelTop, Play } from "lucide-react";

import {
  Check,
  FaqItem,
  GradientText,
  Kicker,
  Logo,
  PRIMARY_BUTTON,
} from "@/components/wefunnels/brand";
import { WEFUNNELS_HOST, wefunnelAppUrl } from "@/lib/wefunnels/host";
import { privacyUrl, termsUrl } from "@/lib/wefunnels/legal";
import { PUBLIC_PRICE_LABEL } from "@/lib/wefunnels/pricing";

export const metadata: Metadata = {
  title: "WeFunnels — Abre la conversación con un regalo",
  description:
    "Regala funnels profesionales a otros constructores y empieza a prospectar ofreciendo una herramienta útil para su negocio.",
  robots: { index: false, follow: false },
};

// The official WeFunnels website: wefunnels.wewebinars.com/
//
// It sells exactly one thing, the Distributor licence, at the public price.
// It never shows the invitation price and never offers a free funnel: the
// gift is received only through a Distributor's own gift page
// (/<slug>/regalo). The preview on the right is a picture of that page, not
// a working claim button.
const STEPS = [
  {
    n: "01 · COMPARTE",
    title: "Ofrece tu regalo",
    body: "Usa tu página de Distribuidor en contenido, anuncios y conversaciones con otros network marketers.",
  },
  {
    n: "02 · ENTREGA",
    title: "Da una herramienta útil",
    body: "Quien se registra recibe un funnel gratuito, su panel de analítica y registros, y el curso incluido.",
  },
  {
    n: "03 · CONVERSA",
    title: "Conoce qué necesita",
    body: "Da seguimiento a quienes soliciten tu orientación. Descubre sus retos y si tiene sentido conversar sobre tu propuesta.",
  },
];

const FEATURES = [
  { Icon: Gift, title: "Regalos ilimitados de por vida", body: "Comparte tu enlace tantas veces como necesites." },
  { Icon: PanelTop, title: "Tu página personal de regalo", body: "Tu identidad y una oferta clara para tus visitantes." },
  { Icon: ChartNoAxesCombined, title: "Tu panel de analítica y registros", body: "Consulta el rendimiento de tu página y tus propios contactos." },
  { Icon: Play, title: "Tu sala del curso", body: "Contenido, anuncios y la estrategia del regalo para aprender a prospectar." },
];

const INCLUDES = [
  "Funnels ilimitados para regalar de por vida",
  "Tu página personal de regalo",
  "Panel de analítica y tus registros",
  "Tu sala del curso de prospección",
  "2 meses de Starter de WeWebinars",
  "20% en suscripciones mensuales de referidos directos",
];

const SECTION = "border-b border-[#202b3c] px-4 py-12 sm:px-[6%]";
const H2 = "mt-2.5 mb-5 text-[28px] leading-[1.17] font-bold tracking-[-1px] text-[#f3f7ff] sm:text-[32px]";
const P = "text-[15px] leading-relaxed text-[#b7c7dc]";
const NOTE = "text-[13px] leading-relaxed text-[#afc2da]";

export default function WeFunnelsOfficialPage() {
  const buyUrl = wefunnelAppUrl("/wefunnels/distribuidor");

  return (
    <div className="overflow-x-hidden">
      <header className="flex flex-wrap items-center justify-between gap-x-5 gap-y-3 border-b border-[#202a3b] px-4 py-5 sm:px-[5%]">
        <Logo />
        <nav aria-label="Navegación principal" className="flex flex-wrap gap-x-5 gap-y-1 text-[13px]">
          <a href="#como-funciona" className="inline-flex min-h-[44px] items-center text-[#c4d5e9] no-underline hover:text-white">
            Cómo funciona
          </a>
          <a href="#precio" className="inline-flex min-h-[44px] items-center text-[#c4d5e9] no-underline hover:text-white">
            Precio
          </a>
          <a href="#preguntas" className="inline-flex min-h-[44px] items-center text-[#c4d5e9] no-underline hover:text-white">
            Preguntas
          </a>
        </nav>
      </header>

      <main>
        <section className={`${SECTION} wf-glow-right relative isolate pt-14 pb-14`}>
          <div className="wf-lines" aria-hidden="true" />
          <div className="grid items-center gap-10 md:grid-cols-[1.2fr_1fr]">
            <div>
              <Kicker>Para network marketers que construyen equipo</Kicker>
              <h1 className="mt-4 mb-5 text-[40px] leading-[1.06] font-bold tracking-[-1.8px] text-[#f3f7ff] sm:text-[clamp(40px,5.3vw,59px)] sm:tracking-[-2.4px]">
                Abre la conversación
                <br />
                <GradientText>con un regalo.</GradientText>
              </h1>
              <p className="mb-6 max-w-[480px] text-[16px] leading-relaxed text-[#b7c7dc] sm:text-[17px]">
                Regala funnels profesionales a otros constructores y empieza a prospectar ofreciendo
                una herramienta útil para su negocio.
              </p>
              <a href="#precio" className={`${PRIMARY_BUTTON} w-full sm:w-auto`}>
                Quiero ser Distribuidor <span aria-hidden="true">→</span>
              </a>
              <p className={`${NOTE} mt-3`}>
                {PUBLIC_PRICE_LABEL} · Un solo pago
                <br />
                Funnels ilimitados para regalar. De por vida.
              </p>
            </div>

            <div>
              {/* A picture of the page a Distributor shares. The button in it
                  is part of the illustration, not a way to claim anything. */}
              <div
                className="mx-auto max-w-[400px] overflow-hidden rounded-[14px] border border-[#3d4c68] bg-[#0b1423] shadow-[0_20px_65px_#0008] md:max-w-none md:rotate-2"
                role="img"
                aria-label="Vista de ejemplo de la página de regalo de un Distribuidor"
              >
                <div className="bg-[#182237] px-4 py-3 text-[11px] break-all text-[#c1d3e7]">
                  {WEFUNNELS_HOST}/tu-nombre/regalo
                </div>
                <div className="p-7">
                  <div className="flex items-center">
                    <span className="mr-2.5 inline-grid h-[35px] w-[35px] place-items-center rounded-full bg-[#25374e] text-[11px] text-[#77e8ef]">
                      TÚ
                    </span>
                    <span className="text-[12px] text-[#afc2da]">Tu nombre · Tu página de regalo</span>
                  </div>
                  <p className="my-4 text-[28px] leading-[1.15] font-bold tracking-[-0.8px] text-[#f3f7ff]">
                    Te regalo tu funnel.
                    <br />
                    <GradientText>Gratis de por vida.</GradientText>
                  </p>
                  <p className="mb-5 text-[12px] text-[#b7c7dc]">
                    Tu página personal, tu panel de prospectos y un curso para aprender a llevarle
                    tráfico.
                  </p>
                  <div className="rounded-md bg-[#48e0e8] p-2.5 text-center text-[12px] font-bold text-[#051521]">
                    Quiero mi funnel gratis →
                  </div>
                </div>
              </div>
              <p className="mt-4 text-center text-[11px] text-[#b2c5dc]">
                Vista de ejemplo de la página que compartirás como Distribuidor.
              </p>
            </div>
          </div>
        </section>

        <section id="como-funciona" className={`${SECTION} scroll-mt-4`}>
          <Kicker>Una forma concreta de aportar valor</Kicker>
          <h2 className={H2}>
            Un enlace para iniciar.
            <br />
            Una conversación para conocer.
          </h2>
          <div className="grid gap-6 md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n} className="border-t border-[#35465f] pt-4">
                <div className="text-[12px] text-[#76e8ee]">{step.n}</div>
                <h3 className="my-2.5 text-[18px] leading-snug font-bold text-[#f3f7ff]">{step.title}</h3>
                <p className="m-0 text-[14px] leading-relaxed text-[#b7c7dc]">{step.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={SECTION}>
          <div className="grid items-center gap-10 md:grid-cols-[1.2fr_1fr]">
            <div>
              <Kicker>Pensado para tu prospección</Kicker>
              <h2 className={H2}>
                Algo valioso que ofrecer.
                <br />
                Una razón para conversar.
              </h2>
              <blockquote className="my-5 text-[24px] leading-[1.3] tracking-[-0.6px] text-[#eff8ff] sm:text-[27px]">
                “¿Estás buscando nuevas formas de prospectar? Te regalo un funnel y un curso para
                aprender a usarlo.”
                <small className="mt-4 block text-[12px] tracking-normal text-[#a9bfd7]">
                  Ejemplo de apertura para un constructor.
                </small>
              </blockquote>
              <p className={NOTE}>
                Aceptar el regalo no implica interés en cambiar de compañía. La conversación te ayuda
                a conocer a la persona.
              </p>
            </div>
            <div className="rounded-[14px] border border-[#2d3e57] bg-[#0e192a] p-6">
              {FEATURES.map((f) => (
                <div key={f.title} className="my-4 flex items-start gap-3.5">
                  <f.Icon className="mt-0.5 h-5 w-5 shrink-0 text-[#73e5ec]" aria-hidden="true" />
                  <div>
                    <strong className="text-[15px] text-[#f3f7ff]">{f.title}</strong>
                    <p className="mt-1 mb-0 text-[13px] text-[#b7c7dc]">{f.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={`${SECTION} bg-[#091221]`}>
          <Kicker>Parte del ecosistema WeWebinars</Kicker>
          <h2 className={H2}>
            WeFunnels abre la conversación.
            <br />
            WeWebinars te ayuda a presentar.
          </h2>
          <p className={P}>
            Convierte una presentación grabada en un webinar automatizado para que las personas
            conozcan tu propuesta.
          </p>
          <div className="mt-7 grid gap-5 md:grid-cols-2">
            <div className="rounded-[14px] border border-[#2d3e57] bg-[#0e192a] p-6">
              <div className="text-[45px] leading-[1.1] font-bold tracking-[-1px] text-[#72e4ef]">2 meses</div>
              <h3 className="my-2.5 text-[18px] font-bold text-[#f3f7ff]">De Starter incluidos</h3>
              <p className="text-[14px] leading-relaxed text-[#b7c7dc]">
                Prueba WeWebinars con tu presentación. Al terminar los 2 meses, continuar con Starter
                es opcional.
              </p>
              <p className={NOTE}>Tu licencia Distribuidor, tu funnel y tu sala del curso permanecen activos.</p>
            </div>
            <div className="rounded-[14px] border border-[#2d3e57] bg-[#0e192a] p-6">
              <div className="text-[45px] leading-[1.1] font-bold tracking-[-1px] text-[#72e4ef]">20%</div>
              <h3 className="my-2.5 text-[18px] font-bold text-[#f3f7ff]">Sobre suscripciones mensuales</h3>
              <p className="text-[14px] leading-relaxed text-[#b7c7dc]">
                Recibe una comisión por los planes mensuales de WeWebinars de tus referidos directos,
                mientras mantengan su suscripción.
              </p>
              <p className={NOTE}>Sin comisión por vender la licencia Distribuidor. Sin segundo nivel.</p>
            </div>
          </div>
        </section>

        <section
          id="precio"
          className={`${SECTION} scroll-mt-4 bg-[radial-gradient(ellipse_at_95%_70%,#251b4544,transparent_65%),#0b1422]`}
        >
          <div className="grid items-center gap-10 md:grid-cols-[1.2fr_1fr]">
            <div>
              <Kicker>Licencia Distribuidor</Kicker>
              <h2 className={H2}>
                Un solo pago.
                <br />
                Regalos ilimitados.
                <br />
                <GradientText>De por vida.</GradientText>
              </h2>
              <p className={P}>
                Activa tu página de regalo y empieza a compartir una herramienta que otros
                constructores pueden usar en su negocio.
              </p>
              <p className={NOTE}>El tráfico y la publicidad que decidas contratar se pagan por separado.</p>
            </div>
            <div className="rounded-[15px] border border-[#5b87a3] bg-[#0e1929] p-6 shadow-[0_0_35px_#22b5d510] sm:p-7">
              <Kicker>Precio público · USD</Kicker>
              <div className="mt-3.5 mb-1 text-[64px] leading-[1.05] font-bold tracking-[-3px] text-[#f2f8ff]">$199</div>
              <div className={NOTE}>Pago único por la licencia Distribuidor</div>
              <ul className="my-6 list-none p-0 text-[14px] text-[#d2dfef]">
                {INCLUDES.map((item) => (
                  <li key={item} className="my-3">
                    <Check />
                    {item}
                  </li>
                ))}
              </ul>
              <a href={buyUrl} className={`${PRIMARY_BUTTON} w-full`}>
                Activar Distribuidor · $199 <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </section>

        <section id="preguntas" className={`${SECTION} scroll-mt-4`}>
          <div className="mx-auto max-w-[740px]">
            <Kicker>Resolvamos tus dudas</Kicker>
            <h2 className={H2}>Antes de empezar.</h2>
            <FaqItem question="¿Qué estoy comprando?">
              Una licencia Distribuidor de WeFunnels para regalar funnels ilimitados de por vida, con
              tu página de regalo, panel y sala del curso. Incluye 2 meses de Starter de WeWebinars y
              el beneficio de comisión del 20% sobre las suscripciones mensuales de tus referidos
              directos.
            </FaqItem>
            <FaqItem question="¿Puedo reclamar un funnel gratis en esta web?">
              El regalo se recibe exclusivamente a través de la página de un Distribuidor. Esta web
              ofrece la licencia para que tú puedas regalar funnels.
            </FaqItem>
            <FaqItem question="¿Qué reciben las personas a quienes les regalo un funnel?">
              Su funnel personal, un panel con analítica y sus propios registros, y el curso incluido.
              Pueden usarlo gratis sin tener que convertirse en Distribuidores.
            </FaqItem>
            <FaqItem question="¿Necesito seguir pagando WeWebinars?">
              No. Después de los 2 meses incluidos, continuar con Starter es opcional. Tu licencia
              para regalar funnels, tu funnel y tu sala del curso permanecen activos.
            </FaqItem>
            <FaqItem question="¿Veo los prospectos de quienes recibieron mi regalo?">
              No. Cada usuario ve los registros de su propia página. Tu panel no te da acceso a los
              prospectos que ellos capten.
            </FaqItem>
            <FaqItem question="¿WeFunnels consigue prospectos por mí?">
              WeFunnels te da la herramienta y el método. Tú llevas tráfico con contenido, anuncios o
              invitaciones y desarrollas las conversaciones. No garantiza registros, incorporaciones
              ni ingresos.
            </FaqItem>
          </div>
        </section>

        <section className={`${SECTION} bg-[radial-gradient(ellipse_at_50%_100%,#192c4b88,transparent_70%)] text-center`}>
          <h2 className={`${H2} mx-auto max-w-[620px]`}>
            Tu próxima conversación
            <br />
            puede empezar con <GradientText>“te regalo”.</GradientText>
          </h2>
          <a href="#precio" className={`${PRIMARY_BUTTON} w-full sm:w-auto`}>
            Activar mi licencia Distribuidor <span aria-hidden="true">→</span>
          </a>
          <p className={`${NOTE} mt-3`}>{PUBLIC_PRICE_LABEL} · Pago único · Regalos ilimitados de por vida</p>
        </section>
      </main>

      <footer className="flex flex-wrap justify-between gap-4 px-4 py-5 text-[12px] text-[#a8bdd4] sm:px-[6%]">
        <span>WeFunnels · Una solución de WeWebinars</span>
        <span className="flex flex-wrap gap-5">
          <a href={termsUrl()} className="text-[#a8bdd4] underline-offset-4 hover:underline">
            Términos
          </a>
          <a href={privacyUrl()} className="text-[#a8bdd4] underline-offset-4 hover:underline">
            Privacidad
          </a>
          <a href={wefunnelAppUrl("/login?next=/panel")} className="text-[#a8bdd4] underline-offset-4 hover:underline">
            Iniciar sesión
          </a>
        </span>
      </footer>
    </div>
  );
}
