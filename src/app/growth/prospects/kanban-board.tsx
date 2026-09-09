"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";

import { cn } from "@/lib/utils";
import { updateProspectStage } from "@/lib/actions/growth-prospects";
import type { PartnerStage } from "@/lib/supabase/database.types";

export type KanbanProspect = {
  id: string;
  full_name: string | null;
  username: string | null;
  profile_url: string;
  pipeline: string;
  platform: string;
};

type StageOption = { value: PartnerStage; label: string };

type StageMap = Partial<Record<PartnerStage, (KanbanProspect & { stage: PartnerStage })[]>>;

function groupByStage(
  prospects: (KanbanProspect & { stage: PartnerStage })[],
  stages: StageOption[]
): StageMap {
  const map: StageMap = Object.fromEntries(stages.map((s) => [s.value, []]));
  for (const prospect of prospects) {
    map[prospect.stage]?.push(prospect);
  }
  return map;
}

function ProspectCard({
  prospect,
  t,
  draggable,
}: {
  prospect: KanbanProspect;
  t: ReturnType<typeof useTranslations<"GrowthProspects">>;
  draggable: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: prospect.id,
    disabled: !draggable,
  });

  return (
    <div
      ref={setNodeRef}
      {...(draggable ? { ...listeners, ...attributes } : {})}
      style={
        transform
          ? { transform: `translate(${transform.x}px, ${transform.y}px)`, zIndex: 10 }
          : undefined
      }
      className={cn(
        "rounded-lg border bg-background p-3 shadow-sm",
        draggable && "cursor-grab active:cursor-grabbing",
        isDragging && "opacity-40"
      )}
    >
      <Link
        href={`/growth/prospects/${prospect.id}`}
        onClick={(e) => draggable && e.preventDefault()}
        className="block truncate text-sm font-medium hover:underline"
      >
        {prospect.full_name || prospect.username || prospect.profile_url}
      </Link>
      <p className="mt-1 truncate text-xs text-muted-foreground">
        {t(`pipeline.${prospect.pipeline}`)} · {t(`platform.${prospect.platform}`)}
      </p>
    </div>
  );
}

function KanbanColumn({
  stage,
  label,
  prospects,
  t,
  canEdit,
}: {
  stage: PartnerStage;
  label: string;
  prospects: KanbanProspect[];
  t: ReturnType<typeof useTranslations<"GrowthProspects">>;
  canEdit: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-64 shrink-0 flex-col gap-2 rounded-lg border bg-muted/30 p-2",
        isOver && "border-primary bg-muted/60"
      )}
    >
      <div className="flex items-center justify-between px-1 pt-1">
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{label}</p>
        <span className="text-xs text-muted-foreground">{prospects.length}</span>
      </div>
      <div className="flex min-h-16 flex-col gap-2">
        {prospects.map((prospect) => (
          <ProspectCard key={prospect.id} prospect={prospect} t={t} draggable={canEdit} />
        ))}
      </div>
    </div>
  );
}

export function KanbanBoard({
  prospects,
  stages,
  canEdit,
}: {
  prospects: (KanbanProspect & { stage: PartnerStage })[];
  stages: StageOption[];
  canEdit: boolean;
}) {
  const t = useTranslations("GrowthProspects");
  const [columns, setColumns] = useState(() => groupByStage(prospects, stages));
  const [activeProspect, setActiveProspect] = useState<KanbanProspect | null>(null);
  const [, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  function handleDragStart(event: DragStartEvent) {
    const found = Object.values(columns)
      .flatMap((list) => list ?? [])
      .find((p) => p.id === event.active.id);
    setActiveProspect(found ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveProspect(null);
    const { active, over } = event;
    if (!over) return;
    const prospectId = String(active.id);
    const newStage = over.id as PartnerStage;

    setColumns((prev) => {
      const current = Object.entries(prev).find(([, list]) =>
        (list ?? []).some((p) => p.id === prospectId)
      );
      const prospect = current?.[1]?.find((p) => p.id === prospectId);
      if (!prospect || current?.[0] === newStage) return prev;

      const next = { ...prev };
      const fromStage = current![0] as PartnerStage;
      next[fromStage] = (next[fromStage] ?? []).filter((p) => p.id !== prospectId);
      next[newStage] = [...(next[newStage] ?? []), { ...prospect, stage: newStage }];
      return next;
    });

    startTransition(() => updateProspectStage(prospectId, newStage));
  }

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {stages.map((s) => (
          <KanbanColumn
            key={s.value}
            stage={s.value}
            label={s.label}
            prospects={columns[s.value] ?? []}
            t={t}
            canEdit={canEdit}
          />
        ))}
      </div>
      <DragOverlay>
        {activeProspect && <ProspectCard prospect={activeProspect} t={t} draggable={false} />}
      </DragOverlay>
    </DndContext>
  );
}
