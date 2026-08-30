import { NextResponse } from "next/server";
import { getTranslations, getLocale } from "next-intl/server";
import { renderToBuffer } from "@react-pdf/renderer";

import { getCurrentAccount } from "@/lib/data/account";
import { createClient } from "@/lib/supabase/server";
import { secondsToClock } from "@/lib/time";
import { countryDisplayName } from "@/lib/country";
import { registerReportFonts } from "@/lib/pdf-report/fonts";
import {
  WebinarReportDocument,
  type ReportBar,
  type ReportPollGroup,
  type ReportRegistrant,
  type ReportMessage,
  type ReportReaction,
} from "@/lib/pdf-report/webinar-report-document";

const DAY_KEYS = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: webinarId } = await params;

  const current = await getCurrentAccount();
  if (!current) {
    return NextResponse.json({ error: "not authenticated" }, { status: 401 });
  }

  const t = await getTranslations("WebinarAnalytics");
  const tSchedule = await getTranslations("ScheduleSection");
  const tReport = await getTranslations("WebinarReport");
  const tTables = await getTranslations("AnalyticsTables");
  const locale = await getLocale();

  const supabase = await createClient();
  const { data: webinar } = await supabase
    .from("webinars")
    .select("id, title, account_id, presenter_name, schedule_mode")
    .eq("id", webinarId)
    .single();

  if (!webinar || webinar.account_id !== current.account.id) {
    return NextResponse.json({ error: "webinar not found" }, { status: 404 });
  }

  const [
    { data: summaryRows },
    { data: retentionRows },
    { data: ctaRows },
    { data: pollRows },
    { data: registrants },
    { data: clickerRows },
    { data: watchPositionRows },
    { data: schedulePerformanceRows },
    { data: countryRows },
    { data: messageRows },
    { data: reactionRows },
  ] = await Promise.all([
    supabase.rpc("get_webinar_summary", { p_webinar_id: webinarId }),
    supabase.rpc("get_webinar_retention_curve", { p_webinar_id: webinarId }),
    supabase.rpc("get_webinar_cta_stats", { p_webinar_id: webinarId }),
    supabase.rpc("get_webinar_poll_results", { p_webinar_id: webinarId }),
    supabase.rpc("get_webinar_registrants", { p_webinar_id: webinarId }),
    supabase.rpc("get_webinar_cta_clickers", { p_webinar_id: webinarId }),
    supabase.rpc("get_webinar_watch_positions", { p_webinar_id: webinarId }),
    supabase.rpc("get_webinar_schedule_performance", { p_webinar_id: webinarId }),
    supabase.rpc("get_webinar_country_breakdown", { p_webinar_id: webinarId }),
    supabase.rpc("get_webinar_registrant_messages", { p_webinar_id: webinarId }),
    supabase.rpc("get_webinar_reactions", { p_webinar_id: webinarId }),
  ]);

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

  const uniqueClickerCount = new Set((clickerRows ?? []).map((row) => row.registrant_id)).size;
  const watchedHalfCount =
    durationSeconds > 0
      ? Array.from(watchPositionByRegistrant.values()).filter(
          (pos) => (pos ?? 0) >= durationSeconds * 0.5
        ).length
      : 0;

  const funnelBase = registrantCount || 1;
  const funnel = [
    { count: registrantCount, label: t("registrantsLabel"), pctOfFirst: 100 },
    {
      count: attendeeCount,
      label: t("funnelAttended"),
      pctOfFirst: Math.round((attendeeCount / funnelBase) * 100),
    },
    ...(durationSeconds > 0
      ? [
          {
            count: watchedHalfCount,
            label: t("funnelWatchedHalf"),
            pctOfFirst: Math.round((watchedHalfCount / funnelBase) * 100),
          },
        ]
      : []),
    {
      count: uniqueClickerCount,
      label: t("funnelClicked"),
      pctOfFirst: Math.round((uniqueClickerCount / funnelBase) * 100),
    },
  ].map((step) => ({ ...step, countLabel: String(step.count) }));

  const retention = (retentionRows ?? []).map((r) => ({ minute: r.minute, pct: r.pct }));

  function scheduleRowLabel(row: {
    kind: string;
    day_of_week: number | null;
    time_of_day: string | null;
    timezone: string | null;
    offset_minutes: number | null;
  }): { label: string; sublabel: string } {
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

  const scheduleBars: ReportBar[] = (schedulePerformanceRows ?? [])
    .filter((r) => r.registrant_count > 0)
    .map((r) => {
      const { label, sublabel } = scheduleRowLabel(r);
      return {
        label,
        sublabel,
        pct: r.attendance_pct,
        valueLabel: t("scheduleValueLabel", { pct: r.attendance_pct, count: r.registrant_count }),
      };
    });

  // No emoji here (flags or otherwise) -- react-pdf's embedded text fonts
  // don't carry pictograph glyphs, so multi-codepoint flag sequences render
  // as garbled overlapping characters instead of a blank/missing glyph.
  const countryBars: ReportBar[] = (countryRows ?? []).map((r) => {
    const label = r.country ? countryDisplayName(r.country, locale) : t("unknownCountry");
    return {
      label,
      pct: r.registrant_count,
      valueLabel: t("countryValueLabel", { count: r.registrant_count, pct: r.pct }),
    };
  });

  const reportRegistrants: ReportRegistrant[] = (registrants ?? []).map((r) => {
    const pos = watchPositionByRegistrant.get(r.id) ?? null;
    const watchLabel =
      pos === null
        ? tTables("didNotAttend")
        : durationSeconds > 0
          ? `${secondsToClock(pos)} (${Math.round((pos / durationSeconds) * 100)}%)`
          : secondsToClock(pos);
    return {
      name: r.name,
      email: r.email,
      phone: r.phone ?? "—",
      statusLabel: r.unsubscribed_at ? tTables("unsubscribedBadge") : tTables("activeStatus"),
      scheduleLabel: new Date(r.computed_session_start).toLocaleString(locale),
      registeredLabel: new Date(r.created_at).toLocaleString(locale),
      watchLabel,
    };
  });

  const reportMessages: ReportMessage[] = (messageRows ?? []).map((m) => ({
    name: m.name,
    email: m.email,
    minuteLabel: secondsToClock(m.video_timestamp_seconds),
    messageText: m.message_text,
    replyKind: m.ai_reply_text ? "ai" : m.host_replied ? "host" : "none",
    replyText: m.ai_reply_text,
  }));

  // Same font limitation as country flags -- react-pdf's text fonts have no
  // pictograph glyphs, so the raw reaction emoji renders as garbled
  // characters. Swap each of the app's fixed reaction emoji for a short
  // text label instead of leaving it in the PDF's font.
  const REACTION_LABELS: Record<string, string> = {
    "❤️": tTables("reactionLove"),
    "👏": tTables("reactionClap"),
    "😂": tTables("reactionLaugh"),
    "😮": tTables("reactionWow"),
    "👍": tTables("reactionLike"),
  };

  const reportReactions: ReportReaction[] = (reactionRows ?? []).map((r) => ({
    name: r.name,
    email: r.email,
    emoji: REACTION_LABELS[r.emoji] ?? r.emoji,
    minuteLabel: r.video_timestamp_seconds === null ? "—" : secondsToClock(r.video_timestamp_seconds),
  }));

  function ctaLabel(config: unknown, type: string): string {
    const c = (config ?? {}) as Record<string, unknown>;
    if (type === "link") return String(c.text ?? t("typeLinkFallback"));
    if (type === "overlay") return String(c.text ?? c.image_url ?? t("typeOverlayFallback"));
    if (type === "poll") return String(c.question ?? t("typePollFallback"));
    return type;
  }

  const clickersByCta = new Map<string, { name: string; email: string }[]>();
  for (const row of clickerRows ?? []) {
    if (!clickersByCta.has(row.cta_id)) clickersByCta.set(row.cta_id, []);
    clickersByCta.get(row.cta_id)!.push({ name: row.name, email: row.email });
  }

  const ctaBars: ReportBar[] = (ctaRows ?? []).map((c) => ({
    label: ctaLabel(c.config, c.cta_type),
    sublabel: t("ctaAppearsAt", { time: secondsToClock(c.timestamp_start_seconds) }),
    pct: c.clicks,
    valueLabel: t("ctaClicksValueLabel", { clicks: c.clicks, pct: c.conversion_pct }),
    clickers: clickersByCta.get(c.cta_id) ?? [],
  }));

  const pollsByQuestion = new Map<string, ReportPollGroup>();
  for (const row of pollRows ?? []) {
    const key = row.cta_id;
    if (!pollsByQuestion.has(key)) {
      pollsByQuestion.set(key, { question: row.question ?? t("typePollFallback"), bars: [] });
    }
    pollsByQuestion.get(key)!.bars.push({
      label: row.option ?? "—",
      pct: row.votes,
      valueLabel: t("pollVotesValueLabel", { votes: row.votes }),
    });
  }

  const scheduleModeLabel =
    webinar.schedule_mode === "just_in_time"
      ? t("onDemand")
      : webinar.schedule_mode === "both"
        ? tReport("scheduleModeBoth")
        : tReport("scheduleModeFixed");

  registerReportFonts();

  const buffer = await renderToBuffer(
    <WebinarReportDocument
      data={{
        webinarTitle: webinar.title,
        presenterName: webinar.presenter_name,
        scheduleModeLabel,
        dataRangeLabel: tReport("dataRangeAll"),
        generatedAtLabel: tReport("generatedOn", {
          date: new Date().toLocaleString(locale, { dateStyle: "long", timeStyle: "short" }),
        }),
        kpis: [
          { label: t("registrantsLabel"), value: String(registrantCount) },
          {
            label: t("actualAttendeesLabel"),
            value: String(attendeeCount),
            sublabel: t("attendanceRateSublabel", { pct: joinRatePct }),
          },
          {
            label: t("avgWatchTimeLabel"),
            value: secondsToClock(avgWatchSeconds),
            sublabel: durationSeconds > 0 ? t("pctOfVideoSublabel", { pct: watchPct }) : undefined,
          },
          {
            label: t("unsubscribeRateLabel"),
            value: `${unsubscribeRatePct}%`,
            sublabel: t("unsubscribeSublabel", { count: unsubscribedCount, total: registrantCount }),
          },
        ],
        funnel,
        retention,
        retentionCaption: t("retentionTitle"),
        scheduleBars,
        countryBars,
        ctaBars,
        pollGroups: Array.from(pollsByQuestion.values()),
        registrants: reportRegistrants,
        messages: reportMessages,
        reactions: reportReactions,
        labels: {
          funnelTitle: t("funnelTitle"),
          retentionTitle: t("retentionTitle"),
          scheduleTitle: t("scheduleTitle"),
          countryBreakdownTitle: t("countryBreakdownTitle"),
          ctaClicksTitle: t("ctaClicksTitle"),
          pollResultsTitle: t("pollResultsTitle"),
          registrantsTitle: t("registrantsTitle", { count: reportRegistrants.length }),
          chatMessagesTitle: t("chatMessagesTitle", { count: reportMessages.length }),
          reactionsTitle: t("reactionsTitle", { count: reportReactions.length }),
          noScheduleData: tReport("noScheduleData"),
          noCountryData: tReport("noCountryData"),
          noCtaData: tReport("noCtaData"),
          noPollData: tReport("noPollData"),
          ctaClickersLabel: tReport("ctaClickersLabel"),
          footerBrand: tReport("footerBrand"),
          footerConfidential: tReport("footerConfidential"),
          pageOf: (page, total) => tReport("pageOf", { page, total }),
          table: {
            name: tTables("nameHeader"),
            email: tTables("emailHeader"),
            phone: tTables("phoneHeader"),
            status: tTables("statusHeader"),
            schedule: tTables("scheduleHeader"),
            registered: tTables("registeredHeader"),
            watched: tTables("lastMinuteWatchedHeader"),
            attendee: tTables("attendeeHeader"),
            minute: tTables("minuteHeader"),
            message: tTables("messageHeader"),
            reply: tTables("replyHeader"),
            emoji: tTables("emojiHeader"),
            aiReplyBadge: tTables("aiReplyBadge"),
            hostRepliedBadge: tTables("hostRepliedBadge"),
            noReply: tTables("noReply"),
          },
        },
      }}
    />
  );

  const filename = `${webinar.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-reporte.pdf`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
