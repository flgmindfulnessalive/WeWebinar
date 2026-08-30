"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { CircleCheck, CircleAlert, Radio, Pause } from "lucide-react";

import { publishWebinar, archiveWebinar } from "@/lib/actions/webinars";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WebinarStatus } from "@/lib/supabase/database.types";

// The single, prominent "go live" moment of the wizard -- previously
// Publicar only lived as one outline button among Duplicate/Delete in the
// page header, with no indication of whether the webinar was actually
// ready. This surfaces readiness proactively (not just as an error after
// clicking) and is the one primary-styled action in the whole wizard.
export function PublishBar({
  webinarId,
  status,
  hasVideo,
}: {
  webinarId: string;
  status: WebinarStatus;
  hasVideo: boolean;
}) {
  const router = useRouter();
  const t = useTranslations("PublishBar");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const runAction = (action: (id: string) => Promise<{ error: string } | null>) => {
    setError(null);
    startTransition(async () => {
      const result = await action(webinarId);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const ready = status !== "draft" || hasVideo;
  const Icon = status === "published" ? Radio : ready ? CircleCheck : CircleAlert;

  const title =
    status === "published"
      ? t("publishedTitle")
      : status === "archived"
        ? t("pausedTitle")
        : ready
          ? t("readyTitle")
          : t("notReadyTitle");

  const body =
    status === "published"
      ? t("publishedBody")
      : status === "archived"
        ? t("pausedBody")
        : ready
          ? t("readyBody")
          : t("notReadyBody");

  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 rounded-xl border p-5 sm:flex-row sm:items-center sm:justify-between",
        status === "published"
          ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/40"
          : ready
            ? "border-indigo-200 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950/40"
            : "border-border bg-muted/40"
      )}
    >
      <div className="flex items-start gap-3">
        <Icon
          className={cn(
            "mt-0.5 size-5 shrink-0",
            status === "published"
              ? "text-green-600"
              : ready
                ? "text-indigo-600"
                : "text-muted-foreground"
          )}
        />
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs text-muted-foreground">{body}</p>
          {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        </div>
      </div>

      {status === "published" ? (
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => runAction(archiveWebinar)}
        >
          <Pause className="size-4" />
          {isPending ? t("pausing") : t("pause")}
        </Button>
      ) : (
        <Button
          size="lg"
          disabled={isPending || !ready}
          onClick={() => runAction(publishWebinar)}
        >
          {isPending
            ? t("publishing")
            : status === "archived"
              ? t("republish")
              : t("publish")}
        </Button>
      )}
    </div>
  );
}
