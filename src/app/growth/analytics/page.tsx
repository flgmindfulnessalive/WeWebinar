import { getTranslations, getLocale } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StageBadge } from "../stage-badge";
import { scoreBand } from "@/lib/growth/scoring";
import type { PartnerStage } from "@/lib/supabase/database.types";
import { Funnel } from "./funnel";

function formatMrr(amount: number, locale: string): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    amount
  );
}

// Core progression only -- inactive/rejected are exit states, not "further
// along" than active_partner, so they'd break the funnel's shrinking-width
// visual logic. Shown as a separate stat instead (see below).
const FUNNEL_STAGES: PartnerStage[] = [
  "discovered", "qualified", "high_fit", "ready_to_contact", "contacted",
  "replied", "interested", "negotiating", "agreed", "active_partner",
];

const BAND_CLASS: Record<string, string> = {
  low: "border-muted-foreground/30 text-muted-foreground",
  medium: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  high: "border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-300",
  excellent: "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300",
};

export default async function GrowthAnalyticsPage() {
  const t = await getTranslations("GrowthAnalytics");
  const tStage = await getTranslations("GrowthProspects");
  const tBand = await getTranslations("GrowthScoring.band");
  const locale = await getLocale();
  const supabase = await createClient();

  const [{ data: analyticsRows }, { data: revenueRows }] = await Promise.all([
    supabase.rpc("get_growth_analytics"),
    supabase.rpc("get_partner_revenue_summary"),
  ]);
  const data = analyticsRows?.[0];
  const partnerRevenue = revenueRows ?? [];

  const stageCounts = (data?.stage_counts ?? {}) as Record<string, number>;
  const totalProspects = data?.total_prospects ?? 0;
  const analyzedCount = data?.analyzed_count ?? 0;
  const avgFit = data?.avg_fit_score ?? null;
  const avgOpportunity = data?.avg_opportunity_score ?? null;
  const closedCount = (stageCounts.inactive ?? 0) + (stageCounts.rejected ?? 0);

  const funnelSteps = FUNNEL_STAGES.map((stage) => ({
    label: tStage(`stage.${stage}`),
    value: stageCounts[stage] ?? 0,
  }));

  const scoreTiles = [
    { label: t("avgFitScore"), value: avgFit },
    { label: t("avgOpportunityScore"), value: avgOpportunity },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">{t("totalProspects")}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">{totalProspects}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">{t("analyzedCount")}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">
              {analyzedCount}
              <span className="ml-1 text-base font-normal text-muted-foreground">/ {totalProspects}</span>
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">{t("closedCount")}</p>
            <p className="mt-1 text-3xl font-semibold tracking-tight">{closedCount}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {scoreTiles.map(({ label, value }) => (
          <Card key={label}>
            <CardContent className="flex items-center justify-between p-6">
              <div>
                <p className="text-sm text-muted-foreground">{label}</p>
                <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">
                  {value ?? t("noData")}
                </p>
              </div>
              {value !== null && (
                <Badge variant="outline" className={BAND_CLASS[scoreBand(value)]}>
                  {tBand(scoreBand(value))}
                </Badge>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="overflow-x-auto p-6">
          <h2 className="mb-4 text-sm font-semibold text-muted-foreground">{t("funnelTitle")}</h2>
          <div className="min-w-[420px]">
            <Funnel steps={funnelSteps} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground">{t("partnerRevenueTitle")}</h2>
            <span className="text-xs text-muted-foreground">
              {t("partnerRevenueCount", { count: partnerRevenue.length })}
            </span>
          </div>
          {partnerRevenue.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noPartnerRevenue")}</p>
          ) : (
            <div className="overflow-auto rounded-md border">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-2 text-left font-medium">{t("table.partner")}</th>
                    <th className="p-2 text-left font-medium">{t("table.stage")}</th>
                    <th className="p-2 text-left font-medium">{t("table.attributedAccounts")}</th>
                    <th className="p-2 text-left font-medium">{t("table.activeAccounts")}</th>
                    <th className="p-2 text-left font-medium">{t("table.mrr")}</th>
                  </tr>
                </thead>
                <tbody>
                  {partnerRevenue.map((row) => (
                    <tr key={row.prospect_id} className="border-t align-top">
                      <td className="p-2">
                        <p className="font-medium">{row.full_name || row.username || t("notSet")}</p>
                        {row.referral_code && <p className="text-xs text-muted-foreground">{row.referral_code}</p>}
                      </td>
                      <td className="p-2">
                        <StageBadge stage={row.stage} label={tStage(`stage.${row.stage}`)} />
                      </td>
                      <td className="p-2 tabular-nums">{row.attributed_accounts}</td>
                      <td className="p-2 tabular-nums">{row.active_accounts}</td>
                      <td className="p-2 font-medium tabular-nums">{formatMrr(row.mrr_usd, locale)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
