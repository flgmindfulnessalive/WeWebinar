"use client";

import { useActionState } from "react";
import { useTranslations, useLocale } from "next-intl";

import { createTask } from "@/lib/actions/growth-tasks";
import { TaskActions } from "../../task-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ProspectTask = {
  id: string;
  title: string;
  due_date: string | null;
  status: string;
};

export function TasksSection({ prospectId, tasks }: { prospectId: string; tasks: ProspectTask[] }) {
  const t = useTranslations("GrowthTasks");
  const locale = useLocale();
  const [state, formAction, isPending] = useActionState(createTask, null);

  const openTasks = tasks.filter((task) => task.status === "open");
  const closedTasks = tasks.filter((task) => task.status !== "open");

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="prospect_id" value={prospectId} />
        <div className="grid gap-1.5">
          <label htmlFor="task-title" className="text-xs font-medium text-muted-foreground">
            {t("titleLabel")}
          </label>
          <Input id="task-title" name="title" required placeholder={t("titlePlaceholder")} className="w-56" />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="task-due" className="text-xs font-medium text-muted-foreground">
            {t("dueDateLabel")}
          </label>
          <Input id="task-due" name="due_date" type="date" />
        </div>
        <Button type="submit" size="sm" disabled={isPending}>
          {isPending ? t("creating") : t("addTask")}
        </Button>
      </form>
      {state && "error" in state && <p className="text-sm text-destructive">{state.error}</p>}

      <div className="flex flex-col gap-2">
        {tasks.length === 0 && <p className="text-sm text-muted-foreground">{t("noTasksForProspect")}</p>}
        {openTasks.map((task) => (
          <div key={task.id} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
            <div>
              <p>{task.title}</p>
              {task.due_date && (
                <p className="text-xs text-muted-foreground">{new Date(task.due_date).toLocaleDateString(locale)}</p>
              )}
            </div>
            <TaskActions taskId={task.id} prospectId={prospectId} />
          </div>
        ))}
        {closedTasks.map((task) => (
          <div key={task.id} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm text-muted-foreground">
            <span className="line-through">{task.title}</span>
            <span className="text-xs">{t(`taskStatus.${task.status}`)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
