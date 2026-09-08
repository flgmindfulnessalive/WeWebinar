"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import type { ReadinessReport } from "@/lib/readiness/types";
import { CategoryScoreCard } from "./category-score-card";
import { ReadinessChart } from "./readiness-chart";
import { ReadinessCta } from "./readiness-cta";
import { RecommendedActions } from "./recommended-actions";
import { RestartAssessmentDialog } from "./restart-assessment-dialog";
import { WeakestCategoryPanel } from "./weakest-category-panel";

export function ReadinessResults({
  report,
  signupUrl,
  onCtaClick,
  onBlueprintClick,
  onRestart,
}: {
  report: ReadinessReport;
  signupUrl: string;
  onCtaClick: () => void;
  onBlueprintClick: () => void;
  onRestart: () => void;
}) {
  const t = useTranslations("Readiness.results");
  const [restartOpen, setRestartOpen] = useState(false);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 px-6 py-10">
      <div className="text-center">
        <p className="text-xs font-semibold tracking-wide uppercase" style={{ color: "var(--brand)" }}>
          {t(`status.${report.readinessStatus}.title`)}
        </p>
        <h1 className="mt-2 text-3xl font-semibold text-balance sm:text-4xl">
          {t("headline", { percentage: report.scorePercentage })}
        </h1>
        <p className="mt-3 text-muted-foreground text-pretty">{t(`status.${report.readinessStatus}.message`)}</p>
      </div>

      <ReadinessChart categoryScores={report.categoryScores} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {report.categoryScores.map((score) => (
          <CategoryScoreCard key={score.category} score={score} />
        ))}
      </div>

      <WeakestCategoryPanel category={report.weakestCategory} />

      <RecommendedActions recommendations={report.recommendations} />

      <ReadinessCta signupUrl={signupUrl} onCtaClick={onCtaClick} onBlueprintClick={onBlueprintClick} />

      <div className="flex flex-col items-center gap-3 text-center">
        <button
          type="button"
          onClick={() => setRestartOpen(true)}
          className="text-sm text-muted-foreground underline-offset-4 hover:underline"
        >
          {t("restart")}
        </button>
        <p className="max-w-lg text-xs text-muted-foreground">{t("disclaimer")}</p>
      </div>

      <RestartAssessmentDialog
        open={restartOpen}
        onOpenChange={setRestartOpen}
        onConfirm={() => {
          setRestartOpen(false);
          onRestart();
        }}
      />
    </div>
  );
}
