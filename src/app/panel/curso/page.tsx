import { redirect } from "next/navigation";
import { Play } from "lucide-react";

import { Avatar, FaqItem, GradientText, Kicker } from "@/components/wefunnels/brand";
import { getPanelViewer } from "@/lib/wefunnels/site";
import { getCourseWebinar } from "@/lib/wefunnels/course-room";
import { openCourse } from "@/lib/actions/wefunnel-course";
import { DistributorCheckoutButton } from "../distribuidor/checkout-button";
import { INVITATION_PRICE_LABEL, PUBLIC_PRICE_LABEL } from "@/lib/wefunnels/pricing";

type SearchParams = Promise<{ estado?: string }>;

// The course room. The video is the protagonist: one recorded video hosted
// in WeWebinars, opened in the real WeWebinars player. Nothing here invents
// duration, progress, attendees or playback -- there is no verified source
// for progress, so none is shown.
//
// The optional Distributor offer sits below the video, always visible (no
// time gate, no percentage gate), at the price the server assigns.
export default async function PanelCoursePage({ searchParams }: { searchParams: SearchParams }) {
  const viewer = await getPanelViewer();
  if (!viewer) redirect("/login?next=/panel/curso");
  if (!viewer.site) redirect("/panel");

  const { estado } = await searchParams;
  const course = await getCourseWebinar();
  const offer = viewer.offer;
  const invited = offer?.price_tier === "invitation";
  const sharedBy = offer?.referrer_is_distributor ? offer.referrer_name : null;

  return (
    <div className="max-w-[920px]">
      <Kicker>{viewer.isDistributor ? "Tu sala del curso" : "Incluido con tu funnel gratuito"}</Kicker>
      <h1 className="mt-2.5 mb-3 text-[29px] leading-tight font-bold tracking-[-1px] sm:text-[34px]">
        Cómo NUNCA quedarte sin prospectos
      </h1>
      <p className="mt-0 mb-5 text-[15px] text-[#b9cbe0]">
        Aprende a llevar tráfico a tu funnel y convertir el interés en conversaciones.
      </p>

      {sharedBy && (
        <div className="mb-6 flex items-center gap-3">
          <Avatar name={sharedBy} photoUrl={offer?.referrer_photo_url} size={39} />
          <div>
            <small className="block text-[11px] text-[#abc1d8]">Este curso te lo comparte</small>
            <strong className="text-[14px]">{sharedBy}</strong>
          </div>
        </div>
      )}

      <section aria-label="Video del curso en WeWebinars" className="overflow-hidden rounded-[13px] border border-[#3f526f] bg-[#070d18]">
        <div className="relative isolate flex min-h-[300px] items-center justify-center bg-[radial-gradient(ellipse_at_85%_10%,#32246299,transparent_65%),radial-gradient(ellipse_at_15%_100%,#0f4a5b66,transparent_65%),#070e1d] px-5 py-10 text-center sm:min-h-[370px]">
          <div className="wf-lines" aria-hidden="true" />
          <div>
            <Kicker>Un método para network marketers constructores</Kicker>
            <p className="mx-auto mt-4 mb-6 max-w-[550px] text-[29px] leading-tight font-bold tracking-[-1.2px] text-[#f3f7ff] sm:text-[38px]">
              Tu funnel está listo.
              <br />
              <GradientText>Ahora lleva personas a él.</GradientText>
            </p>
            {course ? (
              <form action={openCourse}>
                <button type="submit" className="inline-flex min-h-[48px] items-center gap-3 rounded-[9px] bg-[#e4faff] px-6 py-3 font-bold text-[#09202c]">
                  <Play className="h-5 w-5" aria-hidden="true" /> Ver el curso
                </button>
              </form>
            ) : (
              <p className="mx-auto max-w-[420px] rounded-lg bg-[#17333d] p-4 text-[14px] text-[#c2f2e9]" role="status">
                El video del curso todavía no está disponible. Te avisaremos cuando puedas verlo.
              </p>
            )}
            {estado === "error" && (
              <p role="alert" className="mx-auto mt-4 max-w-[420px] text-[14px] text-[#ffb4b4]">
                No pudimos abrir el curso en este momento. Intenta de nuevo en unos minutos.
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap justify-between gap-3 border-t border-[#2e405a] bg-[#0d1929] px-5 py-3 text-[12px] text-[#a7bfd9]">
          <span>Reproductor de WeWebinars</span>
          <span>Tu curso permanece incluido con tu cuenta gratuita</span>
        </div>
      </section>

      <div className="grid gap-3 border-b border-[#2b3c54] py-6 text-[14px] text-[#d2e4f8] sm:flex sm:flex-wrap sm:gap-7">
        <span><b className="mr-2 text-[#7fe2eb]">01</b>Contenido que atrae</span>
        <span><b className="mr-2 text-[#7fe2eb]">02</b>Tráfico con anuncios</span>
        <span><b className="mr-2 text-[#7fe2eb]">03</b>La estrategia del regalo</span>
      </div>
      <p className="mt-2 text-[12px] text-[#a8bfd8]">Tres temas de un mismo video.</p>

      {!viewer.isDistributor && (
        <section className="mt-6 grid items-center gap-7 rounded-[13px] border border-[#3c4b68] bg-[radial-gradient(ellipse_at_0_90%,#25285888,transparent_65%),#0d1728] p-5 sm:p-7 md:grid-cols-[1.15fr_1fr]">
          <div>
            <Kicker>El siguiente paso es opcional</Kicker>
            <h2 className="mt-2.5 mb-3 text-[25px] leading-tight font-bold tracking-[-0.6px]">
              Tú también puedes decir:
              <br />
              <GradientText>“Te regalo tu funnel”.</GradientText>
            </h2>
            <p className="text-[14px] text-[#b9cbe0]">
              Activa Distribuidor y ofrece a otros constructores un funnel, su panel y este curso. Abre
              la conversación dando una herramienta útil.
            </p>
            <ul className="mt-4 mb-0 list-none p-0 text-[14px] text-[#c1d6ed]">
              {[
                "Regalar funnels ilimitados de por vida.",
                "Página de regalo.",
                "Sala del curso.",
                "Panel con registros y analítica.",
                "2 meses de Starter de WeWebinars.",
                "20% sobre suscripciones mensuales de referidos directos.",
              ].map((item) => (
                <li key={item} className="my-2.5">
                  <span className="mr-2 text-[#7cebe0]" aria-hidden="true">✓</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <Kicker>{invited ? "Tu precio por invitación" : "Licencia Distribuidor"}</Kicker>
            <div className="mt-3 mb-1.5 text-[44px] leading-[1.1] font-bold tracking-[-2px] text-[#f2f8ff] sm:text-[51px]">
              {invited ? "100" : "199"} <small className="text-[16px] font-normal tracking-normal">dólares</small>
            </div>
            <p className="text-[13px] text-[#abc3dd]">Un solo pago. Sin mensualidad por la licencia Distribuidor.</p>
            <DistributorCheckoutButton label={`Activar Distribuidor · ${invited ? INVITATION_PRICE_LABEL : PUBLIC_PRICE_LABEL}`} />
            <div className="my-5 h-px bg-[#2c405b]" />
            <ul className="m-0 list-none p-0 text-[13px] text-[#abc3dd]">
              <li className="mb-2">Tu cuenta gratuita no depende de comprar.</li>
              <li className="mb-2">Starter es opcional después de los 2 meses.</li>
              <li className="mb-2">Sin comisión por la licencia Distribuidor.</li>
              <li>Sin segundo nivel.</li>
            </ul>
          </div>
        </section>
      )}

      <div className="mt-7">
        <FaqItem question="¿Qué pasa si decido no activar Distribuidor?">
          Tu funnel, tu panel y este curso siguen siendo gratuitos. Activar Distribuidor es opcional y te
          permite regalar funnels a otras personas.
        </FaqItem>
        <FaqItem question="¿Tengo que continuar pagando Starter después de los 2 meses?">
          No. Continuar con Starter de WeWebinars es opcional. Tu licencia Distribuidor, tu funnel y tu
          sala del curso permanecen activos.
        </FaqItem>
        <FaqItem question="¿Sobre qué se calcula el 20%?">
          Sobre los planes mensuales de WeWebinars de tus referidos directos mientras mantengan su
          suscripción. No hay comisión por la licencia Distribuidor ni por un segundo nivel.
        </FaqItem>
      </div>
    </div>
  );
}
