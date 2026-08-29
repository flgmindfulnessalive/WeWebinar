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

export default async function AdminOverviewPage() {
  const t = await getTranslations("AdminOverview");
  const locale = await getLocale();
  const supabase = await createClient();
  const [{ data: metricsRows }, { data: scorecardRows }] = await Promise.all([
    supabase.rpc("get_platform_metrics"),
    supabase.rpc("get_platform_scorecard"),
  ]);
  const metrics = metricsRows?.[0];
  const scorecard = scorecardRows?.[0];

  const activeAccounts = metrics?.active_accounts ?? 0;
  const arpa = activeAccounts > 0 ? (metrics?.arr_usd ?? 0) / activeAccounts : null;
  const attendeesPerAccount =
    activeAccounts > 0 ? (metrics?.total_attendees ?? 0) / activeAccounts : null;

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
        <h2 className="text-lg font-semibold tracking-tight">{t("northStarTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("northStarDescription")}</p>
        <div className="mt-4 max-w-xs">
          <StatTile
            label={t("conversionActionsGenerated")}
            value={String(scorecard?.conversion_actions_generated ?? 0)}
            sublabel={t("conversionActionsSublabel")}
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
