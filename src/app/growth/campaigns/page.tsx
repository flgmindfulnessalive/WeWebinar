import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateCampaignDialog } from "./create-campaign-dialog";

export default async function GrowthCampaignsPage() {
  const t = await getTranslations("GrowthCampaigns");
  const supabase = await createClient();

  const { data: campaigns } = await supabase
    .from("partner_campaigns")
    .select("id, name, pipeline, status, created_at, partner_campaign_prospects(count)")
    .order("created_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <CreateCampaignDialog />
      </div>

      <Card>
        <CardContent className="divide-y p-0">
          {(!campaigns || campaigns.length === 0) && (
            <p className="p-6 text-center text-sm text-muted-foreground">{t("noCampaigns")}</p>
          )}
          {campaigns?.map((campaign) => (
            <Link
              key={campaign.id}
              href={`/growth/campaigns/${campaign.id}`}
              className="flex items-center justify-between gap-4 p-4 hover:bg-accent/50"
            >
              <div className="flex flex-col gap-1">
                <span className="text-sm font-medium">{campaign.name}</span>
                <span className="text-xs text-muted-foreground">
                  {t(`pipeline.${campaign.pipeline}`)} ·{" "}
                  {t("prospectCount", { count: campaign.partner_campaign_prospects[0]?.count ?? 0 })}
                </span>
              </div>
              <Badge variant="outline">{t(`status.${campaign.status}`)}</Badge>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
