import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { PanelTop, Play, ChartNoAxesCombined } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WEFUNNELS_HOST } from "@/lib/wefunnels/host";
import { courseTemplateWebinarId } from "@/lib/wefunnels/course-room";
import { CountVisit } from "@/components/wefunnels/count-visit";
import { HeroGrid } from "@/components/wefunnels/hero-grid";
import { Reveal } from "@/components/wefunnels/reveal";
import { BackToTop } from "@/components/wefunnels/back-to-top";

type RouteParams = { slug: string };

export const metadata: Metadata = {
  robots: { index: false, follow: false, nocache: true },
};

// A distributor's gift page: wefunnels.wewebinars.com/<slug>/regalo.
//
// The single public link the licence buys. It explains the gift and hands
// it over, so a distributor never has to share one link for the offer and
// another for how to claim it.
//
// It does not sell the distributor tier. Someone arriving here is being
// given something; learning they could also buy a licence belongs in their
// panel and in the course, after they have a funnel of their own.
//
// Only resolves for an account that holds the licence. For everyone else
// the address does not exist, which is the honest answer: a page that said
// "this person is not a distributor" would leak somebody else's billing
// state to anyone who guessed a slug.
const BENEFITS = [
  {
    Icon: PanelTop,
    title: "Tu funnel personal",
    body: "Personaliza tu página y compártela desde tus redes, tu contenido o tus conversaciones.",
  },
  {
    Icon: Play,
    title: "Tu curso incluido",
    body: "Aprende a generar tráfico y convertir el interés en conversaciones con otros network marketers.",
  },
  {
    Icon: ChartNoAxesCombined,
    title: "Tu panel de prospectos",
    body: "Consulta visitas, registros y conversión. Accede a los datos que tus prospectos compartan en tu página.",
  },
];

const LESSONS = [
  {
    n: "01",
    title: "Atrae con contenido",
    body: "Habla de los retos reales de construir equipo.",
  },
  {
    n: "02",
    title: "Lleva tráfico con anuncios",
    body: "Prueba tu mensaje y aprende qué genera interés.",
  },
  {
    n: "03",
    title: "Convierte el interés en conversaciones",
    body: "Revisa tus registros, identifica quién mostró interés y da el siguiente paso.",
  },
];

function questions(name: string): [string, string][] {
  return [
    [
      "¿Qué es un funnel?",
      "Es una página con un objetivo concreto: despertar interés y llevar a la persona al siguiente paso. Tu funnel personal te ayuda a presentar tu propuesta y captar personas interesadas.",
    ],
    [
      "¿Qué recibo gratis de por vida?",
      "Tu funnel personal, tu panel de analítica y registros, y el curso incluido. No necesitas una tarjeta para reclamarlos.",
    ],
    [
      "¿Tendré que pagar después?",
      "No. Tu funnel, tu panel y el curso incluido siguen siendo gratuitos. Si más adelante eliges funciones de pago, será opcional. No necesitas contratarlas para mantener activa tu cuenta.",
    ],
    [
      "¿Dónde veo a las personas que se registran?",
      "En tu panel. Allí podrás consultar la analítica de tu página y los datos que cada persona haya compartido contigo al registrarse. Cada usuario accede únicamente a los registros de su propia página.",
    ],
    [
      "¿Tengo que saber diseñar o programar?",
      "No. Partes de una página preparada, añades tu nombre y tu presentación, revisas cómo se ve y decides cuándo publicarla.",
    ],
    [
      "¿Debo unirme a otro negocio para recibirlo?",
      `No. Puedes recibir tu funnel y aprender a usarlo para tu prospección actual. Si quieres orientación de ${name}, podrás solicitarla después.`,
    ],
    [
      "¿También son gratis los anuncios?",
      "El curso está incluido. Si decides usar publicidad, el presupuesto de anuncios lo defines y pagas tú. También aprenderás a atraer tráfico con contenido.",
    ],
  ];
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

// La banda ocupa la ventana y SHELL es la columna donde vive el contenido,
// igual que en la web oficial. Un escalón por debajo de ella en tamaños: esta
// es la página personal de alguien, y un titular que grite igual que el de
// una página de venta se come su foto y su nombre.
const SECTION = "border-t border-[#1B2538] py-[clamp(40px,5.5vw,66px)]";
const SHELL = "mx-auto w-full max-w-[1180px] px-[clamp(20px,5vw,34px)]";
const LABEL =
  "m-0 text-[length:var(--wf-kicker)] font-bold tracking-[0.17em] text-[#70E9EF] uppercase";
const H2 =
  "m-0 mt-3 mb-5 text-[clamp(26px,3.5vw,38px)] leading-[1.12] font-bold tracking-[-0.03em] text-[#F3F7FF] text-balance";
const BODY = "m-0 text-[length:var(--wf-body)] leading-relaxed text-[#C1D1E6]";
const SMALL = "m-0 text-[length:var(--wf-small)] leading-relaxed text-[#9FB3CD]";
const GRADIENT =
  "bg-gradient-to-r from-[#41E5EC] via-[#83B5FF] to-[#BD8BFF] bg-clip-text text-transparent";
const CTA =
  "wf-cta inline-flex min-h-[54px] w-full items-center justify-center gap-3.5 rounded-xl bg-gradient-to-r from-[#3FE4EC] to-[#83B9FF] px-7 py-4 text-[length:var(--wf-lead)] font-bold text-[#071521] no-underline sm:w-auto";

export default async function WeFunnelGiftPage({
  params,
}: {
  params: Promise<RouteParams>;
}) {
  const { slug } = await params;

  // Same anonymous read as the funnel page: RLS hands back the row only
  // when it is published and unsuspended, so a draft or a suspended page
  // cannot be used as a distribution front.
  const supabase = await createClient();
  const { data: site } = await supabase
    .from("wefunnel_sites")
    .select("id, slug, account_id, display_name, location, photo_url, description")
    .eq("slug", slug)
    .maybeSingle();

  if (!site) notFound();

  // The entitlement. Service role: wefunnel_distributors is readable only
  // by its own account, and a visitor is nobody here.
  const admin = createAdminClient();
  const { data: distributor } = await admin
    .from("wefunnel_distributors")
    .select("account_id")
    .eq("account_id", site.account_id)
    .maybeSingle();

  if (!distributor) notFound();

  // Null only while the course has not been recorded, which the copy below
  // reads as "coming" rather than as a failure -- the claim is the
  // conversion either way.
  const hasCourse = Boolean(courseTemplateWebinarId());
  // The approved registration screen, on this same host: no change of
  // address and no change of branding in the middle of accepting a gift.
  const claimUrl = "/registro";
  const faq = questions(site.display_name);

  return (
    <div>
      <CountVisit slug={site.slug} surface="gift" />
      <Reveal />
      {/* La página es larga y su CTA vive arriba del todo: sin esto, quien
          llega al final solo puede volver arrastrando. */}
      <BackToTop />

      {/* La cabecera es de quien regala, no de la marca. Aquí estaba el
          logotipo de WeFunnels, y con él la página se leía como una página
          de producto que alguien reenvió en vez de como el regalo de una
          persona concreta. La marca baja al pie, que es donde una
          herramienta se nombra sin disputarle el sitio a su dueño.

          Un <img> y no next/image: la foto la sube cada distribuidor y vive
          en el almacenamiento de Supabase, que no está declarado en
          remotePatterns. Añadir un host remoto al config para una foto de 44
          píxeles es más superficie de la que el caso pide. */}
      <header className="border-b border-[#202A3B] py-5">
        <div className={`${SHELL} flex flex-wrap items-center justify-between gap-4`}>
          <div className="flex min-w-0 items-center gap-3">
            {site.photo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={site.photo_url}
                alt=""
                width={44}
                height={44}
                className="h-11 w-11 shrink-0 rounded-full border border-[#2D3E57] object-cover"
              />
            ) : (
              <span
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#1E5BF5] to-[#9333EA] text-sm font-bold text-white"
                aria-hidden="true"
              >
                {initials(site.display_name)}
              </span>
            )}
            <div className="min-w-0">
              <p className="m-0 text-[length:var(--wf-body)] font-semibold text-[#F3F7FF]">
                {site.display_name}
              </p>
              {site.location && (
                <p className="m-0 text-[length:var(--wf-small)] text-[#8498B4]">
                  {site.location}
                </p>
              )}
            </div>
          </div>
          <span className="text-[length:var(--wf-kicker)] font-bold tracking-[0.14em] text-[#8498B4] uppercase">
            Un regalo para ti
          </span>
        </div>
      </header>

      <main>
        <section
          className="relative isolate overflow-hidden pt-[clamp(38px,5.5vw,64px)] pb-[clamp(36px,5vw,56px)]"
          style={{
            background:
              "radial-gradient(ellipse at 92% 40%, rgba(48,32,90,0.5), transparent 58%)",
          }}
        >
          <HeroGrid className="wf-grid--soft" />
          <div className={`${SHELL} grid items-center gap-[clamp(28px,4vw,40px)] lg:grid-cols-[1.1fr_1fr]`}>
            <div className="min-w-0">
              <p className={LABEL}>Para network marketers que construyen equipo</p>
              <h1 className="m-0 mt-5 mb-6 text-[clamp(38px,5.4vw,62px)] leading-[1.03] font-extrabold tracking-[-0.044em] text-[#F3F7FF] text-balance">
                Te regalo
                <br />
                tu funnel.
                <br />
                <span className={GRADIENT}>Gratis de por vida.</span>
              </h1>
              <p className="m-0 mb-7 max-w-[42ch] text-[length:var(--wf-lead)] leading-[1.6] text-[#C1D1E6]">
                Tu propia página para atraer prospectos,{" "}
                <strong className="font-semibold text-[#E4EEFB]">
                  un panel para ver tus visitas y registros
                </strong>
                , y un curso para aprender a llevarle tráfico.
              </p>
              <Link href={claimUrl} className={CTA}>
                Quiero mi funnel gratis <span aria-hidden="true">→</span>
              </Link>
              <p className={`${SMALL} mt-4`}>
                Sin tarjeta · Con tu nombre · Con tu propio enlace
              </p>

              {/* La ficha de quien regala vivía aquí; ahora es la cabecera.
                  En su sitio van sus propias palabras, que es lo único de
                  esta página que no se repite en las de los demás. Si no
                  escribió ninguna no va nada: la cabecera ya dice quién es,
                  y un hueco con texto de relleno diría menos. */}
              {site.description && (
                <blockquote className="m-0 mt-7 border-l-2 border-[#2D5F7A] pl-4 text-[length:var(--wf-body)] leading-relaxed text-[#C1D1E6] italic">
                  {site.description}
                </blockquote>
              )}
            </div>

            {/* What the free funnel looks like: a personal proposal with a
                "quiero más información" CTA. Deliberately not showing that
                its owner could also gift funnels -- that is the licence, and
                this page is not selling it. */}
            <div className="min-w-0">
              <div
                className="mx-auto max-w-[400px] overflow-hidden rounded-[14px] border border-[#3D4C68] bg-[#0B1423] shadow-[0_20px_65px_rgba(0,0,0,0.5)] lg:max-w-none"
                role="img"
                aria-label="Ejemplo de tu funnel personal para presentar tu propuesta y captar interesados"
              >
                <p
                  className="m-0 flex flex-wrap items-center gap-2.5 bg-[#182237] px-4 py-3 text-[11px] break-words text-[#C1D3E7]"
                  style={{ fontFamily: "var(--font-wefunnels-mono), ui-monospace, monospace" }}
                >
                  <span className="text-[#5E7290]" aria-hidden="true">
                    ● ● ●
                  </span>
                  <span>{WEFUNNELS_HOST}/tu-nombre</span>
                </p>
                <div className="p-6">
                  <p className="m-0 text-[10px] tracking-[0.12em] text-[#8498B4] uppercase">
                    Tu nombre · Tu página
                  </p>
                  <p className="m-0 mt-3 mb-3 text-[clamp(21px,2.8vw,26px)] leading-[1.15] font-bold tracking-[-0.028em] text-[#F3F7FF]">
                    Tu propuesta.
                    <br />
                    <span className={GRADIENT}>Nuevas conversaciones.</span>
                  </p>
                  <p className="m-0 mb-4 text-xs leading-relaxed text-[#B7C7DC]">
                    Presenta lo que ofreces e invita a las personas interesadas a dar el
                    siguiente paso.
                  </p>
                  <p
                    className="m-0 rounded-md bg-[#48E0E8] px-3 py-2.5 text-center text-xs font-bold text-[#051521]"
                    aria-hidden="true"
                  >
                    Quiero más información →
                  </p>
                  <p className="m-0 mt-3 text-center text-[11px] text-[#8498B4]">
                    Tu foto. Tu mensaje. Tu enlace.
                  </p>
                </div>
                <p className="m-0 border-t border-[#1F2A3C] bg-[#091221] px-4 py-3 text-center text-[11px] text-[#8498B4]">
                  Funnel + panel de prospectos + curso
                </p>
              </div>
              <p className="m-0 mt-4 text-center text-[11px] text-[#B2C5DC]">
                Ejemplo de tu funnel gratuito para prospectar.
              </p>
            </div>
          </div>
        </section>

        <section className={SECTION}>
          <div data-reveal className={SHELL}>
            <p className={LABEL}>Todo empieza con tu enlace</p>
            <h2 className={H2}>Tu sistema de prospección empieza aquí.</h2>
            <div className="grid gap-[26px] sm:grid-cols-2 lg:grid-cols-3">
              {BENEFITS.map(({ Icon, title, body }) => (
                <div key={title} className="min-w-0">
                  <Icon className="h-7 w-7 text-[#73E5EC]" aria-hidden="true" />
                  <h3 className="m-0 mt-3.5 mb-2 text-[length:var(--wf-h3)] leading-[1.3] font-semibold text-[#F3F7FF]">
                    {title}
                  </h3>
                  <p className={BODY}>{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className={`${SECTION} bg-[#091221]`}>
          <div data-reveal className={SHELL}>
            <div className="grid gap-[clamp(26px,4vw,38px)] lg:grid-cols-[1fr_1.1fr]">
              <div className="min-w-0">
                <p className={LABEL}>Incluido gratis</p>
                <h2 className={H2}>Cómo NUNCA quedarte sin prospectos.</h2>
                <p className={BODY}>
                  Aprende a alimentar tu funnel con una rutina de prospección que puedas
                  poner en práctica.
                </p>
                {!hasCourse && (
                  <p className="m-0 mt-4 text-xs leading-relaxed text-[#AFC2DA]">
                    El curso abre en unos días y te avisamos por correo. Reclama tu funnel
                    ahora: ya es tuyo desde hoy.
                  </p>
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-4">
                {LESSONS.map((lesson) => (
                  <div
                    key={lesson.n}
                    className="wf-card flex min-w-0 items-start gap-4 rounded-[14px] border border-[#2D3E57] bg-[#0E192A] p-5"
                  >
                    <span
                      className="text-sm font-semibold text-[#76E8EE]"
                      style={{ fontFamily: "var(--font-wefunnels-mono), ui-monospace, monospace" }}
                      aria-hidden="true"
                    >
                      {lesson.n}
                    </span>
                    <div className="min-w-0">
                      <strong className="text-[15px] font-semibold text-[#F3F7FF]">
                        {lesson.title}
                      </strong>
                      <p className="m-0 mt-1 text-[13px] leading-relaxed text-[#B7C7DC]">
                        {lesson.body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className={SECTION}>
          <div data-reveal className={SHELL}>
            <div className="mx-auto max-w-[740px]">
              <p className={LABEL}>Claro desde el principio</p>
              <h2 className={H2}>Tu regalo, sin complicaciones.</h2>
              {faq.map(([question, answer]) => (
                <details key={question} className="border-b border-[#2C3B51] py-4">
                  <summary className="flex min-h-[44px] cursor-pointer items-center justify-between gap-4 text-sm font-medium text-[#F3F7FF] marker:content-none [&::-webkit-details-marker]:hidden">
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
              "radial-gradient(ellipse at 50% 100%, rgba(25,44,75,0.5), transparent 70%)",
          }}
        >
          <h2 className={`${H2} mx-auto max-w-[560px]`}>
            Tu funnel está aquí.
            <br />
            Empieza a usarlo en tu negocio.
          </h2>
          <Link href={claimUrl} className={CTA}>
            Quiero mi funnel gratis <span aria-hidden="true">→</span>
          </Link>
          <p className="m-0 mt-3.5 text-xs text-[#AFC2DA]">
            Crea tu cuenta. Personaliza tu página. Comparte tu enlace.
          </p>
        </section>
      </main>

      <footer className="border-t border-[#1B2538] py-6 text-[length:var(--wf-small)] text-[#8498B4]">
        <div className={`${SHELL} flex flex-wrap items-center justify-between gap-3`}>
          <span>
            Tu funnel funciona con{" "}
            <strong className="font-semibold text-[#B7C7DC]">WeFunnels</strong>
          </span>
          <div className="flex flex-wrap gap-4">
            <Link href={`/${site.slug}`} className="text-[#8498B4] no-underline">
              La página de {site.display_name}
            </Link>
            {/* The only way a visitor can flag an abusive page, and the whole
                shared-domain reputation posture depends on it being on every
                page (20261007000001). */}
            <Link
              href={`/reportar?p=${encodeURIComponent(site.slug)}`}
              className="text-[#6E7C96] no-underline"
            >
              Reportar
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
