import { getTranslations } from "next-intl/server";

import { Card, CardContent } from "@/components/ui/card";
import { scoreBand, type ScoreBreakdown } from "@/lib/growth/scoring";
import { cn } from "@/lib/utils";

const BAND_CLASS: Record<string, string> = {
  low: "border-muted-foreground/30 text-muted-foreground",
  medium: "border-amber-300 bg-amber-50 text-amber-800 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300",
  high: "border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300",
  excellent: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
};

export async function ScorePanel({
  title,
  score,
  breakdown,
  namespace,
}: {
  title: string;
  score: number;
  breakdown: ScoreBreakdown;
  namespace: "GrowthScoring";
}) {
  const t = await getTranslations(namespace);
  const band = scoreBand(score);

  return (
    <Card>
      <CardContent className="flex flex-col gap-4 p-6">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <span
            className={cn("rounded-md border px-2.5 py-1 text-sm font-semibold", BAND_CLASS[band])}
          >
            {score}/100 · {t(`band.${band}`)}
          </span>
        </div>
        <div className="flex flex-col gap-3">
          {Object.entries(breakdown).map(([key, component]) => (
            <div key={key} className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-muted-foreground">{t(`component.${key}`)}</span>
                <span className="tabular-nums text-muted-foreground">
                  {component.points}/{component.max}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-foreground/70"
                  style={{ width: `${Math.min(100, (component.points / component.max) * 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">{component.reason}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
