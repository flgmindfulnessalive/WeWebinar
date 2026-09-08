"use client";

import Link from "next/link";
import { Check, Clock, Lock } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { trackLaunchpadEvent } from "@/lib/launchpad/track";
import { cn } from "@/lib/utils";
import type { LaunchpadStepDefinition } from "@/lib/launchpad/steps-config";
import type { LaunchpadStepStatus } from "@/lib/launchpad/types";

const STATUS_BADGE_STYLES: Record<LaunchpadStepStatus, string> = {
  not_started: "bg-muted text-muted-foreground",
  in_progress: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
  completed: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  needs_review: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

export function LaunchpadStepCard({
  definition,
  status,
  projectId,
}: {
  definition: LaunchpadStepDefinition;
  status: LaunchpadStepStatus;
  projectId: string;
}) {
  const t = useTranslations("Launchpad.dashboard");
  const unavailable = !definition.available;

  return (
    <Card className={cn("flex flex-col", unavailable && "opacity-70")}>
      <CardContent className="flex flex-1 flex-col gap-3 pt-6">
        <div className="flex items-start justify-between gap-2">
          <span
            aria-hidden
            className="flex size-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold"
          >
            {definition.order}
          </span>
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              unavailable ? "bg-muted text-muted-foreground" : STATUS_BADGE_STYLES[status]
            )}
          >
            {unavailable ? (
              <Lock className="size-3" />
            ) : status === "completed" ? (
              <Check className="size-3" />
            ) : null}
            {unavailable ? t("comingSoon") : t(`stepStatus.${status}`)}
          </span>
        </div>

        <div className="flex flex-col gap-1">
          <h3 className="font-semibold">{t(`stepName.${definition.key}`)}</h3>
          <p className="text-sm text-muted-foreground">{t(`stepResult.${definition.key}`)}</p>
        </div>

        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3.5" />
          {t("estimatedMinutes", { minutes: definition.estimatedMinutes })}
        </p>

        <div className="mt-auto pt-2">
          {unavailable ? (
            <Button size="sm" variant="outline" disabled className="w-full">
              {t("comingSoon")}
            </Button>
          ) : (
            <Button asChild size="sm" variant={status === "completed" ? "outline" : "default"} className="w-full">
              <Link
                href={definition.route}
                onClick={
                  definition.key === "create"
                    ? () => trackLaunchpadEvent(projectId, "create_webinar_clicked")
                    : undefined
                }
              >
                {status === "completed" ? t("reviewCta") : t(`stepCta.${definition.key}`)}
              </Link>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
