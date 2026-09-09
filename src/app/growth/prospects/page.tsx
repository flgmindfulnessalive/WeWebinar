import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { LayoutList, Kanban as KanbanIcon } from "lucide-react";

import { createClient } from "@/lib/supabase/server";
import { requireGrowthOperator, canEditPartnerEngine } from "@/lib/data/growth";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { AddProspectDialog } from "./add-prospect-dialog";
import { StageBadge } from "../stage-badge";
import { KanbanBoard } from "./kanban-board";
import type { PartnerPipeline, PartnerStage } from "@/lib/supabase/database.types";

const PIPELINES: PartnerPipeline[] = ["creator", "ugc", "distribution"];
const STAGES: PartnerStage[] = [
  "discovered", "qualified", "high_fit", "ready_to_contact", "contacted",
  "replied", "interested", "negotiating", "agreed", "active_partner",
  "inactive", "rejected",
];

const SELECT_CLASS =
  "flex h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50";

export default async function GrowthProspectsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; pipeline?: string; stage?: string; view?: string }>;
}) {
  const { q, pipeline, stage, view } = await searchParams;
  const isKanban = view === "kanban";
  const t = await getTranslations("GrowthProspects");
  const operator = await requireGrowthOperator();
  const supabase = await createClient();

  let query = supabase
    .from("partner_prospects")
    .select("id, full_name, username, profile_url, pipeline, platform, stage, follower_count, created_at")
    .is("archived_at", null)
    .order("created_at", { ascending: false });

  if (q) query = query.or(`full_name.ilike.%${q}%,username.ilike.%${q}%,profile_url.ilike.%${q}%`);
  if (pipeline && (PIPELINES as string[]).includes(pipeline)) {
    query = query.eq("pipeline", pipeline as PartnerPipeline);
  }
  // The Kanban view partitions by every stage at once, so a stage filter
  // wouldn't do anything useful there -- only applied in list view.
  if (!isKanban && stage && (STAGES as string[]).includes(stage)) {
    query = query.eq("stage", stage as PartnerStage);
  }

  const { data: prospects } = await query.limit(100);

  const viewQuery = (v: string) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (pipeline) params.set("pipeline", pipeline);
    if (v === "kanban") params.set("view", "kanban");
    const qs = params.toString();
    return `/growth/prospects${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border p-0.5">
            <Link
              href={viewQuery("list")}
              aria-label={t("viewList")}
              className={cn(
                "flex size-8 items-center justify-center rounded",
                !isKanban && "bg-accent"
              )}
            >
              <LayoutList className="size-4" />
            </Link>
            <Link
              href={viewQuery("kanban")}
              aria-label={t("viewKanban")}
              className={cn(
                "flex size-8 items-center justify-center rounded",
                isKanban && "bg-accent"
              )}
            >
              <KanbanIcon className="size-4" />
            </Link>
          </div>
          <AddProspectDialog />
        </div>
      </div>

      <form className="flex flex-wrap items-end gap-3">
        {isKanban && <input type="hidden" name="view" value="kanban" />}
        <div className="grid gap-1.5">
          <label htmlFor="q" className="text-xs font-medium text-muted-foreground">
            {t("searchLabel")}
          </label>
          <Input id="q" name="q" defaultValue={q ?? ""} placeholder={t("searchPlaceholder")} className="w-64" />
        </div>
        <div className="grid gap-1.5">
          <label htmlFor="pipeline" className="text-xs font-medium text-muted-foreground">
            {t("pipelineLabel")}
          </label>
          <select id="pipeline" name="pipeline" defaultValue={pipeline ?? ""} className={SELECT_CLASS}>
            <option value="">{t("allPipelines")}</option>
            <option value="creator">{t("pipeline.creator")}</option>
            <option value="ugc">{t("pipeline.ugc")}</option>
            <option value="distribution">{t("pipeline.distribution")}</option>
          </select>
        </div>
        {!isKanban && (
          <div className="grid gap-1.5">
            <label htmlFor="stage" className="text-xs font-medium text-muted-foreground">
              {t("stageLabel")}
            </label>
            <select id="stage" name="stage" defaultValue={stage ?? ""} className={SELECT_CLASS}>
              <option value="">{t("allStages")}</option>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {t(`stage.${s}`)}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          type="submit"
          className="h-9 rounded-md border px-3 text-sm font-medium hover:bg-accent"
        >
          {t("filter")}
        </button>
      </form>

      {isKanban ? (
        <KanbanBoard
          prospects={prospects ?? []}
          stages={STAGES.map((s) => ({ value: s, label: t(`stage.${s}`) }))}
          canEdit={canEditPartnerEngine(operator.role)}
        />
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {(!prospects || prospects.length === 0) && (
              <p className="p-6 text-center text-sm text-muted-foreground">{t("noProspects")}</p>
            )}
            {prospects?.map((prospect) => (
              <Link
                key={prospect.id}
                href={`/growth/prospects/${prospect.id}`}
                className="flex items-center justify-between gap-4 p-4 hover:bg-accent/50"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate text-sm font-medium">
                    {prospect.full_name || prospect.username || prospect.profile_url}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {t(`pipeline.${prospect.pipeline}`)} · {t(`platform.${prospect.platform}`)}
                    {prospect.follower_count != null &&
                      ` · ${t("followersCount", { count: prospect.follower_count })}`}
                  </span>
                </div>
                <StageBadge stage={prospect.stage} label={t(`stage.${prospect.stage}`)} />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
