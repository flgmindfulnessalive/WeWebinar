import type { Metadata } from "next";
import Link from "next/link";
import { Gift, PanelTop, ChartNoAxesCombined, Play } from "lucide-react";

import { WEFUNNELS_HOST, wefunnelAppUrl } from "@/lib/wefunnels/host";
import { Wordmark } from "@/components/wefunnels/wordmark";

// The official web. One job: sell the distributor licence at $199.
//
// It does not hand out funnels. The gift is received through a
// distributor's own page and nowhere else, which is what the licence buys
// and the reason this page carries no claim CTA at all -- a public page that
// gave a funnel to whoever scrolled to the bottom would make the person who
// gave it skippable.
//
// Indexable, unlike everything else under /f. The layout turns indexing off
// for the whole tree because thousands of personal funnels under one
// registrable domain is how that domain earns a spam reputation; this page
// is the exception, because it is the only one meant to be found.
export const metadata: Metadata = {
  title: "WeFunnels — regala funnels a otros constructores",
  description:
    "Licencia Distribuidor de WeFunnels: regala funnels profesionales de por vida y abre conversaciones con otros network marketers. 199 dólares, un solo pago.",
  robots: { index: true, follow: true },
};

const BUY_URL = wefunnelAppUrl("/signup?next=/panel/distribuidor");

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
  {
    Icon: Gift,
    title: "Regalos ilimitados de por vida",
    body: "Comparte tu enlace tantas veces como necesites.",
  },
  {
    Icon: PanelTop,
    title: "Tu página personal de regalo",
    body: "Tu identidad y una oferta clara para tus visitantes.",
  },
  {
    Icon: ChartNoAxesCombined,
    title: "Tu panel de analítica y registros",
    body: "Consulta el rendimiento de tu página y tus propios contactos.",
  },
  {
    Icon: Play,
    title: "Tu sala del curso",
    body: "Contenido, anuncios y la estrategia del regalo para aprender a prospectar.",
  },
];

const INCLUDES = [
  "Funnels ilimitados para regalar de por vida",
  "Tu página personal de regalo",
  "Panel de analítica y tus registros",
  "Tu sala del curso de prospección",
  "2 meses de Starter de WeWebinars",
  "20% en suscripciones de referidos directos",
];

// The commission reads "mensual o anual" rather than the package's
// "mensuales": the rate is applied to whatever period the referred account
// actually pays for, which is how wefunnel_commissions computes it.
const QUESTIONS: [string, string][] = [
  [
    "¿Qué estoy comprando?",
    "Una licencia Distribuidor de WeFunnels para regalar funnels ilimitados de por vida, con tu página de regalo, panel y sala del curso. Incluye 2 meses de Starter de WeWebinars y el beneficio de comisión del 20% sobre las suscripciones de tus referidos directos, mensuales o anuales.",
  ],
  [
    "¿Puedo reclamar un funnel gratis en esta web?",
    "El regalo se recibe exclusivamente a través de la página de un distribuidor. Esta web ofrece la licencia para que tú puedas regalar funnels.",
  ],
  [
    "¿Qué reciben las personas a quienes les regalo un funnel?",
    "Su funnel personal, un panel con analítica y sus propios registros, y el curso incluido. Pueden usarlo gratis sin tener que convertirse en distribuidores.",
  ],
  [
    "¿Necesito seguir pagando WeWebinars?",
    "No. Después de los 2 meses incluidos, continuar con Starter es opcional. Tu licencia para regalar funnels, tu funnel y tu sala del curso permanecen activos.",
  ],
  [
    "¿Veo los prospectos de quienes recibieron mi regalo?",
    "No. Cada usuario ve los registros de su propia página. Tu panel no te da acceso a los prospectos que ellos capten.",
  ],
  [
    "¿WeFunnels consigue prospectos por mí?",
    "WeFunnels te da la herramienta y el método. Tú llevas tráfico con contenido, anuncios o invitaciones y desarrollas las conversaciones. No garantiza registros, incorporaciones ni ingresos.",
  ],
];

// A section runs the whole width of the window -- its rule, its background and
// the hero's perspective lines all reach the edge -- and SHELL is the column
// its content sits in. Both numbers are the page's old ones: 1180 including
// the 6% gutters, so nothing below that width moves a pixel.
const SECTION = "border-b border-[#202B3C] py-[clamp(34px,5vw,49px)]";
const SHELL = "mx-auto w-full max-w-[1180px] px-[6%]";
const KICKER = "m-0 text-[11px] font-bold tracking-[0.155em] text-[#70E9EF] uppercase";
const H2 = "m-0 mt-2.5 mb-5 text-[clamp(26px,3.6vw,32px)] leading-[1.17] font-bold tracking-[-0.03em] text-[#F3F7FF] text-balance";
const BODY = "m-0 text-[clamp(13px,1.5vw,15px)] leading-relaxed text-[#B7C7DC]";
const PANEL = "rounded-[14px] border border-[#2D3E57] bg-[#0E192A] p-[clamp(20px,2.6vw,26px)]";
const GRADIENT =
  "bg-gradient-to-r from-[#41E5EC] via-[#83B5FF] to-[#BD8BFF] bg-clip-text text-transparent";
const PRIMARY =
  "inline-flex min-h-[49px] items-center justify-center gap-3.5 rounded-lg bg-gradient-to-r from-[#3FE4EC] to-[#83B9FF] px-[21px] py-3.5 text-[15px] font-bold text-[#071521] no-underline";

export default function WeFunnelsOfficialPage() {
  return (
    <div>
      <header className="border-b border-[#202A3B] py-6">
        <div className={`${SHELL} flex flex-wrap items-center justify-between gap-5`}>
          <Wordmark />
          <nav aria-label="Navegación principal" className="flex flex-wrap gap-[18px]">
            <a href="#como-funciona" className="py-2 text-xs text-[#C4D5E9] no-underline">
              Cómo funciona
            </a>
            <a href="#precio" className="py-2 text-xs text-[#C4D5E9] no-underline">
              Precio
            </a>
            <a href="#preguntas" className="py-2 text-xs text-[#C4D5E9] no-underline">
              Preguntas
            </a>
          </nav>
        </div>
      </header>

      <main>
        {/* Hero. The thin lines in perspective are the package's signature on
            commercial pages: two repeating gradients masked towards the left
            so they fade behind the headline instead of competing with it. */}
        <section
          className={`${SECTION} relative isolate overflow-hidden pt-[clamp(40px,6vw,65px)] pb-[clamp(38px,6vw,58px)]`}
          style={{
            background:
              "radial-gradient(ellipse at 95% 50%, rgba(48,32,90,0.53), transparent 55%)",
          }}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 left-[55%] -z-10"
            style={{
              backgroundImage:
                "repeating-linear-gradient(150deg,transparent 0 80px,rgba(130,102,201,0.33) 81px,transparent 82px 140px),repeating-linear-gradient(90deg,transparent 0 78px,rgba(56,216,235,0.27) 79px,transparent 80px 141px)",
              maskImage: "linear-gradient(90deg,transparent,#000)",
              WebkitMaskImage: "linear-gradient(90deg,transparent,#000)",
            }}
          />
          <div className={SHELL}>
            <div className="grid items-center gap-[38px] lg:grid-cols-[1.2fr_1fr]">
              <div className="min-w-0">
                <p className={KICKER}>Para network marketers que construyen equipo</p>
                <h1 className="m-0 mt-[18px] mb-[22px] text-[clamp(36px,5.3vw,59px)] leading-[1.06] font-extrabold tracking-[-0.042em] text-[#F3F7FF] text-balance">
                  Abre la conversación
                  <br />
                  <span className={GRADIENT}>con un regalo.</span>
                </h1>
                <p className="m-0 mb-6 max-w-[480px] text-[clamp(15px,1.9vw,17px)] leading-relaxed text-[#B7C7DC]">
                  Regala funnels profesionales a otros constructores y empieza a prospectar
                  ofreciendo una herramienta útil para su negocio.
                </p>
                <Link href={BUY_URL} className={`${PRIMARY} w-full sm:w-auto`}>
                  Quiero ser Distribuidor <span aria-hidden="true">→</span>
                </Link>
                <p className="m-0 mt-4 text-xs leading-relaxed text-[#AFC2DA]">
                  199 dólares · Un solo pago
                  <br />
                  Funnels ilimitados para regalar. De por vida.
                </p>
              </div>

              {/* The preview of what a distributor shares. Its gift button is
                  part of the picture, not a way to claim one from here. */}
              <div className="min-w-0">
                <div className="mx-auto max-w-[400px] overflow-hidden rounded-[14px] border border-[#3D4C68] bg-[#0B1423] shadow-[0_20px_65px_rgba(0,0,0,0.53)] lg:max-w-none lg:rotate-2">
                  <p
                    className="m-0 bg-[#182237] px-4 py-3 text-[11px] break-words text-[#C1D3E7]"
                    style={{ fontFamily: "var(--font-wefunnels-mono), ui-monospace, monospace" }}
                  >
                    {WEFUNNELS_HOST}/tu-nombre
                  </p>
                  <div className="p-7">
                    <div className="flex items-center gap-2.5">
                      <span
                        className="grid h-[35px] w-[35px] shrink-0 place-items-center rounded-full bg-[#25374E] text-[11px] font-semibold text-[#77E8EF]"
                        aria-hidden="true"
                      >
                        TÚ
                      </span>
                      <span className="text-xs text-[#AFC2DA]">Tu nombre · Tu página de regalo</span>
                    </div>
                    <p className="m-0 mt-4 mb-4 text-[clamp(22px,3vw,28px)] leading-[1.15] font-bold tracking-[-0.028em] text-[#F3F7FF]">
                      Te regalo tu funnel.
                      <br />
                      <span className={GRADIENT}>Gratis de por vida.</span>
                    </p>
                    <p className="m-0 mb-4 text-xs leading-relaxed text-[#B7C7DC]">
                      Tu página personal, tu panel de prospectos y un curso para aprender a
                      llevarle tráfico.
                    </p>
                    <p
                      className="m-0 rounded-md bg-[#48E0E8] px-3 py-2.5 text-center text-xs font-bold text-[#051521]"
                      aria-hidden="true"
                    >
                      Quiero mi funnel gratis →
                    </p>
                  </div>
                </div>
                <p className="m-0 mt-[17px] text-center text-[11px] text-[#B2C5DC]">
                  Vista de ejemplo de la página que compartirás como Distribuidor.
                </p>
              </div>
          </div>
          </div>
        </section>

        <section className={SECTION} id="como-funciona">
          <div className={SHELL}>
            <p className={KICKER}>Una forma concreta de aportar valor</p>
            <h2 className={H2}>
              Un enlace para iniciar.
              <br />
              Una conversación para conocer.
            </h2>
            <div className="grid gap-[26px] sm:grid-cols-2 lg:grid-cols-3">
              {STEPS.map((step) => (
                <div key={step.n} className="min-w-0 border-t border-[#35465F] pt-[17px]">
                  <p
                    className="m-0 text-xs text-[#76E8EE]"
                    style={{ fontFamily: "var(--font-wefunnels-mono), ui-monospace, monospace" }}
                  >
                    {step.n}
                  </p>
                  <h3 className="m-0 mt-2.5 mb-2 text-[18px] leading-[1.35] font-semibold text-[#F3F7FF]">
                    {step.title}
                  </h3>
                  <p className={BODY}>{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={SECTION}>
          <div className={SHELL}>
            <div className="grid items-center gap-[38px] lg:grid-cols-[1.2fr_1fr]">
              <div className="min-w-0">
                <p className={KICKER}>Pensado para tu prospección</p>
                <h2 className={H2}>
                  Algo valioso que ofrecer.
                  <br />
                  Una razón para conversar.
                </h2>
                <blockquote className="m-0 my-[18px] text-[clamp(21px,2.6vw,27px)] leading-[1.3] tracking-[-0.022em] text-[#EFF8FF]">
                  «¿Estás buscando nuevas formas de prospectar? Te regalo un funnel y un
                  curso para aprender a usarlo.»
                  <footer className="mt-[18px] text-xs tracking-normal text-[#A9BFD7]">
                    Ejemplo de apertura para un constructor.
                  </footer>
                </blockquote>
                <p className="m-0 text-xs leading-relaxed text-[#AFC2DA]">
                  Aceptar el regalo no implica interés en cambiar de compañía. La
                  conversación te ayuda a conocer a la persona.
                </p>
              </div>
              <div className={PANEL}>
                {FEATURES.map(({ Icon, title, body }) => (
                  <div key={title} className="my-[19px] flex items-start gap-3.5 first:mt-0 last:mb-0">
                    <Icon className="mt-0.5 h-[18px] w-[18px] shrink-0 text-[#73E5EC]" aria-hidden="true" />
                    <div className="min-w-0">
                      <strong className="text-sm font-semibold text-[#F3F7FF]">{title}</strong>
                      <p className="m-0 mt-1 text-xs leading-relaxed text-[#B7C7DC]">{body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={`${SECTION} bg-[#091221]`}>
          <div className={SHELL}>
            <p className={KICKER}>Parte del ecosistema WeWebinars</p>
            <h2 className={H2}>
              WeFunnels abre la conversación.
              <br />
              WeWebinars te ayuda a presentar.
            </h2>
            <p className={`${BODY} max-w-[62ch]`}>
              Convierte una presentación grabada en un webinar automatizado para que las
              personas conozcan tu propuesta.
            </p>
            <div className="mt-7 grid gap-5 sm:grid-cols-2">
              <div className={PANEL}>
                <p className="m-0 text-[clamp(34px,4vw,45px)] leading-[1.1] font-bold tracking-[-0.025em] text-[#72E4EF]">
                  2 meses
                </p>
                <h3 className="m-0 mt-2.5 mb-2 text-[18px] font-semibold text-[#F3F7FF]">
                  De Starter incluidos
                </h3>
                <p className={BODY}>
                  Prueba WeWebinars con tu presentación. Al terminar los 2 meses, continuar
                  con Starter es opcional.
                </p>
                <p className="m-0 mt-3 text-xs leading-relaxed text-[#AFC2DA]">
                  Tu licencia Distribuidor, tu funnel y tu sala del curso permanecen activos.
                </p>
              </div>
              <div className={PANEL}>
                <p className="m-0 text-[clamp(34px,4vw,45px)] leading-[1.1] font-bold tracking-[-0.025em] text-[#72E4EF]">
                  20%
                </p>
                <h3 className="m-0 mt-2.5 mb-2 text-[18px] font-semibold text-[#F3F7FF]">
                  Sobre las suscripciones de tus referidos
                </h3>
                <p className={BODY}>
                  Recibe una comisión por los planes de WeWebinars de tus referidos
                  directos, mensuales o anuales, mientras mantengan su suscripción.
                </p>
                <p className="m-0 mt-3 text-xs leading-relaxed text-[#AFC2DA]">
                  Sin comisión por vender la licencia Distribuidor. Sin segundo nivel.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          className={SECTION}
          id="precio"
          style={{
            background:
              "radial-gradient(ellipse at 95% 70%, rgba(37,27,69,0.27), transparent 65%), #0B1422",
          }}
        >
          <div className={SHELL}>
            <div className="grid items-center gap-[38px] lg:grid-cols-[1.2fr_1fr]">
              <div className="min-w-0">
                <p className={KICKER}>Licencia Distribuidor</p>
                <h2 className={H2}>
                  Un solo pago.
                  <br />
                  Regalos ilimitados.
                  <br />
                  <span className={GRADIENT}>De por vida.</span>
                </h2>
                <p className={`${BODY} max-w-[52ch]`}>
                  Activa tu página de regalo y empieza a compartir una herramienta que otros
                  constructores pueden usar en su negocio.
                </p>
                <p className="m-0 mt-4 text-xs leading-relaxed text-[#AFC2DA]">
                  El tráfico y la publicidad que decidas contratar se pagan por separado.
                </p>
              </div>
              <div className="rounded-[15px] border border-[#5B87A3] bg-[#0E1929] p-[clamp(22px,2.8vw,29px)] shadow-[0_0_35px_rgba(34,181,213,0.06)]">
                <p className={KICKER}>Precio público · USD</p>
                <p className="m-0 mt-3.5 mb-1 text-[clamp(48px,7vw,64px)] leading-[1.05] font-bold tracking-[-0.047em] text-[#F2F8FF]">
                  $199
                </p>
                <p className="m-0 text-xs text-[#AFC2DA]">
                  Pago único por la licencia Distribuidor
                </p>
                <ul className="my-[23px] flex list-none flex-col gap-3 p-0">
                  {INCLUDES.map((item) => (
                    <li key={item} className="flex gap-2.5 text-[13px] text-[#D2DFEF]">
                      <span className="text-[#6EE8E5]" aria-hidden="true">
                        ✓
                      </span>
                      <span className="min-w-0">{item}</span>
                    </li>
                  ))}
                </ul>
                <Link href={BUY_URL} className={`${PRIMARY} w-full`}>
                  Activar Distribuidor · $199 <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className={SECTION} id="preguntas">
          <div className={SHELL}>
            <div className="mx-auto max-w-[740px]">
              <p className={KICKER}>Resolvamos tus dudas</p>
              <h2 className={H2}>Antes de empezar.</h2>
              {QUESTIONS.map(([question, answer]) => (
                <details key={question} className="border-b border-[#2C3B51] py-4">
                  <summary className="flex min-h-[32px] cursor-pointer items-center justify-between gap-4 text-sm font-medium text-[#F3F7FF] marker:content-none [&::-webkit-details-marker]:hidden">
                    {question}
                    <span className="shrink-0 text-[#77DFE9]" aria-hidden="true">
                      +
                    </span>
                  </summary>
                  <p className="m-0 mt-2.5 text-[13px] leading-relaxed text-[#B7C7DC]">
                    {answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section
          className={`${SECTION} text-center`}
          style={{
            background:
              "radial-gradient(ellipse at 50% 100%, rgba(25,44,75,0.53), transparent 70%)",
          }}
        >
          <div className={SHELL}>
            <h2 className={`${H2} mx-auto max-w-[620px]`}>
              Tu próxima conversación
              <br />
              puede empezar con <span className={GRADIENT}>«te regalo».</span>
            </h2>
            <Link href={BUY_URL} className={`${PRIMARY} w-full sm:w-auto`}>
              Activar mi licencia Distribuidor <span aria-hidden="true">→</span>
            </Link>
            <p className="m-0 mt-4 text-xs leading-relaxed text-[#AFC2DA]">
              199 dólares · Pago único · Regalos ilimitados de por vida
            </p>
          </div>
        </section>
      </main>

      <footer className="py-5 text-[11px] text-[#A8BDD4]">
        <div className={`${SHELL} flex flex-wrap items-center justify-between gap-4`}>
          <span>WeFunnels · Una solución de WeWebinars</span>
          <div className="flex flex-wrap gap-4">
            <Link href={wefunnelAppUrl("/reglas-wefunnels")} className="text-[#A8BDD4] no-underline">
              Reglas de contenido
            </Link>
            <Link href={wefunnelAppUrl("/terms")} className="text-[#A8BDD4] no-underline">
              Términos
            </Link>
            <Link href={wefunnelAppUrl("/privacy")} className="text-[#A8BDD4] no-underline">
              Privacidad
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
