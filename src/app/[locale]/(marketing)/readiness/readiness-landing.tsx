"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2, Clock, ListChecks, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

const STATS = [
  { key: "statQuestions", icon: ListChecks },
  { key: "statTime", icon: Clock },
  { key: "statPersonalized", icon: Sparkles },
  { key: "statPlan", icon: CheckCircle2 },
] as const;

export function ReadinessLanding({
  hasResumableProgress,
  onStart,
  onResume,
  onRestart,
}: {
  hasResumableProgress: boolean;
  onStart: () => void;
  onResume: () => void;
  onRestart: () => void;
}) {
  const t = useTranslations("Readiness.landing");

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center gap-8 px-6 py-16 text-center sm:py-24">
      <span
        className="rounded-full px-3 py-1 text-xs font-semibold tracking-wide text-white uppercase"
        style={{ background: "linear-gradient(90deg, var(--brand), var(--brand-2))" }}
      >
        {t("eyebrow")}
      </span>

      <h1 className="text-3xl font-semibold tracking-tight text-balance sm:text-5xl">{t("title")}</h1>
      <p className="text-lg text-muted-foreground text-pretty">{t("subtitle")}</p>

      <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
        {STATS.map(({ key, icon: Icon }) => (
          <li key={key} className="flex items-center gap-1.5">
            <Icon className="size-4 text-[var(--brand)]" aria-hidden />
            {t(key)}
          </li>
        ))}
      </ul>

      {hasResumableProgress ? (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-muted-foreground">{t("resumeBanner")}</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              size="lg"
              onClick={onResume}
              className="text-white shadow-sm"
              style={{ background: "linear-gradient(90deg, var(--brand), var(--brand-2))" }}
            >
              {t("resumeCta")}
            </Button>
            <Button size="lg" variant="ghost" onClick={onRestart}>
              {t("restartCta")}
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <Button
            size="lg"
            onClick={onStart}
            className="h-12 px-8 text-base text-white shadow-sm"
            style={{ background: "linear-gradient(90deg, var(--brand), var(--brand-2))" }}
          >
            {t("cta")}
          </Button>
          <p className="text-xs text-muted-foreground">{t("noSignupNeeded")}</p>
        </div>
      )}
    </div>
  );
}
