import { MessageCircle, Play, Users } from "lucide-react";

// A stylized illustration of the live webinar room -- not a real
// screenshot (none exists to show), just an abstract mockup that
// communicates "video + live chat + a timed CTA" at a glance.
export function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-3xl rounded-xl border bg-card shadow-2xl shadow-[var(--brand)]/10">
      <div className="flex items-center gap-1.5 border-b px-4 py-3">
        <span className="size-2.5 rounded-full bg-red-400" />
        <span className="size-2.5 rounded-full bg-yellow-400" />
        <span className="size-2.5 rounded-full bg-green-400" />
        <span className="ml-3 truncate text-xs text-muted-foreground">
          tuempresa.com/webinar/lanzamiento-2026
        </span>
      </div>

      <div className="flex flex-col sm:flex-row">
        <div className="relative flex flex-1 flex-col justify-end gap-3 bg-neutral-900 p-6 sm:aspect-video sm:p-8">
          <div
            className="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
            style={{ background: "var(--brand)" }}
          >
            <Play className="size-6 fill-white text-white" />
          </div>

          <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-xs text-white backdrop-blur">
            <span className="size-1.5 animate-pulse rounded-full bg-red-500" />
            EN VIVO
          </div>
          <div className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full bg-black/50 px-2.5 py-1 text-xs text-white backdrop-blur">
            <Users className="size-3" />
            312
          </div>

          <div className="h-1 w-full overflow-hidden rounded-full bg-white/20">
            <div className="h-full w-2/3 rounded-full" style={{ background: "var(--brand)" }} />
          </div>
        </div>

        <div className="flex w-full flex-col gap-3 border-t p-4 sm:w-56 sm:border-t-0 sm:border-l">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <MessageCircle className="size-3.5" />
            Chat en vivo
          </div>
          {[
            ["Vale M.", "Justo lo que necesitaba 🙌"],
            ["Diego R.", "¿Queda grabado?"],
            ["Sofía L.", "Excelente explicación"],
          ].map(([name, text]) => (
            <div key={name} className="text-xs">
              <span className="font-medium" style={{ color: "var(--brand)" }}>
                {name}
              </span>{" "}
              <span className="text-muted-foreground">{text}</span>
            </div>
          ))}
        </div>
      </div>

      <div
        className="absolute -bottom-4 left-6 rounded-full px-4 py-2 text-xs font-medium text-white shadow-lg sm:left-8"
        style={{ background: "linear-gradient(90deg, var(--brand), var(--brand-2))" }}
      >
        🎁 Oferta especial — últimos minutos
      </div>
    </div>
  );
}
