import { Fragment } from "react";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  Check,
  Clapperboard,
  MessageSquare,
  MousePointerClick,
  Palette,
  Rocket,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { ParticleNetwork } from "@/components/particle-network";
import { GradientBlobs } from "@/components/gradient-blobs";
import { MouseSpotlight } from "./_components/mouse-spotlight";
import { ProductPreview } from "./_components/product-preview";

const FEATURES = [
  {
    icon: Video,
    title: "Graba una vez, preséntalo para siempre",
    description:
      "Cada visitante ve tu webinar como si fuera en vivo, con reproductor bloqueado para que no adelante ni descargue el video.",
  },
  {
    icon: CalendarClock,
    title: "Programación a tu manera",
    description:
      "Horarios fijos recurrentes, arranque inmediato (\"empieza ahora\"), o ambos combinados en el mismo webinar.",
  },
  {
    icon: MessageSquare,
    title: "Chat en vivo simulado",
    description:
      "Mensajes cronometrados y contador de espectadores que hacen sentir el evento real, sin moderación manual.",
  },
  {
    icon: MousePointerClick,
    title: "CTAs cronometrados",
    description:
      "Links, banners y encuestas que aparecen en el segundo exacto del video para vender en el momento justo.",
  },
  {
    icon: BarChart3,
    title: "Analíticas por webinar",
    description:
      "Registrados, asistencia real, curva de retención, clics por CTA y resultados de encuestas, todo en un lugar.",
  },
  {
    icon: Palette,
    title: "Tu marca, no la nuestra",
    description:
      "Logo y colores propios en el registro, la sala y los emails automáticos de confirmación y recordatorio.",
  },
];

const STEPS = [
  {
    n: "01",
    icon: Clapperboard,
    title: "Graba tu presentación",
    description: "Sube tu video a YouTube (como no listado) y carga el link en el wizard.",
  },
  {
    n: "02",
    icon: CalendarClock,
    title: "Programa tus horarios",
    description: "Elige días y horas fijas, arranque inmediato, o las dos opciones juntas.",
  },
  {
    n: "03",
    icon: Rocket,
    title: "Comparte tu link y vende",
    description: "Los CTAs y el chat simulado hacen el trabajo mientras tú generas tráfico.",
  },
];

export default function HomePage() {
  return (
    <div className="marketing-theme">
      <section className="relative overflow-hidden">
        <div className="bg-grid-pattern absolute inset-0 -z-20 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]" />
        <GradientBlobs />
        <MouseSpotlight />
        <div aria-hidden className="absolute inset-0 -z-10">
          <ParticleNetwork color="79, 70, 229" particleCount={34} opacity={0.35} />
        </div>

        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 pb-20 pt-20 text-center sm:pt-28">
          <div
            className="animate-fade-up inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
            style={{ borderColor: "var(--brand)", color: "var(--brand)" }}
          >
            🚀 Vende mientras duermes
          </div>

          <h1
            className="animate-fade-up text-4xl font-semibold tracking-tight sm:text-6xl"
            style={{ animationDelay: "0.05s" }}
          >
            Webinars evergreen que{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(90deg, var(--brand), var(--brand-2))" }}
            >
              se sienten en vivo
            </span>
          </h1>

          <p
            className="animate-fade-up max-w-xl text-lg text-muted-foreground"
            style={{ animationDelay: "0.1s" }}
          >
            Graba una vez, preséntalo para siempre. Programa sesiones automáticas,
            simula chat en vivo y vende tus productos con CTAs cronometrados —
            sin depender de una transmisión real.
          </p>

          <div
            className="animate-fade-up flex flex-col gap-3 sm:flex-row"
            style={{ animationDelay: "0.15s" }}
          >
            <Button asChild size="lg" className="text-white shadow-lg" style={{ background: "var(--brand)" }}>
              <Link href="/signup">Empezar ahora</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/pricing">Ver planes</Link>
            </Button>
          </div>

          <p
            className="animate-fade-up flex items-center gap-1.5 text-sm text-muted-foreground"
            style={{ animationDelay: "0.18s" }}
          >
            <Check className="size-4" style={{ color: "var(--brand)" }} />
            15 días de prueba gratis — sin tarjeta de crédito
          </p>

          <div className="animate-fade-up w-full pt-10" style={{ animationDelay: "0.2s" }}>
            <ProductPreview />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight">Todo lo que necesitas para vender</h2>
          <p className="mt-2 text-muted-foreground">
            Una plataforma, sin depender de transmitir en vivo cada vez.
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-xl border bg-card p-6 transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <div
                className="mb-4 flex size-10 items-center justify-center rounded-lg"
                style={{ background: "var(--brand-light)" }}
              >
                <f.icon className="size-5" style={{ color: "var(--brand)" }} />
              </div>
              <h3 className="font-medium">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y bg-muted/30">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="mx-auto mb-14 max-w-md text-center">
            <h2 className="text-3xl font-semibold tracking-tight">Cómo funciona</h2>
            <p className="mt-2 text-muted-foreground">
              De la grabación a la primera venta, en tres pasos.
            </p>
          </div>
          <div className="flex flex-col gap-9 sm:flex-row sm:items-start sm:gap-0">
            {STEPS.map((step, i) => (
              <Fragment key={step.n}>
                <div className="relative flex flex-1 flex-col items-start pr-0 sm:pr-6">
                  <div
                    className="animate-marketing-blob absolute -top-4 -left-4 size-28 rounded-full opacity-30 blur-2xl"
                    style={{
                      background:
                        "radial-gradient(circle, var(--brand) 0%, var(--brand-2) 55%, transparent 72%)",
                      animationDelay: `${i * -5}s`,
                    }}
                  />
                  <div className="relative z-10">
                    <div
                      className="flex size-[68px] items-center justify-center rounded-[20px] border border-white shadow-[0_1px_2px_rgba(24,24,39,.04),0_12px_24px_-12px_rgba(79,70,229,.35)]"
                      style={{ background: "var(--brand-light)" }}
                    >
                      <step.icon className="size-8" style={{ color: "var(--brand)" }} strokeWidth={1.75} />
                    </div>
                    <span
                      className="absolute -top-2 -right-2 flex size-6 items-center justify-center rounded-full border bg-background font-mono text-[10.5px] font-semibold shadow-sm"
                      style={{ color: "var(--brand)" }}
                    >
                      {step.n}
                    </span>
                  </div>
                  <h3 className="mt-5 text-[17px] font-semibold tracking-tight">{step.title}</h3>
                  <p className="mt-1.5 max-w-[27ch] text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
                {i < STEPS.length - 1 && (
                  <div
                    aria-hidden
                    className="ml-8 flex items-center text-border sm:ml-0 sm:w-16 sm:justify-center sm:pt-9"
                  >
                    <ArrowRight className="size-4 rotate-90 sm:rotate-0" />
                  </div>
                )}
              </Fragment>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-20">
        <div
          className="flex flex-col items-center gap-6 rounded-2xl px-6 py-16 text-center text-white"
          style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-2))" }}
        >
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Empieza a vender con tu primer webinar evergreen
          </h2>
          <p className="max-w-xl text-white/80">
            Configuralo en minutos y dejalo vendiendo las 24 horas.
          </p>
          <Button asChild size="lg" variant="secondary">
            <Link href="/signup">Empezar ahora</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
