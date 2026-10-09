import Link from "next/link";
import { redirect } from "next/navigation";
import { Play } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getPanelViewer } from "@/lib/wefunnels/site";
import { courseTemplateWebinarId } from "@/lib/wefunnels/course-room";

// Mi curso: one video, hosted in WeWebinars. No modules, no invented
// progress, no attendee count -- the approved package is explicit that the
// three topics belong to a single video and are not separate lessons.
const TOPICS = [
  { n: "01", title: "Contenido que atrae" },
  { n: "02", title: "Tráfico con anuncios" },
  { n: "03", title: "La estrategia del regalo" },
];

const QUESTIONS: [string, string][] = [
  [
    "¿Qué pasa si decido no activar Distribuidor?",
    "Tu funnel, tu panel y este curso siguen siendo gratuitos. Activar Distribuidor es opcional y te permite regalar funnels a otras personas.",
  ],
  [
    "¿Tengo que continuar pagando Starter después de los 2 meses?",
    "No. Continuar con Starter de WeWebinars es opcional. Tu licencia Distribuidor, tu funnel y tu sala del curso permanecen activos.",
  ],
  [
    "¿Sobre qué se calcula el 20%?",
    "Sobre los planes de WeWebinars de tus referidos directos, mensuales o anuales, mientras mantengan su suscripción. No hay comisión por la licencia Distribuidor ni por un segundo nivel.",
  ],
];

function clock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const rest = Math.floor(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export default async function PanelCoursePage() {
  const viewer = await getPanelViewer();
  if (!viewer) redirect("/entrar?next=/panel/curso");
  if (!viewer.site) redirect("/panel");

  const webinarId = courseTemplateWebinarId();
  const supabase = await createClient();

  // Who shared it. Read through the referral row rather than the cookie:
  // this is their own panel, long after the cookie expired, and the origin
  // has been a row on the account since the claim.
  const admin = createAdminClient();
  const { data: referral } = await admin
    .from("wefunnel_referrals")
    .select("referrer_site_id")
    .eq("referred_account_id", viewer.site.account_id)
    .maybeSingle();

  let sharedBy: string | null = null;
  if (referral?.referrer_site_id) {
    const { data: referrer } = await admin
      .from("wefunnel_sites")
      .select("display_name")
      .eq("id", referral.referrer_site_id)
      .maybeSingle();
    sharedBy = referrer?.display_name ?? null;
  }

  // Progress, only where it is real. position comes from their own
  // viewer_events; the percentage needs webinars.duration_seconds, which is
  // nullable -- without it the screen says the position and no percentage
  // rather than inventing a denominator (20261007000013).
  let position: number | null = null;
  let percent: number | null = null;

  if (webinarId) {
    const { data } = await supabase.rpc("wefunnel_course_progress", {
      p_webinar_id: webinarId,
    });
    const row = data?.[0];
    if (row?.position_seconds) {
      position = row.position_seconds;
      if (row.duration_seconds && row.duration_seconds > 0) {
        percent = Math.min(
          99,
          Math.round((row.position_seconds / row.duration_seconds) * 100)
        );
      }
    }
  }

  const resuming = position !== null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="m-0 text-[length:var(--wf-kicker)] font-bold tracking-[0.155em] text-[#70E9EF] uppercase">
          Incluido con tu funnel gratuito
        </p>
        <h1 className="m-0 mt-2.5 text-[clamp(26px,4.2vw,36px)] leading-[1.08] font-extrabold tracking-[-0.035em] text-[#F3F7FF] text-balance">
          Cómo NUNCA quedarte sin prospectos
        </h1>
        <p className="m-0 mt-3 max-w-[58ch] text-[length:var(--wf-body)] leading-relaxed text-[#B7C7DC]">
          Aprende a llevar tráfico a tu funnel y convertir el interés en conversaciones.
        </p>
      </div>

      {sharedBy && (
        <div className="flex items-center gap-3.5">
          <span
            className="grid h-[44px] w-[44px] shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#1E5BF5] to-[#9333EA] text-[length:var(--wf-small)] font-bold text-white"
            aria-hidden="true"
          >
            {initials(sharedBy)}
          </span>
          <div className="min-w-0">
            <p className="m-0 text-[length:var(--wf-kicker)] tracking-[0.1em] text-[#8498B4] uppercase">
              Este curso te lo comparte
            </p>
            <p className="m-0 text-[16px] font-semibold text-[#F3F7FF]">{sharedBy}</p>
          </div>
        </div>
      )}

      <section
        className="relative isolate overflow-hidden rounded-[16px] border border-[#2D3E57]"
        style={{
          background:
            "radial-gradient(ellipse at 90% 30%, rgba(48,32,90,0.5), transparent 60%), #0B1423",
        }}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 left-[55%] -z-10"
          style={{
            backgroundImage:
              "repeating-linear-gradient(150deg,transparent 0 80px,rgba(130,102,201,0.28) 81px,transparent 82px 140px),repeating-linear-gradient(90deg,transparent 0 78px,rgba(56,216,235,0.22) 79px,transparent 80px 141px)",
            maskImage: "linear-gradient(90deg,transparent,#000)",
            WebkitMaskImage: "linear-gradient(90deg,transparent,#000)",
          }}
        />
        <div className="p-[clamp(22px,4vw,44px)]">
          <p className="m-0 text-[length:var(--wf-kicker)] font-bold tracking-[0.155em] text-[#70E9EF] uppercase">
            Un método para network marketers constructores
          </p>
          <p className="m-0 mt-3 text-[clamp(22px,3.6vw,34px)] leading-[1.12] font-bold tracking-[-0.03em] text-[#F3F7FF]">
            Tu funnel está listo.
            <br />
            <span className="bg-gradient-to-r from-[#41E5EC] via-[#83B5FF] to-[#BD8BFF] bg-clip-text text-transparent">
              Ahora lleva personas a él.
            </span>
          </p>

          {webinarId ? (
            <>
              <Link
                href="/panel/curso/ver"
                className="wf-cta mt-6 inline-flex min-h-[52px] items-center justify-center gap-3 rounded-lg bg-gradient-to-r from-[#3FE4EC] to-[#83B9FF] px-6 py-4 text-[16px] font-bold text-[#071521] no-underline"
              >
                <Play className="h-[18px] w-[18px]" aria-hidden="true" />
                {resuming ? "Continuar viendo" : "Ver el curso"}
              </Link>
              {resuming && (
                <p className="m-0 mt-3 text-[length:var(--wf-body)] text-[#B7C7DC]">
                  Lo dejaste en {clock(position!)}
                  {percent !== null ? ` · ${percent}% visto` : ""}.
                </p>
              )}
              <p className="m-0 mt-3 text-[length:var(--wf-small)] leading-relaxed text-[#8498B4]">
                Se abre en WeWebinars con tu nombre y tu correo. No tienes que registrarte
                otra vez.
              </p>
            </>
          ) : (
            <p className="m-0 mt-6 max-w-[52ch] text-[length:var(--wf-body)] leading-relaxed text-[#B7C7DC]">
              Lo estamos grabando. Te avisamos por correo en cuanto esté, y queda incluido
              con tu cuenta gratuita.
            </p>
          )}
        </div>
        <p className="m-0 flex flex-wrap items-center justify-between gap-3 border-t border-[#1F2A3C] bg-[#091221] px-[clamp(22px,4vw,44px)] py-3.5 text-[length:var(--wf-kicker)] text-[#8498B4]">
          <span>Reproductor de WeWebinars</span>
          <span>Tu curso permanece incluido con tu cuenta gratuita</span>
        </p>
      </section>

      {/* The three belong to one video. Rendered as topics, not as a list of
          lessons with their own links, because that is what they are. */}
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {TOPICS.map((topic) => (
          <span key={topic.n} className="flex items-center gap-2.5 text-[length:var(--wf-body)] text-[#B7C7DC]">
            <b
              className="text-[length:var(--wf-small)] font-semibold text-[#76E8EE]"
              style={{ fontFamily: "var(--font-wefunnels-mono), ui-monospace, monospace" }}
            >
              {topic.n}
            </b>
            {topic.title}
          </span>
        ))}
      </div>

      {!viewer.distributor && <CourseOffer />}

      <div className="max-w-[740px]">
        {QUESTIONS.map(([question, answer]) => (
          <details key={question} className="border-b border-[#2C3B51] py-4">
            <summary className="flex min-h-[44px] cursor-pointer items-center justify-between gap-4 text-[length:var(--wf-body)] font-medium text-[#F3F7FF] marker:content-none [&::-webkit-details-marker]:hidden">
              {question}
              <span className="shrink-0 text-[#77DFE9]" aria-hidden="true">
                +
              </span>
            </summary>
            <p className="m-0 mt-2.5 text-[length:var(--wf-small)] leading-relaxed text-[#B7C7DC]">{answer}</p>
          </details>
        ))}
      </div>
    </div>
  );
}

// Below the video, as the approved layout puts it: not hidden until a given
// minute and not gated on a percentage watched, neither of which was
// approved. The price itself is not written here -- /panel/distribuidor
// reads it from wefunnel_license_price, which decides it from the account's
// own referral rows.
function CourseOffer() {
  return (
    <section className="grid gap-6 rounded-[16px] border border-[#A855F7] bg-gradient-to-br from-[#0B1230] to-[#1B0C2E] p-[clamp(20px,3vw,30px)] lg:grid-cols-[1.1fr_1fr]">
      <div className="min-w-0">
        <p className="m-0 text-[length:var(--wf-kicker)] font-bold tracking-[0.155em] text-[#D8B4FE] uppercase">
          El siguiente paso es opcional
        </p>
        <h2 className="m-0 mt-2.5 text-[clamp(22px,3.2vw,28px)] leading-[1.14] font-bold tracking-[-0.03em] text-[#F3F7FF]">
          Tú también puedes decir:
          <br />
          <span className="bg-gradient-to-r from-[#41E5EC] via-[#83B5FF] to-[#BD8BFF] bg-clip-text text-transparent">
            «Te regalo tu funnel».
          </span>
        </h2>
        <p className="m-0 mt-3 text-[length:var(--wf-body)] leading-relaxed text-[#B7C7DC]">
          Activa Distribuidor y ofrece a otros constructores un funnel, su panel y este
          curso. Abre la conversación dando una herramienta útil.
        </p>
      </div>
      <ul className="m-0 flex min-w-0 list-none flex-col gap-2.5 p-0">
        {[
          "Funnels ilimitados para regalar de por vida.",
          "Tu página de regalo y tu sala del curso.",
          "Panel con tus registros y analítica.",
          "2 meses de Starter de WeWebinars.",
          "20% sobre las suscripciones de tus referidos directos.",
        ].map((item) => (
          <li key={item} className="flex gap-2.5 text-[length:var(--wf-body)] text-[#D2DFEF]">
            <span className="text-[#6EE8E5]" aria-hidden="true">
              ✓
            </span>
            <span className="min-w-0">{item}</span>
          </li>
        ))}
        <li className="mt-2 list-none">
          <Link
            href="/panel/distribuidor"
            className="wf-cta inline-flex min-h-[48px] w-full items-center justify-center rounded-lg bg-gradient-to-r from-[#3FE4EC] to-[#83B9FF] px-5 py-3.5 text-[length:var(--wf-body)] font-bold text-[#071521] no-underline"
          >
            Conocer los beneficios →
          </Link>
        </li>
        <li className="list-none text-[length:var(--wf-small)] leading-relaxed text-[#8498B4]">
          Tu cuenta gratuita no depende de comprar. Sin comisión por la licencia. Sin
          segundo nivel.
        </li>
      </ul>
    </section>
  );
}
