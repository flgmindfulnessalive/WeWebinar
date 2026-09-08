import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ORDERED_LAUNCHPAD_STEPS } from "@/lib/launchpad/steps-config";
import { completedStepCount, computeProjectCompletionPercentage, estimatedMinutesRemaining } from "@/lib/launchpad/progress";
import type { LaunchpadStepKey, LaunchpadStepProgress } from "@/lib/launchpad/types";

// Server component (sin "use client") -- solo lee de progress.ts (dominio
// puro) y next-intl/server-provided messages via useTranslations, que
// funciona igual en RSC. Nunca recalcula el porcentaje con su propia
// fórmula (sección 20 del brief).
export function LaunchpadProgressCard({
  steps,
  nextStep,
}: {
  steps: LaunchpadStepProgress[];
  nextStep: LaunchpadStepKey;
}) {
  const t = useTranslations("Launchpad.dashboard");
  const total = ORDERED_LAUNCHPAD_STEPS.length;
  const completed = completedStepCount(steps);
  const percentage = computeProjectCompletionPercentage(steps);
  const minutesRemaining = estimatedMinutesRemaining(steps);
  const nextStepRoute = ORDERED_LAUNCHPAD_STEPS.find((s) => s.key === nextStep)?.route ?? "/dashboard/launchpad";

  return (
    <Card className="relative overflow-hidden">
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-[3px]"
        style={{ background: "linear-gradient(90deg, #4f46e5, #c026d3)" }}
      />
      <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium text-muted-foreground">
            {t("stepsCompleted", { completed, total })}
          </p>
          <div className="flex items-center gap-3">
            <div
              role="progressbar"
              aria-valuenow={percentage}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={t("progressLabel")}
              className="h-2 w-40 overflow-hidden rounded-full bg-muted sm:w-56"
            >
              <div
                className="h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"
                style={{ width: `${percentage}%`, background: "linear-gradient(90deg, #4f46e5, #c026d3)" }}
              />
            </div>
            <span className="text-sm font-semibold tabular-nums">{t("percentageCompleted", { percentage })}</span>
          </div>
          {minutesRemaining > 0 && (
            <p className="text-xs text-muted-foreground">{t("timeRemaining", { minutes: minutesRemaining })}</p>
          )}
        </div>

        <div className="flex flex-col items-start gap-1 sm:items-end">
          <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("nextStepLabel")}</p>
          <p className="text-sm font-medium">{t(`stepName.${nextStep}`)}</p>
          <Button asChild size="sm" className="mt-1">
            <Link href={nextStepRoute}>{t("continueCta")}</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
