"use client";

import { useActionState } from "react";
import { useTranslations } from "next-intl";

import { createTask } from "@/lib/actions/growth-tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const SELECT_CLASS =
  "flex h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

export type ProspectOption = { id: string; label: string };

export function CreateTaskForm({ prospects }: { prospects: ProspectOption[] }) {
  const t = useTranslations("GrowthTasks");
  const [state, formAction, isPending] = useActionState(createTask, null);

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="title">{t("titleLabel")}</Label>
        <Input id="title" name="title" required placeholder={t("titlePlaceholder")} className="w-64" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="due_date">{t("dueDateLabel")}</Label>
        <Input id="due_date" name="due_date" type="date" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="prospect_id">{t("prospectLabel")}</Label>
        <select id="prospect_id" name="prospect_id" defaultValue="" className={SELECT_CLASS}>
          <option value="">{t("noProspectLinked")}</option>
          {prospects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={isPending}>
        {isPending ? t("creating") : t("addTask")}
      </Button>
      {state && "error" in state && <p className="w-full text-sm text-destructive">{state.error}</p>}
    </form>
  );
}
