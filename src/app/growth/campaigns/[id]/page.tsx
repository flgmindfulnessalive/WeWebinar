import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { StageBadge } from "../../stage-badge";
import { CampaignStatusSelect } from "./campaign-status-select";
import { RemoveFromCampaignButton } from "./remove-from-campaign-button";

export default async function GrowthCampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("GrowthCampaigns");
  const tProspects = await getTranslations("GrowthProspects");
  const supabase = await createClient();

  const { data: campaign } = await supabase
    .from("partner_campaigns")
    .select("id, name, pipeline, status, message_strategy, offer, created_at")
    .eq("id", id)
    .maybeSingle();

  if (!campaign) notFound();

  const { data: roster } = await supabase
    .from("partner_campaign_prospects")
    .select("prospect_id, added_at, partner_prospects(id, full_name, username, profile_url, stage)")
    .eq("campaign_id", id)
    .order("added_at", { ascending: false });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">{campaign.name}</h1>
          <p className="text-sm text-muted-foreground">{t(`pipeline.${campaign.pipeline}`)}</p>
        </div>
        <CampaignStatusSelect campaignId={campaign.id} currentStatus={campaign.status} />
      </div>

      {(campaign.offer || campaign.message_strategy) && (
        <Card>
          <CardContent className="flex flex-col gap-3 p-6">
            {campaign.offer && (
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("offerLabel")}</p>
                <p className="text-sm">{campaign.offer}</p>
              </div>
            )}
            {campaign.message_strategy && (
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{t("messageStrategyLabel")}</p>
                <p className="text-sm whitespace-pre-wrap">{campaign.message_strategy}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <div>
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
          {t("roster", { count: roster?.length ?? 0 })}
        </h2>
        <Card>
          <CardContent className="divide-y p-0">
            {(!roster || roster.length === 0) && (
              <p className="p-6 text-center text-sm text-muted-foreground">{t("emptyRoster")}</p>
            )}
            {roster?.map((entry) => {
              const prospect = entry.partner_prospects;
              if (!prospect) return null;
              return (
                <div key={entry.prospect_id} className="flex items-center justify-between gap-4 p-4">
                  <Link href={`/growth/prospects/${prospect.id}`} className="text-sm font-medium hover:underline">
                    {prospect.full_name || prospect.username || prospect.profile_url}
                  </Link>
                  <div className="flex items-center gap-3">
                    <StageBadge stage={prospect.stage} label={tProspects(`stage.${prospect.stage}`)} />
                    <RemoveFromCampaignButton
                      prospectId={prospect.id}
                      campaignId={campaign.id}
                      label={t("removeFromCampaign")}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
