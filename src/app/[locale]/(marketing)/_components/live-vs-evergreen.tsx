import { Check, X } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Logo } from "@/components/logo";

// Shared between the Home page and Pricing (below Enterprise) -- same
// copy/namespace in both places, so a future edit to the comparison only
// has to happen here once.
export async function LiveVsEvergreen() {
  const t = await getTranslations("Home");
  const livePoints = t.raw("livePoints") as string[];
  const evergreenPoints = t.raw("evergreenPoints") as string[];

  return (
    <section className="mx-auto max-w-5xl px-6 py-20">
      <div className="mx-auto mb-12 max-w-2xl text-center">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {t.rich("comparisonTitle", {
            highlight: (chunks) => (
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(90deg, var(--brand), var(--brand-2))" }}
              >
                {chunks}
              </span>
            ),
          })}
        </h2>
        <p className="mt-2 text-muted-foreground">{t("comparisonSubtitle")}</p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="rounded-xl border bg-muted/30 p-7">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <X className="size-4" />
            </span>
            <div>
              <p className="font-medium">{t("liveCardTitle")}</p>
              <p className="text-xs text-muted-foreground">{t("liveCardSubtitle")}</p>
            </div>
          </div>
          <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
            {livePoints.map((point) => (
              <li key={point} className="flex items-start gap-2.5">
                <X className="mt-0.5 size-4 shrink-0 text-muted-foreground/60" />
                {point}
              </li>
            ))}
          </ul>
        </div>

        <div
          className="relative rounded-xl bg-card p-7 shadow-lg"
          style={{ borderColor: "var(--brand)", borderWidth: 2 }}
        >
          <span
            className="absolute -top-3 left-1/2 w-fit -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium text-white"
            style={{ background: "linear-gradient(90deg, var(--brand), var(--brand-2))" }}
          >
            {t("evergreenBadge")}
          </span>
          <div className="mb-5 flex items-center gap-3">
            <Logo variant="mark" className="size-9" />
            <div>
              <p className="font-medium">{t("evergreenCardTitle")}</p>
              <p className="text-xs text-muted-foreground">{t("evergreenCardSubtitle")}</p>
            </div>
          </div>
          <ul className="flex flex-col gap-3 text-sm">
            {evergreenPoints.map((point) => (
              <li key={point} className="flex items-start gap-2.5">
                <Check className="mt-0.5 size-4 shrink-0" style={{ color: "var(--brand)" }} />
                {point}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
