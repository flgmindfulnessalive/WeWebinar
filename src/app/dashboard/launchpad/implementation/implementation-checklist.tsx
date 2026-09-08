"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Calendar, Check, DoorOpen, MessageSquare, MousePointerClick, Rocket, Video } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  IMPLEMENTATION_CHECKLIST_ITEM_KEYS,
  TOTAL_IMPLEMENTATION_ITEMS,
  type ImplementationChecklistItemKey,
} from "@/lib/launchpad/implementation-content";
import { trackLaunchpadEvent } from "@/lib/launchpad/track";

const ITEM_ICONS: Record<ImplementationChecklistItemKey, typeof Video> = {
  video: Video,
  schedule: Calendar,
  waitingRoom: DoorOpen,
  chat: MessageSquare,
  ctas: MousePointerClick,
  publish: Rocket,
};

export function ImplementationChecklist({
  projectId,
  initialCheckedItems,
}: {
  projectId: string | null;
  initialCheckedItems: ImplementationChecklistItemKey[];
}) {
  const t = useTranslations("Launchpad.implementation");
  const [checked, setChecked] = useState<Set<ImplementationChecklistItemKey>>(new Set(initialCheckedItems));
  const [savingItem, setSavingItem] = useState<ImplementationChecklistItemKey | null>(null);
  const completedTracked = checked.size === TOTAL_IMPLEMENTATION_ITEMS;

  useEffect(() => {
    if (projectId) trackLaunchpadEvent(projectId, "launchpad_step_started", { step_key: "implementation" });
  }, [projectId]);

  async function toggle(itemKey: ImplementationChecklistItemKey) {
    const nextChecked = !checked.has(itemKey);
    const next = new Set(checked);
    if (nextChecked) next.add(itemKey);
    else next.delete(itemKey);
    setChecked(next);

    if (!projectId) return;
    setSavingItem(itemKey);
    try {
      const response = await fetch("/api/launchpad/implementation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemKey, checked: nextChecked }),
      });
      if (response.ok) {
        trackLaunchpadEvent(projectId, "implementation_item_checked", { item_key: itemKey, checked: nextChecked });
        const data = (await response.json()) as { allDone: boolean };
        if (data.allDone && !completedTracked) {
          trackLaunchpadEvent(projectId, "implementation_completed");
        }
      }
    } catch {
      // Best-effort -- el estado local ya refleja el click del usuario;
      // se reintenta solo si vuelve a tocar el mismo item.
    } finally {
      setSavingItem((prev) => (prev === itemKey ? null : prev));
    }
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-1 pt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("checklistTitle")}</h2>
          <span className="text-sm text-muted-foreground tabular-nums">
            {checked.size}/{TOTAL_IMPLEMENTATION_ITEMS}
          </span>
        </div>

        {IMPLEMENTATION_CHECKLIST_ITEM_KEYS.map((itemKey) => {
          const Icon = ITEM_ICONS[itemKey];
          const isChecked = checked.has(itemKey);
          return (
            <button
              key={itemKey}
              type="button"
              onClick={() => toggle(itemKey)}
              disabled={savingItem === itemKey}
              className="flex items-start gap-3 rounded-lg border border-transparent px-2 py-3 text-left transition-colors hover:border-border hover:bg-muted/50"
            >
              <span
                className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors ${
                  isChecked ? "border-transparent bg-emerald-500 text-white" : "border-input text-transparent"
                }`}
              >
                <Check className="size-3.5" />
              </span>
              <span className="flex flex-1 items-start gap-2.5">
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span className="flex flex-col">
                  <span className={`text-sm font-medium ${isChecked ? "text-muted-foreground line-through" : ""}`}>
                    {t(`items.${itemKey}.title`)}
                  </span>
                  <span className="text-xs text-muted-foreground">{t(`items.${itemKey}.description`)}</span>
                </span>
              </span>
            </button>
          );
        })}

        <div className="mt-3 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {completedTracked ? t("allDoneNote") : t("checklistHint")}
          </p>
          <Button asChild className="text-white shadow-sm" style={{ background: "linear-gradient(90deg, #4f46e5, #c026d3)" }}>
            <Link
              href="/dashboard/webinars/new"
              onClick={() => projectId && trackLaunchpadEvent(projectId, "create_webinar_clicked")}
            >
              {t("ctaCreateWebinar")}
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
