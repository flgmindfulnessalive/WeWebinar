"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";

import { completeTask, cancelTask } from "@/lib/actions/growth-tasks";

export function TaskActions({ taskId, prospectId }: { taskId: string; prospectId: string | null }) {
  const t = useTranslations("GrowthTasks");
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label={t("complete")}
        disabled={isPending}
        onClick={() => startTransition(() => completeTask(taskId, prospectId))}
        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-emerald-600 disabled:opacity-50"
      >
        <Check className="size-4" />
      </button>
      <button
        type="button"
        aria-label={t("cancel")}
        disabled={isPending}
        onClick={() => startTransition(() => cancelTask(taskId, prospectId))}
        className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-destructive disabled:opacity-50"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
