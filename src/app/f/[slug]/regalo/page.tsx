import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ChartNoAxesCombined, PanelTop, Play } from "lucide-react";

import {
  Avatar,
  FaqItem,
  GradientText,
  Kicker,
  Logo,
  PRIMARY_BUTTON,
} from "@/components/wefunnels/brand";
import { VisitBeacon } from "@/components/wefunnels/visit-beacon";
import { createClient } from "@/lib/supabase/server";
import { WEFUNNELS_HOST, wefunnelAppUrl } from "@/lib/wefunnels/host";
import { privacyUrl, termsUrl } from "@/lib/wefunnels/legal";

type RouteParams = { slug: string };

export const metadata: Metadata = {
  title: "Te regalo tu funnel — WeFunnels",
  robots: { index: false, follow: false, nocache: true },
};

// A Distributor's gift page: wefunnels.wewebinars.com/<slug>/regalo
//
// The one public link a Distributor shares to give the tool away. It exists
// only while the page is published, unsuspended and its account holds an
// active Distributor licence; for anything else the address does not
// exist (a page saying "this person is not a Distributor" would leak
// somebody's billing state to whoever guesses a slug).
//
// It does not sell or explain the Distributor licence: the person learns
// about that later, inside their panel and the course.
const BENEFITS = [
  {
    Icon: PanelTop,
    title: "Tu funnel personal",
    body: "Tu nombre, tu propuesta y tu enlace. Personaliza tu página y compártela desde tus redes, tu contenido o tus conversaciones.",
  },
  {
    Icon: ChartNoAxesCombined,
    title: "Tu panel de prospectos",
    body: "Consulta visitas, registros y conversión. Accede a los datos que tus prospectos compartan en tu página.",
  },
  {
    Icon: Play,
    title: "Tu curso incluido",
    body: "Cómo llevar tráfico con contenido y anuncios, y convertir el interés en conversaciones.",
  },
];

const LESSONS = [
  { n: "01", title: "Atrae con contenido", body: "Habla de los retos reales de construir equipo." },
  { n: "02", title: "Lleva tráfico con anuncios", body: "Prueba tu mensaje y aprende qué genera interés." },
  {
    n: "03",
    title: "Convierte el interés en conversaciones",
    body: "Revisa tus registros, identifica quién mostró interés y da el siguiente paso.",
  },
];

const SECTION = "border-t border-[#1a2638] px-4 py-12 sm:px-[5.5%]";
const H2 = "mt-2 mb-6 text-[28px] leading-[1.2] font-bold tracking-[-1px] text-[#f3f6ff] sm:text-[30px]";

export default async function WeFunnelGiftPage({ params }: { params: Promise<RouteParams> }) {
  const { slug } = await params;
  const supabase = await createClient();

  // Live Distributor gift page or nothing. The function checks published,
  // unsuspended and an active (not revoked) licence in one place.
  const { data: referrerSiteId } = await supabase.rpc("wefunnel_gift_referrer", { p_slug: slug });
  if (!referrerSiteId) notFound();

  const { data: site } = await supabase
    .from("wefunnel_sites")
    .select("slug, display_name, photo_url")
    .eq("id", referrerSiteId)
    .maybeSingle();
  if (!site) notFound();

  const firstName = site.display_name.split(/\s+/)[0] ?? site.display_name;
  const claimUrl = wefunnelAppUrl(`/wefunnels/registro?de=${encodeURIComponent(site.slug)}`);

  const cta = (
    <a href={claimUrl} className={`${PRIMARY_BUTTON} w-full sm:w-auto`}>
      Quiero mi funnel gratis <span aria-hidden="true">→</span>
    </a>
  );

  return (
    <div className="overflow-x-hidden">
      <VisitBeacon slug={site.slug} page="gift" />
      <header className="flex flex-wrap items-center justify-between gap-x-5 gap-y-1 border-b border-[#192235] px-4 py-5 sm:px-[5.5%]">
        <Logo />
        <span className="text-[11px] tracking-[1px] text-[#b6c5db]">POR WEWEBINARS</span>
      </header>

      <main>
        <section className="relative isolate px-4 pt-10 pb-10 sm:px-[5.5%] sm:pt-16 sm:pb-14">
          <div className="wf-lines" aria-hidden="true" />
          <div className="grid items-center gap-9 md:grid-cols-[1.2fr_1fr]">
            <div>
              <Kicker>Para network marketers que construyen equipo</Kicker>
              <h1 className="mt-5 mb-6 text-[42px] leading-[1.04] font-bold tracking-[-1.8px] text-[#f3f6ff] sm:text-[clamp(38px,5.4vw,60px)] sm:tracking-[-2.8px]">
                Te regalo
                <br />
                tu funnel.
                <br />
                <GradientText>Gratis de por vida.</GradientText>
              </h1>
              <p className="mb-7 max-w-[440px] text-[16px] leading-[1.65] text-[#bdcbe0] sm:text-[18px]">
                Tu propia página para atraer prospectos,{" "}
                <strong className="font-medium text-[#e9f1ff]">
                  un panel para ver tus visitas y registros
                </strong>
                , y un curso para aprender a llevarle tráfico.
              </p>
              {cta}
              <p className="mt-3 text-[12px] text-[#b6c5db]">
                Sin tarjeta · Con tu nombre · Con tu propio enlace
              </p>
              <div className="mt-7 flex items-center gap-3">
                <Avatar name={site.display_name} photoUrl={site.photo_url} size={42} />
                <div>
                  <small className="text-[11px] text-[#b6c5db]">Un regalo de</small>
                  <p className="m-0 text-[14px] font-bold text-[#f3f6ff]">{site.display_name}</p>
                </div>
              </div>
            </div>

            <div>
              {/* An illustration of the free personal funnel: a personal
                  proposal and "Quiero más información". It deliberately does
                  not show any way to give funnels away -- a free funnel
                  cannot. */}
              <div
                className="mx-auto max-w-[390px] overflow-hidden rounded-[14px] border border-[#354564] bg-[#0e1625] shadow-[0_24px_75px_#0009] md:max-w-none md:rotate-2"
                role="img"
                aria-label="Ejemplo de tu funnel personal para presentar tu propuesta y captar interesados"
              >
                <div className="flex items-center gap-2.5 border-b border-[#2a3549] bg-[#151e30] px-4 py-3 text-[10px] text-[#acbdd3]">
                  <span className="tracking-[2px] text-[#6f81a0]">● ● ●</span>
                  <span className="break-all">{WEFUNNELS_HOST}/tu-nombre</span>
                </div>
                <div className="bg-[radial-gradient(ellipse_at_100%_10%,#23305870,transparent_65%),#0a1020] px-6 pt-7 pb-6">
                  <div className="mb-5 text-[12px] text-[#b0c7de]">TU NOMBRE · TU PÁGINA</div>
                  <p className="mb-4 text-[29px] leading-[1.15] font-bold tracking-[-0.8px] text-[#f3f6ff]">
                    Tu propuesta.
                    <br />
                    <GradientText>Nuevas conversaciones.</GradientText>
                  </p>
                  <p className="mb-5 text-[12px] text-[#b2c1d5]">
                    Presenta lo que ofreces e invita a las personas interesadas a dar el siguiente
                    paso.
                  </p>
                  <div className="rounded-[5px] bg-[#3de1e9] p-2.5 text-center text-[11px] font-bold text-[#04131d]">
                    Quiero más información →
                  </div>
                  <div className="mt-5 text-center text-[11px] text-[#b6c5db]">
                    Tu foto. Tu mensaje. Tu enlace.
                  </div>
                </div>
                <div className="border-t border-[#27334d] bg-[#111b2b] px-5 py-3 text-[11px] text-[#9fdbdf]">
                  Funnel + panel de prospectos + curso
                </div>
              </div>
              <p className="mt-4 text-center text-[11px] text-[#b6c5db]">
                Ejemplo de tu funnel gratuito para prospectar.
              </p>
            </div>
          </div>
        </section>

        <section className={SECTION}>
          <Kicker>Todo empieza con tu enlace</Kicker>
          <h2 className={H2}>Tu sistema de prospección empieza aquí.</h2>
          <div className="grid gap-5 md:grid-cols-3 md:gap-6">
            {BENEFITS.map(({ Icon, title, body }) => (
              <div
                key={title}
                className="grid grid-cols-[28px_1fr] gap-x-3 gap-y-2 border-t border-[#35445b] pt-4 md:block"
              >
                <Icon className="h-5 w-5 text-[#6fdfeb]" aria-hidden="true" />
                <h3 className="m-0 text-[17px] font-bold text-[#f3f6ff] md:mt-3 md:mb-2">{title}</h3>
                <p className="col-start-2 m-0 text-[14px] leading-relaxed text-[#bdcbe0]">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={`${SECTION} grid items-start gap-8 bg-[#09111e] md:grid-cols-2 md:gap-10`}>
          <div>
            <Kicker>Incluido gratis</Kicker>
            <h2 className={H2}>Cómo NUNCA quedarte sin prospectos.</h2>
            <p className="max-w-[390px] text-[15px] leading-relaxed text-[#bdcbe0]">
              Aprende a alimentar tu funnel con contenido, anuncios y seguimiento: una rutina de
              prospección que puedas poner en práctica.
            </p>
          </div>
          <div>
            {LESSONS.map((lesson) => (
              <div key={lesson.n} className="flex items-start gap-4 border-b border-[#243147] py-3.5">
                <b className="pt-1 text-[11px] text-[#5ee1ec]">{lesson.n}</b>
                <div>
                  <strong className="text-[15px] text-[#f3f6ff]">{lesson.title}</strong>
                  <p className="mt-1 mb-0 text-[13px] text-[#bdcbe0]">{lesson.body}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className={SECTION}>
          <div className="mx-auto max-w-[700px]">
            <Kicker>Claro desde el principio</Kicker>
            <h2 className={H2}>Tu regalo, sin complicaciones.</h2>
            <FaqItem question="¿Qué es un funnel?">
              Es una página con un objetivo concreto: despertar interés y llevar a la persona al
              siguiente paso. Tu funnel personal te ayuda a presentar tu propuesta y captar personas
              interesadas.
            </FaqItem>
            <FaqItem question="¿Qué recibo gratis de por vida?">
              Tu funnel personal, tu panel de analítica y registros, y el curso incluido. No necesitas
              una tarjeta para reclamarlos.
            </FaqItem>
            <FaqItem question="¿Tendré que pagar después?">
              No. Tu funnel, tu panel y el curso incluido siguen siendo gratuitos. Si más adelante
              eliges funciones de pago, será opcional. No necesitas contratarlas para mantener activa
              tu cuenta.
            </FaqItem>
            <FaqItem question="¿Dónde veo a las personas que se registran?">
              En tu panel. Allí podrás consultar la analítica de tu página y los datos que cada
              persona haya compartido contigo al registrarse. Cada usuario accede únicamente a los
              registros de su propia página.
            </FaqItem>
            <FaqItem question="¿Tengo que saber diseñar o programar?">
              No. Partes de una página preparada, añades tu nombre y tu presentación, revisas cómo se
              ve y decides cuándo publicarla.
            </FaqItem>
            <FaqItem question="¿Debo unirme a otro negocio para recibirlo?">
              No. Puedes recibir tu funnel y aprender a usarlo para tu prospección actual. Si quieres
              orientación de {firstName}, podrás solicitarla después desde tu panel.
            </FaqItem>
            <FaqItem question="¿También son gratis los anuncios?">
              El curso está incluido. Si decides usar publicidad, el presupuesto de anuncios lo
              defines y pagas tú. También aprenderás a atraer tráfico con contenido.
            </FaqItem>
          </div>
        </section>

        <section className="bg-[radial-gradient(ellipse_at_50%_100%,#17274980,transparent_75%)] px-6 py-12 text-center">
          <h2 className="mx-auto mb-5 max-w-[620px] text-[28px] leading-[1.2] font-bold tracking-[-1px] text-[#f3f6ff] sm:text-[31px]">
            Tu funnel está aquí.
            <br />
            Empieza a usarlo en tu negocio.
          </h2>
          {cta}
          <p className="mt-3 text-[12px] text-[#b6c5db]">
            Crea tu cuenta. Personaliza tu página. Comparte tu enlace.
          </p>
        </section>
      </main>

      <footer className="flex flex-wrap justify-between gap-4 border-t border-[#1d2a40] px-4 py-5 text-[12px] text-[#b6c5db] sm:px-[5.5%]">
        <span>
          <strong>WeFunnels</strong> · Una solución de WeWebinars
        </span>
        <span className="flex flex-wrap gap-5">
          <a href={termsUrl()} className="text-[#b6c5db] underline-offset-4 hover:underline">Términos</a>
          <a href={privacyUrl()} className="text-[#b6c5db] underline-offset-4 hover:underline">Privacidad</a>
          <a href={`/reportar?p=${encodeURIComponent(site.slug)}`} className="text-[#8e9fb8] underline-offset-4 hover:underline">
            Reportar
          </a>
        </span>
      </footer>
    </div>
  );
}
