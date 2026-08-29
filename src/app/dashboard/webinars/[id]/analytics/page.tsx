import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download } from "lucide-react";
import { getTranslations, getLocale } from "next-intl/server";

import { getCurrentAccount } from "@/lib/data/account";
import { createClient } from "@/lib/supabase/server";
import { secondsToClock } from "@/lib/time";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatTile } from "./stat-tile";
import { RetentionChart } from "./retention-chart";
import { HorizontalBarChart } from "./bar-chart";
import { CtaClickersToggle } from "./cta-clickers";
import { RegistrantsTable } from "./registrants-table";
import { MessagesTable } from "./messages-table";
import { Funnel } from "./funnel";
import { ConcurrentViewersChart } from "./concurrent-viewers-chart";

function ctaLabel(
  config: unknown,
  type: string,
  t: Awaited<ReturnType<typeof getTranslations<"WebinarAnalytics">>>
): string {
  const c = (config ?? {}) as Record<string, unknown>;
  if (type === "link") return String(c.text ?? t("typeLinkFallback"));
  if (type === "overlay") return String(c.text ?? c.image_url ?? t("typeOverlayFallback"));
  if (type === "poll") return String(c.question ?? t("typePollFallback"));
  return type;
}

// Hidden for now -- the metric didn't land well visually, revisit later.
// The RPC/chart stay wired so re-enabling is just flipping this back.
const SHOW_CONCURRENT_VIEWERS = false;

const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

function scheduleRowLabel(
  row: {
    kind: string;
    day_of_week: number | null;
    time_of_day: string | null;
    timezone: string | null;
    offset_minutes: number | null;
  },
  t: Awaited<ReturnType<typeof getTranslations<"WebinarAnalytics">>>,
  tSchedule: Awaited<ReturnType<typeof getTranslations<"ScheduleSection">>>
): { label: string; sublabel: string } {
  if (row.kind === "jit") {
    return {
      label: t("startsInMinutes", { minutes: row.offset_minutes ?? 0 }),
      sublabel: t("onDemand"),
    };
  }
  const day = row.day_of_week === null ? tSchedule("allDays") : tSchedule(DAY_KEYS[row.day_of_week]);
  const time = row.time_of_day?.slice(0, 5) ?? "";
  return { label: `${day} · ${time}`, sublabel: row.timezone ?? "" };
}

export default async function WebinarAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: webinarId } = await params;
  const current = await getCurrentAccount();
  if (!current) return null;

  const t = await getTranslations("WebinarAnalytics");
  const tWizard = await getTranslations("WebinarWizard");
  const tSchedule = await getTranslations("ScheduleSection");
  const locale = await getLocale();
  const supabase = await createClient();
  const { data: webinar } = await supabase
    .from("webinars")
    .select("id, title, account_id")
    .eq("id", webinarId)
    .single();

  if (!webinar || webinar.account_id !== current.account.id) notFound();

  const [
    { data: summaryRows },
    { data: retentionRows },
    { data: ctaRows },
    { data: pollRows },
    { data: registrants, error: registrantsError },
    { data: clickerRows },
    { data: watchPositionRows },
    { data: messageRows },
    { data: schedulePerformanceRows },
    { data: concurrentViewerRows },
  ] = await Promise.all([
    supabase.rpc("get_webinar_summary", { p_webinar_id: webinarId }),
    supabase.rpc("get_webinar_retention_curve", { p_webinar_id: webinarId }),
    supabase.rpc("get_webinar_cta_stats", { p_webinar_id: webinarId }),
    supabase.rpc("get_webinar_poll_results", { p_webinar_id: webinarId }),
    supabase.rpc("get_webinar_registrants", { p_webinar_id: webinarId }),
    supabase.rpc("get_webinar_cta_clickers", { p_webinar_id: webinarId }),
    supabase.rpc("get_webinar_watch_positions", { p_webinar_id: webinarId }),
    supabase.rpc("get_webinar_registrant_messages", { p_webinar_id: webinarId }),
    supabase.rpc("get_webinar_schedule_performance", { p_webinar_id: webinarId }),
    supabase.rpc("get_webinar_concurrent_viewers", { p_webinar_id: webinarId }),
  ]);

  if (registrantsError) {
    // Was silently treated as "no registrants" before -- that's misleading
    // when the list is actually just failing to load (RLS hiccup, transient
    // network/schema-cache issue, etc.), so surface it distinctly instead.
    console.error("[analytics] registrants query failed:", registrantsError);
  }

  const watchPositionByRegistrant = new Map(
    (watchPositionRows ?? []).map((row) => [row.registrant_id, row.last_position_seconds])
  );

  const summary = summaryRows?.[0];
  const registrantCount = summary?.registrant_count ?? 0;
  const attendeeCount = summary?.attendee_count ?? 0;
  const avgWatchSeconds = summary?.avg_watch_seconds ?? 0;
  const durationSeconds = summary?.duration_seconds ?? 0;
  const joinRatePct = registrantCount > 0 ? Math.round((attendeeCount / registrantCount) * 100) : 0;
  const watchPct = durationSeconds > 0 ? Math.round((avgWatchSeconds / durationSeconds) * 100) : 0;

  const unsubscribedCount = (registrants ?? []).filter((r) => r.unsubscribed_at).length;
  const unsubscribeRatePct =
    registrantCount > 0 ? Math.round((unsubscribedCount / registrantCount) * 1000) / 10 : 0;

  // Distinct people who clicked *any* CTA -- clickerRows is per-CTA, so the
  // same registrant can appear more than once if they clicked several.
  const uniqueClickerCount = new Set((clickerRows ?? []).map((row) => row.registrant_id)).size;
  const watchedHalfCount =
    durationSeconds > 0
      ? Array.from(watchPositionByRegistrant.values()).filter(
          (pos) => (pos ?? 0) >= durationSeconds * 0.5
        ).length
      : 0;

  const funnelSteps = [
    { label: t("registrantsLabel"), sublabel: t("funnelBase"), value: registrantCount },
    { label: t("funnelAttended"), sublabel: t("funnelJoinedRoom"), value: attendeeCount },
    ...(durationSeconds > 0
      ? [{ label: t("funnelWatchedHalf"), sublabel: t("funnelOfVideo"), value: watchedHalfCount }]
      : []),
    { label: t("funnelClicked"), sublabel: t("funnelOnSomeCta"), value: uniqueClickerCount },
  ];

  const retentionPoints = (retentionRows ?? []).map((r) => ({
    minute: r.minute,
    viewersRemaining: r.viewers_remaining,
    pct: r.pct,
  }));

  const scheduleBars = (schedulePerformanceRows ?? [])
    .filter((r) => r.registrant_count > 0)
    .map((r) => {
      const { label, sublabel } = scheduleRowLabel(r, t, tSchedule);
      return {
        id: r.schedule_id ?? `jit-${r.offset_minutes}`,
        label,
        sublabel,
        value: r.attendance_pct,
        valueLabel: t("scheduleValueLabel", {
          pct: r.attendance_pct,
          count: r.registrant_count,
        }),
      };
    });

  const concurrentViewerPoints = (concurrentViewerRows ?? []).map((r) => ({
    minute: r.minute,
    concurrentViewers: r.concurrent_viewers,
  }));
  const concurrentViewerSession = concurrentViewerRows?.[0];

  const ctaBars = (ctaRows ?? []).map((c) => ({
    id: c.cta_id,
    label: ctaLabel(c.config, c.cta_type, t),
    sublabel: t("ctaAppearsAt", { time: secondsToClock(c.timestamp_start_seconds) }),
    value: c.clicks,
    valueLabel: t("ctaClicksValueLabel", { clicks: c.clicks, pct: c.conversion_pct }),
  }));

  const clickersByCta = new Map<
    string,
    { registrantId: string; name: string; email: string; clickedAt: string; clickCount: number }[]
  >();
  for (const row of clickerRows ?? []) {
    if (!clickersByCta.has(row.cta_id)) clickersByCta.set(row.cta_id, []);
    clickersByCta.get(row.cta_id)!.push({
      registrantId: row.registrant_id,
      name: row.name,
      email: row.email,
      clickedAt: row.clicked_at,
      clickCount: row.click_count,
    });
  }

  const pollsByQuestion = new Map<string, { question: string; bars: { id: string; label: string; value: number; valueLabel: string }[] }>();
  for (const row of pollRows ?? []) {
    const key = row.cta_id;
    if (!pollsByQuestion.has(key)) {
      pollsByQuestion.set(key, { question: row.question ?? t("typePollFallback"), bars: [] });
    }
    pollsByQuestion.get(key)!.bars.push({
      id: `${key}-${row.option}`,
      label: row.option ?? "—",
      value: row.votes,
      valueLabel: t("pollVotesValueLabel", { votes: row.votes }),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href={`/dashboard/webinars/${webinarId}`}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">
            {webinar.title} · {tWizard("analytics")}
          </h1>
        </div>
        <Button asChild variant="outline" className="w-fit">
          <a href={`/api/webinars/${webinarId}/export`}>
            <Download className="size-4" />
            {t("exportCsv")}
          </a>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={t("registrantsLabel")} value={String(registrantCount)} />
        <StatTile
          label={t("actualAttendeesLabel")}
          value={String(attendeeCount)}
          sublabel={t("attendanceRateSublabel", { pct: joinRatePct })}
        />
        <StatTile
          label={t("avgWatchTimeLabel")}
          value={secondsToClock(avgWatchSeconds)}
          sublabel={durationSeconds > 0 ? t("pctOfVideoSublabel", { pct: watchPct }) : undefined}
        />
        <StatTile
          label={t("unsubscribeRateLabel")}
          value={`${unsubscribeRatePct}%`}
          sublabel={t("unsubscribeSublabel", {
            count: unsubscribedCount,
            total: registrantCount,
          })}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("funnelTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Funnel steps={funnelSteps} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("retentionTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RetentionChart points={retentionPoints} />
        </CardContent>
      </Card>

      {scheduleBars.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("scheduleTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart bars={scheduleBars} />
          </CardContent>
        </Card>
      )}

      {SHOW_CONCURRENT_VIEWERS && concurrentViewerPoints.length > 0 && concurrentViewerSession && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("concurrentViewersTitle")}
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              {t("concurrentViewersSublabel", {
                date: new Date(concurrentViewerSession.session_starts_at).toLocaleString(locale),
                count: concurrentViewerSession.session_registrant_count,
              })}
            </p>
          </CardHeader>
          <CardContent>
            <ConcurrentViewersChart points={concurrentViewerPoints} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("registrantsTitle", { count: registrants?.length ?? 0 })}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {registrantsError ? (
            <p className="text-sm text-destructive">{t("registrantsLoadError")}</p>
          ) : !registrants || registrants.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noRegistrantsYet")}</p>
          ) : (
            <RegistrantsTable
              durationSeconds={durationSeconds}
              registrants={registrants.map((r) => ({
                id: r.id,
                name: r.name,
                email: r.email,
                phone: r.phone,
                computedSessionStart: r.computed_session_start,
                createdAt: r.created_at,
                unsubscribedAt: r.unsubscribed_at,
                lastPositionSeconds: watchPositionByRegistrant.get(r.id) ?? null,
              }))}
            />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("ctaClicksTitle")}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <HorizontalBarChart bars={ctaBars} />
          {ctaBars.map((bar) => (
            <CtaClickersToggle
              key={bar.id}
              label={bar.label}
              clickers={clickersByCta.get(bar.id) ?? []}
            />
          ))}
        </CardContent>
      </Card>

      {(messageRows?.length ?? 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("chatMessagesTitle", { count: messageRows!.length })}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MessagesTable
              messages={messageRows!.map((m) => ({
                id: m.id,
                registrantId: m.registrant_id,
                name: m.name,
                email: m.email,
                messageText: m.message_text,
                videoTimestampSeconds: m.video_timestamp_seconds,
                aiReplyText: m.ai_reply_text,
                aiRepliedAt: m.ai_replied_at,
                hostReplied: m.host_replied,
                createdAt: m.created_at,
              }))}
            />
          </CardContent>
        </Card>
      )}

      {pollsByQuestion.size > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("pollResultsTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {Array.from(pollsByQuestion.entries()).map(([ctaId, poll]) => (
              <div key={ctaId} className="flex flex-col gap-2">
                <p className="text-sm font-medium">{poll.question}</p>
                <HorizontalBarChart bars={poll.bars} />
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
