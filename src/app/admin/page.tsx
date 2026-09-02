import { getTranslations, getLocale } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { StatTile } from "@/app/dashboard/webinars/[id]/analytics/stat-tile";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatTimeToFirstWebinar(
  hours: number | null,
  t: Awaited<ReturnType<typeof getTranslations<"AdminOverview">>>
): string {
  if (hours === null) return "—";
  if (hours < 48) return t("hoursUnit", { hours: hours.toFixed(1) });
  return t("daysUnit", { days: (hours / 24).toFixed(1) });
}

// Delta text lives in StatTile's sublabel, in the same neutral
// muted-foreground styling as every other sublabel on this page -- no
// green/red semaphore (see stat-tile.tsx's own note on why).
function formatDelta(current: number, previous: number | null): string | null {
  if (previous === null) return null;
  const diff = current - previous;
  if (previous === 0) return diff === 0 ? "=" : diff > 0 ? "+∞%" : "-∞%";
  const pct = (diff / previous) * 100;
  const sign = diff > 0 ? "+" : diff < 0 ? "" : "±";
  return `${sign}${pct.toFixed(1)}%`;
}

export default async function AdminOverviewPage() {
  const t = await getTranslations("AdminOverview");
  const locale = await getLocale();
  const COMPARE_DAYS = 7;
  const supabase = await createClient();
  const [{ data: metricsRows }, { data: scorecardRows }, { data: briefRows }] = await Promise.all([
    supabase.rpc("get_platform_metrics"),
    supabase.rpc("get_platform_scorecard"),
    supabase.rpc("get_platform_metrics_brief", { p_compare_days: COMPARE_DAYS }),
  ]);
  const metrics = metricsRows?.[0];
  const scorecard = scorecardRows?.[0];
  const brief = briefRows?.[0];

  const activeAccounts = metrics?.active_accounts ?? 0;
  const arpa = activeAccounts > 0 ? (metrics?.arr_usd ?? 0) / activeAccounts : null;
  const attendeesPerAccount =
    activeAccounts > 0 ? (metrics?.total_attendees ?? 0) / activeAccounts : null;

  const formatSnapshotDate = (date: string) =>
    new Date(`${date}T00:00:00Z`).toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
    });

  function deltaSublabel(current: number, compareValue: number | null): string | undefined {
    if (!brief) return undefined;
    if (compareValue === null || !brief.compare_snapshot_date) {
      return t("dailyBriefNoCompareNote", { days: COMPARE_DAYS });
    }
    const delta = formatDelta(current, compareValue);
    return `${delta} ${t("dailyBriefVsCompare", {
      days: COMPARE_DAYS,
      date: formatSnapshotDate(brief.compare_snapshot_date),
    })}`;
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <StatTile label={t("totalAccounts")} value={String(metrics?.total_accounts ?? 0)} />
          <StatTile
            label={t("activeAccounts")}
            value={String(activeAccounts)}
            sublabel={t("activeAccountsSublabel")}
          />
          <StatTile
            label={t("trialAccounts")}
            value={String(metrics?.trial_accounts ?? 0)}
            sublabel={t("trialAccountsSublabel")}
          />
          <StatTile
            label={t("mrrLabel")}
            value={`$${(metrics?.mrr_usd ?? 0).toLocaleString(locale, { maximumFractionDigits: 0 })}`}
            sublabel={t("arrSublabel", {
              amount: (metrics?.arr_usd ?? 0).toLocaleString(locale, { maximumFractionDigits: 0 }),
            })}
          />
          <StatTile label={t("activeWebinars")} value={String(metrics?.active_webinars ?? 0)} />
          <StatTile label={t("totalAttendees")} value={String(metrics?.total_attendees ?? 0)} />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">{t("dailyBriefTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("dailyBriefDescription")}</p>
        {!brief ? (
          <Card className="mt-4">
            <CardContent className="pt-6 text-sm text-muted-foreground">
              {t("dailyBriefNoSnapshot")}
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("dailyBriefDate", {
                    date: new Date(`${brief.snapshot_date}T00:00:00Z`).toLocaleDateString(locale, {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    }),
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm">
                {brief.ai_summary ?? t("dailyBriefNoSummary")}
              </CardContent>
            </Card>
            <div className="mt-4 grid gap-4 sm:grid-cols-4">
              <StatTile
                label={t("totalAccounts")}
                value={String(brief.total_accounts)}
                sublabel={deltaSublabel(brief.total_accounts, brief.compare_total_accounts)}
              />
              <StatTile
                label={t("activeAccounts")}
                value={String(brief.active_accounts)}
                sublabel={deltaSublabel(brief.active_accounts, brief.compare_active_accounts)}
              />
              <StatTile
                label={t("mrrLabel")}
                value={`$${brief.mrr_usd.toLocaleString(locale, { maximumFractionDigits: 0 })}`}
                sublabel={deltaSublabel(brief.mrr_usd, brief.compare_mrr_usd)}
              />
              <StatTile
                label={t("activationRate")}
                value={brief.activation_rate_pct !== null ? `${brief.activation_rate_pct}%` : "—"}
                sublabel={
                  brief.activation_rate_pct !== null
                    ? deltaSublabel(brief.activation_rate_pct, brief.compare_activation_rate_pct)
                    : undefined
                }
              />
            </div>
          </>
        )}
      </div>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">{t("northStarTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("northStarDescription")}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 sm:max-w-xl">
          <StatTile
            label={t("conversionActionsGenerated")}
            value={String(scorecard?.conversion_actions_generated ?? 0)}
            sublabel={t("conversionActionsSublabel")}
          />
          <StatTile
            label={t("monthlyPresentationsDelivered")}
            value={String(scorecard?.monthly_automated_presentations_delivered ?? 0)}
            sublabel={t("monthlyPresentationsDeliveredSublabel")}
          />
        </div>
      </div>

      <div>
        <h2 className="text-lg font-semibold tracking-tight">{t("executiveScorecardTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("executiveScorecardDescription")}</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <StatTile
            label={t("activationRate")}
            value={scorecard?.activation_rate_pct !== null && scorecard?.activation_rate_pct !== undefined ? `${scorecard.activation_rate_pct}%` : "—"}
            sublabel={t("activationRateSublabel")}
          />
          <StatTile
            label={t("timeToFirstWebinar")}
            value={formatTimeToFirstWebinar(scorecard?.avg_hours_to_first_webinar ?? null, t)}
            sublabel={t("timeToFirstWebinarSublabel")}
          />
          <StatTile
            label={t("arpa")}
            value={arpa !== null ? `$${arpa.toLocaleString(locale, { maximumFractionDigits: 0 })}` : "—"}
            sublabel={t("arpaSublabel")}
          />
          <StatTile
            label={t("attendeesPerAccount")}
            value={attendeesPerAccount !== null ? attendeesPerAccount.toFixed(1) : "—"}
            sublabel={t("attendeesPerAccountSublabel")}
          />
        </div>

        <Card className="mt-4">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("notYetInstrumentedTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {t("notYetInstrumentedBody")}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
