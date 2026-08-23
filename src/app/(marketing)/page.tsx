import Link from "next/link";
import {
  BarChart3,
  CalendarClock,
  MessageSquare,
  MousePointerClick,
  Palette,
  Video,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { GradientBlobs } from "./_components/gradient-blobs";
import { ProductPreview } from "./_components/product-preview";

const FEATURES = [
  {
    icon: Video,
    title: "Grabá una vez, presentalo para siempre",
    description:
      "Cada visitante ve tu webinar como si fuera en vivo, con reproductor bloqueado para que no adelante ni descargue el video.",
  },
  {
    icon: CalendarClock,
    title: "Programación a tu manera",
    description:
      "Horarios fijos recurrentes, arranque inmediato (\"empezá ahora\"), o ambos combinados en el mismo webinar.",
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
    title: "Grabá tu presentación",
    description: "Subí tu video a YouTube (como no listado) y cargá el link en el wizard.",
  },
  {
    n: "02",
    title: "Programá tus horarios",
    description: "Elegí días y horas fijas, arranque inmediato, o las dos opciones juntas.",
  },
  {
    n: "03",
    title: "Compartí tu link y vendé",
    description: "Los CTAs y el chat simulado hacen el trabajo mientras vos generás tráfico.",
  },
];

export default function HomePage() {
  return (
    <div className="marketing-theme">
      <section className="relative overflow-hidden">
        <div className="bg-grid-pattern absolute inset-0 -z-20 [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,black,transparent)]" />
        <GradientBlobs />

        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-6 pb-20 pt-20 text-center sm:pt-28">
          <div
            className="animate-fade-up inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium"
            style={{ borderColor: "var(--brand)", color: "var(--brand)" }}
          >
            🚀 Vendé mientras dormís
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
            Grabá una vez, presentalo para siempre. Programá sesiones automáticas,
            simulá chat en vivo y vendé tus productos con CTAs cronometrados —
            sin depender de una transmisión real.
          </p>

          <div
            className="animate-fade-up flex flex-col gap-3 sm:flex-row"
            style={{ animationDelay: "0.15s" }}
          >
            <Button asChild size="lg" className="text-white shadow-lg" style={{ background: "var(--brand)" }}>
              <Link href="/signup">Empezar gratis</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/pricing">Ver planes</Link>
            </Button>
          </div>

          <div className="animate-fade-up w-full pt-10" style={{ animationDelay: "0.2s" }}>
            <ProductPreview />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2 className="text-3xl font-semibold tracking-tight">Todo lo que necesitás para vender</h2>
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
        <div className="mx-auto max-w-5xl px-6 py-20">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-semibold tracking-tight">Cómo funciona</h2>
          </div>
          <div className="grid gap-8 sm:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n} className="flex flex-col gap-2">
                <span
                  className="text-sm font-semibold"
                  style={{ color: "var(--brand)" }}
                >
                  {step.n}
                </span>
                <h3 className="font-medium">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
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
            Empezá a vender con tu primer webinar evergreen
          </h2>
          <p className="max-w-xl text-white/80">
            Configuralo en minutos y dejalo vendiendo las 24 horas.
          </p>
          <Button asChild size="lg" variant="secondary">
            <Link href="/signup">Empezar gratis</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
