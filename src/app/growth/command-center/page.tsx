import { getTranslations, getLocale } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Funnel } from "../analytics/funnel";

// All-time cohort window for MVP -- get_growth_funnel_counts requires an
// explicit range (no default), and a recent window (last 30/90 days) would
// read as empty on a young/low-volume account instead of showing the real
// funnel that exists. A date picker is the natural next iteration, not a
// blocker for this first cut.
const FUNNEL_WINDOW_START = "2020-01-01T00:00:00Z";

type TouchInfo = {
  source: string | null;
  medium: string | null;
  campaign: string | null;
};

function TouchCell({ source, medium, campaign, noneLabel }: TouchInfo & { noneLabel: string }) {
  if (!source && !medium && !campaign) {
    return <span className="text-xs text-muted-foreground">{noneLabel}</span>;
  }
  return (
    <div>
      <p className="font-medium">
        {source ?? "—"}
        {medium ? ` / ${medium}` : ""}
      </p>
      {campaign && <p className="text-xs text-muted-foreground">{campaign}</p>}
    </div>
  );
}

export default async function GrowthCommandCenterPage() {
  const t = await getTranslations("GrowthCommandCenter");
  const locale = await getLocale();
  const supabase = await createClient();

  const [{ data: funnelRows }, { data: attributionRows }] = await Promise.all([
    supabase.rpc("get_growth_funnel_counts", {
      p_start: FUNNEL_WINDOW_START,
      p_end: new Date().toISOString(),
    }),
    supabase.rpc("get_growth_attribution_list", { p_limit: 50 }),
  ]);

  const funnel = funnelRows?.[0];
  const funnelSteps = [
    { label: t("funnel.signups"), value: funnel?.signups ?? 0 },
    { label: t("funnel.webinarCreated"), value: funnel?.webinar_created ?? 0 },
    { label: t("funnel.videoUploaded"), value: funnel?.video_uploaded ?? 0 },
    { label: t("funnel.ctaConfigured"), value: funnel?.cta_configured ?? 0 },
    { label: t("funnel.webinarPublished"), value: funnel?.webinar_published ?? 0 },
    { label: t("funnel.activated"), value: funnel?.activated ?? 0 },
    { label: t("funnel.paid"), value: funnel?.paid ?? 0 },
  ];

  const attributions = attributionRows ?? [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
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
            <h2 className="text-sm font-semibold text-muted-foreground">{t("attributionTitle")}</h2>
            <span className="text-xs text-muted-foreground">
              {t("attributionCount", { count: attributions.length })}
            </span>
          </div>
          {attributions.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noAttribution")}</p>
          ) : (
            <div className="overflow-auto rounded-md border">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-2 text-left font-medium">{t("table.account")}</th>
                    <th className="p-2 text-left font-medium">{t("table.status")}</th>
                    <th className="p-2 text-left font-medium">{t("table.firstTouch")}</th>
                    <th className="p-2 text-left font-medium">{t("table.lastTouch")}</th>
                    <th className="p-2 text-left font-medium">{t("table.updated")}</th>
                  </tr>
                </thead>
                <tbody>
                  {attributions.map((row) => (
                    <tr key={row.account_id} className="border-t align-top">
                      <td className="p-2">
                        <p className="font-medium">{row.account_name}</p>
                        <p className="text-xs text-muted-foreground">{row.account_slug}</p>
                      </td>
                      <td className="p-2">
                        <Badge variant="outline">{row.subscription_status}</Badge>
                      </td>
                      <td className="p-2">
                        <TouchCell
                          source={row.first_touch_source}
                          medium={row.first_touch_medium}
                          campaign={row.first_touch_campaign}
                          noneLabel={t("noSource")}
                        />
                      </td>
                      <td className="p-2">
                        <TouchCell
                          source={row.last_touch_source}
                          medium={row.last_touch_medium}
                          campaign={row.last_touch_campaign}
                          noneLabel={t("noSource")}
                        />
                      </td>
                      <td className="p-2 whitespace-nowrap text-muted-foreground">
                        {new Date(row.computed_at).toLocaleDateString(locale)}
                      </td>
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
