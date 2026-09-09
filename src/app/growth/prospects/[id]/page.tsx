import { notFound } from "next/navigation";
import { getTranslations, getLocale } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { requireGrowthOperator, canEditPartnerEngine } from "@/lib/data/growth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StageBadge } from "../../stage-badge";
import { StageSelect } from "./stage-select";
import { ArchiveButton } from "./archive-button";
import { AnalyzeButton } from "./analyze-button";
import { ScorePanel } from "./score-panel";
import { MessagesSection, type ProspectMessage } from "./messages-section";
import { NotesSection, type ProspectNote } from "./notes-section";
import type { ScoreBreakdown } from "@/lib/growth/scoring";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export default async function GrowthProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const operator = await requireGrowthOperator();
  const t = await getTranslations("GrowthProspects");
  const tScoring = await getTranslations("GrowthScoring");
  const locale = await getLocale();
  const supabase = await createClient();

  const { data: prospect } = await supabase
    .from("partner_prospects")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!prospect) notFound();

  const [{ data: rawNotes }, { data: activity }, { data: latestScore }, { data: messages }] = await Promise.all([
    supabase
      .from("partner_notes")
      .select("id, body, created_at, author_id")
      .eq("prospect_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("partner_activity_log")
      .select("id, type, payload, created_at")
      .eq("prospect_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("partner_scores")
      .select("fit_score, fit_breakdown, opportunity_score, opportunity_breakdown")
      .eq("prospect_id", id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("partner_messages")
      .select("id, channel, kind, body, status, created_at")
      .eq("prospect_id", id)
      .order("created_at", { ascending: false }),
  ]);

  const authorIds = [...new Set((rawNotes ?? []).map((n) => n.author_id))];
  const { data: authors } = authorIds.length
    ? await supabase.from("users").select("id, email").in("id", authorIds)
    : { data: [] as { id: string; email: string }[] };
  const emailById = new Map((authors ?? []).map((a) => [a.id, a.email]));
  const notes: ProspectNote[] = (rawNotes ?? []).map((n) => ({
    id: n.id,
    body: n.body,
    created_at: n.created_at,
    author_email: emailById.get(n.author_id) ?? null,
  }));

  const displayName = prospect.full_name || prospect.username || prospect.profile_url;
  const canEdit = canEditPartnerEngine(operator.role);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
            {initials(displayName) || "?"}
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="text-xl font-semibold tracking-tight">{displayName}</h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <Badge variant="outline">{t(`pipeline.${prospect.pipeline}`)}</Badge>
              <Badge variant="outline">{t(`platform.${prospect.platform}`)}</Badge>
              <a href={prospect.profile_url} target="_blank" rel="noreferrer" className="underline underline-offset-4">
                {t("viewProfile")}
              </a>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canEdit ? (
            <StageSelect prospectId={prospect.id} currentStage={prospect.stage} />
          ) : (
            <StageBadge stage={prospect.stage} label={t(`stage.${prospect.stage}`)} />
          )}
          {canEdit && <AnalyzeButton prospectId={prospect.id} hasAnalysis={Boolean(latestScore)} />}
          {canEdit && <ArchiveButton prospectId={prospect.id} />}
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t("tabOverview")}</TabsTrigger>
          <TabsTrigger value="analysis">{tScoring("tabAnalysis")}</TabsTrigger>
          <TabsTrigger value="messages">{tScoring("tabMessages", { count: messages?.length ?? 0 })}</TabsTrigger>
          <TabsTrigger value="notes">{t("tabNotes", { count: notes.length })}</TabsTrigger>
          <TabsTrigger value="activity">{t("tabActivity")}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("fieldEmail")}</p>
                <p className="text-sm">{prospect.email ?? t("notSet")}</p>
              </div>
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("fieldFollowers")}</p>
                <p className="text-sm">{prospect.follower_count ?? t("notSet")}</p>
              </div>
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("fieldCountry")}</p>
                <p className="text-sm">{prospect.country ?? t("notSet")}</p>
              </div>
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("fieldSource")}</p>
                <p className="text-sm">{prospect.source}</p>
              </div>
              <div className="sm:col-span-2">
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("fieldBio")}</p>
                <p className="text-sm whitespace-pre-wrap">{prospect.bio ?? t("notSet")}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="flex flex-col gap-4">
          {latestScore ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <ScorePanel
                title={tScoring("fitScoreTitle")}
                score={latestScore.fit_score}
                breakdown={latestScore.fit_breakdown as ScoreBreakdown}
                namespace="GrowthScoring"
              />
              <ScorePanel
                title={tScoring("opportunityScoreTitle")}
                score={latestScore.opportunity_score}
                breakdown={latestScore.opportunity_breakdown as ScoreBreakdown}
                namespace="GrowthScoring"
              />
            </div>
          ) : (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">
                {tScoring("noAnalysisYet")}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="messages">
          <Card>
            <CardContent className="p-6">
              <MessagesSection
                prospectId={prospect.id}
                messages={(messages ?? []) as ProspectMessage[]}
                hasAnalysis={Boolean(latestScore)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card>
            <CardContent className="p-6">
              <NotesSection prospectId={prospect.id} notes={notes} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity">
          <Card>
            <CardContent className="divide-y p-0">
              {(!activity || activity.length === 0) && (
                <p className="p-6 text-center text-sm text-muted-foreground">{t("noActivity")}</p>
              )}
              {activity?.map((event) => (
                <div key={event.id} className="flex items-center justify-between gap-4 p-4 text-sm">
                  <span>{t(`activity.${event.type}`)}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(event.created_at).toLocaleString(locale)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
