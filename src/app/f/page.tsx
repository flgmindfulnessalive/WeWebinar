import type { Metadata } from "next";

import { WEFUNNELS_HOST, wefunnelAppUrl } from "@/lib/wefunnels/host";

export const metadata: Metadata = {
  title: "WeFunnels — tu funnel personal gratis",
  robots: { index: false, follow: false },
};

// Where every badge lands, after /r/<slug> has recorded the touch. It is
// the one page on this host that is not somebody's personal funnel, and the
// only CTA is the claim: no price anywhere, because the $100 distributor
// tier lives inside the course and the panel, never on the public face.
const STEPS = [
  {
    n: "01",
    title: "Reclamas tu nombre",
    body: "Eliges cómo se llama tu dirección y queda tuya. No pedimos tarjeta.",
    rule: "#2E63FF",
  },
  {
    n: "02",
    title: "La personalizas",
    body: "Tu foto, tu propuesta y tu formulario. Se escribe en cinco minutos.",
    rule: "#6A4BF7",
  },
  {
    n: "03",
    title: "Le llevas tráfico",
    body: "El curso te enseña cómo, y empiezas por lo que ya puedes hacer hoy.",
    rule: "#A855F7",
  },
];

// The same three the course apiles on its second slide, in the same words:
// what somebody lands here having just been promised is what this section
// has to confirm, or the page and the room read as two different offers.
const GETS = [
  { title: "Tu página personal", body: "Tu foto, tu propuesta y un formulario." },
  {
    title: "Tu lista de contactos",
    body: "Los datos de quienes quieren saber más. Tú haces el seguimiento.",
  },
  {
    title: "El curso completo",
    body: "Aprende a atraer personas y abrir conversaciones. 25 minutos.",
  },
];

// The course's own table of contents, which is also the honest answer to
// "¿y después qué?". The third one needs the distributor tier and the
// course says so when it gets there; naming it here without a price is
// what keeps this page a claim page instead of a sales page.
const LEARNS = [
  { n: "01", title: "Contenido", body: "Publicaciones que llevan a las personas correctas a tu funnel." },
  { n: "02", title: "Anuncios", body: "Más alcance para los mensajes que ya despertaron interés." },
  { n: "03", title: "Regalar funnels", body: "La misma estrategia que te trajo a este curso." },
];

const QUESTIONS = [
  [
    "¿Es realmente gratis?",
    "Sí, y de por vida. Sin tarjeta y sin mensualidad: tu página no caduca y tus registrados siguen siendo tuyos.",
  ],
  [
    "¿Qué tiene que ver con WeWebinars?",
    "WeFunnels es parte de WeWebinars, la plataforma de webinarios — por eso la dirección vive aquí. Tu página, tu lista y el curso son gratis; WeWebinars es un producto aparte que puedes usar o no.",
  ],
  [
    "¿Qué puedo publicar?",
    "Quién eres, qué ofreces y para quién. Hay reglas de contenido cortas y están publicadas.",
  ],
  [
    "¿Sirve para cualquier compañía?",
    "Es genérico a propósito. La página habla de ti, no de ninguna marca, y eso la mantiene dentro de las reglas de la tuya.",
  ],
  [
    "¿Qué pasa si dejo de usarlo?",
    "Tu página sigue en pie y tus registrados siguen siendo tuyos. No se borra nada.",
  ],
];

export default function WeFunnelsLandingPage() {
  const claimUrl = wefunnelAppUrl("/signup?next=/panel");

  return (
    <main className="mx-auto max-w-[1040px] px-[clamp(18px,4vw,28px)]">
      <section className="relative flex flex-col items-center gap-[clamp(18px,2.4vw,26px)] py-[clamp(40px,6vw,76px)] text-center">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(60% 55% at 50% 38%, rgba(46,99,255,0.22) 0%, rgba(168,85,247,0.12) 45%, rgba(0,0,0,0) 72%)",
          }}
        />
        <h1 className="relative m-0 max-w-[14em] text-[clamp(34px,6vw,62px)] leading-[1.04] font-extrabold tracking-tight text-balance">
          Tu funnel personal, gratis de por vida.
        </h1>
        <p className="relative m-0 max-w-[32em] text-[clamp(17px,1.9vw,20px)] leading-relaxed text-[#A9B0C9]">
          Una página con tu nombre y tu formulario — y el curso para aprender a llevarle
          tráfico.
        </p>
        <div
          className="relative flex max-w-full flex-wrap items-center justify-center rounded-xl border border-[#23233A] bg-[#0D0D15] px-[18px] py-3.5 text-[clamp(13px,1.5vw,17px)]"
          style={{ fontFamily: "var(--font-wefunnels-mono), ui-monospace, monospace" }}
        >
          <span className="text-[#6E7694]">{WEFUNNELS_HOST}/</span>
          <span className="font-medium text-[#2BD7F5]">tunombre</span>
        </div>
        <div className="relative flex w-full flex-col items-center gap-3.5">
          <a
            href={claimUrl}
            className="block w-full max-w-[340px] rounded-xl bg-gradient-to-br from-[#1E5BF5] to-[#9333EA] px-8 py-[18px] text-center text-[17px] font-semibold text-white no-underline"
            style={{ boxShadow: "0 0 32px rgba(147,51,234,0.38)" }}
          >
            Reclamar mi funnel
          </a>
          <span className="text-[15px] text-[#6E7694]">
            Gratis de por vida · Sin tarjeta · Sin mensualidad
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-6 border-t border-[#1A1A2A] py-[clamp(34px,5vw,52px)]">
        <h2 className="m-0 text-sm font-bold tracking-[0.1em] text-[#6E7694] uppercase">
          Lo que recibes
        </h2>
        <div className="grid gap-[18px] [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          {GETS.map((item) => (
            <div
              key={item.title}
              className="flex flex-col gap-2.5 rounded-2xl border border-[#23233A] bg-[#0D0D15] p-[clamp(20px,2.4vw,26px)]"
            >
              <strong className="text-[19px] font-semibold">{item.title}</strong>
              <p className="m-0 text-[16px] leading-relaxed text-[#A9B0C9]">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-6 border-t border-[#1A1A2A] py-[clamp(34px,5vw,52px)]">
        <h2 className="m-0 text-sm font-bold tracking-[0.1em] text-[#6E7694] uppercase">
          Lo que aprendes en el curso
        </h2>
        <p className="m-0 max-w-[46ch] text-[16px] leading-relaxed text-[#A9B0C9]">
          Tres formas de atraer prospectos. Tres, no veinte.
        </p>
        <div className="grid gap-[18px] [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          {LEARNS.map((item) => (
            <div key={item.n} className="flex items-start gap-4">
              <span
                className="pt-1 text-[14px] text-[#2BD7F5]"
                style={{ fontFamily: "var(--font-wefunnels-mono), ui-monospace, monospace" }}
                aria-hidden="true"
              >
                {item.n}
              </span>
              <div className="min-w-0">
                <strong className="block text-[19px] font-semibold">{item.title}</strong>
                <p className="mt-1 mb-0 text-[16px] leading-relaxed text-[#A9B0C9]">
                  {item.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-6 border-t border-[#1A1A2A] py-[clamp(34px,5vw,52px)]">
        <h2 className="m-0 text-sm font-bold tracking-[0.1em] text-[#6E7694] uppercase">
          Cómo funciona
        </h2>
        <div className="grid gap-[clamp(20px,2.4vw,24px)] [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">
          {STEPS.map((step) => (
            <div
              key={step.n}
              className="flex flex-col gap-2.5 border-t-2 pt-4"
              style={{ borderTopColor: step.rule }}
            >
              <span
                className="text-[13px] text-[#6E7694]"
                style={{ fontFamily: "var(--font-wefunnels-mono), ui-monospace, monospace" }}
              >
                {step.n}
              </span>
              <strong className="text-[20px] font-semibold">{step.title}</strong>
              <p className="m-0 text-[16px] leading-relaxed text-[#A9B0C9]">{step.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-6 border-t border-[#1A1A2A] py-[clamp(34px,5vw,52px)]">
        <h2 className="m-0 text-sm font-bold tracking-[0.1em] text-[#6E7694] uppercase">
          Preguntas
        </h2>
        <div className="grid gap-[clamp(20px,2.6vw,26px)] [grid-template-columns:repeat(auto-fit,minmax(290px,1fr))]">
          {QUESTIONS.map(([question, answer]) => (
            <div key={question} className="flex flex-col gap-2">
              <strong className="text-[18px] font-semibold">{question}</strong>
              <p className="m-0 text-[16px] leading-relaxed text-[#A9B0C9]">{answer}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-5 border-t border-[#1A1A2A] pt-8 pb-[clamp(36px,5vw,52px)]">
        <span className="text-[17px] font-extrabold tracking-tight text-[#7FC9BE]">
          WeFunnels
        </span>
        <div className="flex flex-wrap gap-5 text-[15px]">
          <a href={wefunnelAppUrl("/reglas-wefunnels")} className="text-[#6E7694] no-underline">
            Reglas de contenido
          </a>
          <a href={wefunnelAppUrl("/terms")} className="text-[#6E7694] no-underline">
            Términos
          </a>
          <a href={wefunnelAppUrl("/privacy")} className="text-[#6E7694] no-underline">
            Privacidad
          </a>
        </div>
      </footer>
    </main>
  );
}
