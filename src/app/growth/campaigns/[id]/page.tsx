import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent } from "@/components/ui/card";
import { StageBadge } from "../../stage-badge";
import { CampaignStatusSelect } from "./campaign-status-select";
import { RemoveFromCampaignButton } from "./remove-from-campaign-button";
import { SequenceStepForm } from "./sequence-step-form";
import { DeleteSequenceStepButton } from "./delete-sequence-step-button";
import { CampaignProspectSequenceControl } from "./campaign-prospect-sequence-control";

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

  const [{ data: roster }, { data: sequenceSteps }] = await Promise.all([
    supabase
      .from("partner_campaign_prospects")
      .select(
        "prospect_id, added_at, status, current_step, next_send_at, partner_prospects(id, full_name, username, profile_url, stage)"
      )
      .eq("campaign_id", id)
      .order("added_at", { ascending: false }),
    supabase
      .from("partner_sequence_steps")
      .select("id, step_order, delay_days, channel, kind, subject, body_template")
      .eq("campaign_id", id)
      .order("step_order", { ascending: true }),
  ]);
  const steps = sequenceSteps ?? [];

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
        <h2 className="mb-3 text-sm font-semibold text-muted-foreground">{t("sequenceTitle")}</h2>
        <Card>
          <CardContent className="flex flex-col gap-4 p-6">
            {steps.length > 0 && (
              <div className="flex flex-col divide-y rounded-md border">
                {steps.map((step, i) => (
                  <div key={step.id} className="flex items-start justify-between gap-4 p-3">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-xs font-medium text-muted-foreground">
                        {t("stepLabel", { number: i + 1 })} ·{" "}
                        {step.delay_days === 0 ? t("sendImmediately") : t("delayDaysValue", { days: step.delay_days })}
                      </p>
                      {step.subject && <p className="text-sm font-medium">{step.subject}</p>}
                      <p className="line-clamp-2 text-sm text-muted-foreground">{step.body_template}</p>
                    </div>
                    <DeleteSequenceStepButton stepId={step.id} campaignId={campaign.id} label={t("removeStep")} />
                  </div>
                ))}
              </div>
            )}
            {steps.length === 0 && <p className="text-sm text-muted-foreground">{t("noSteps")}</p>}
            <SequenceStepForm campaignId={campaign.id} />
          </CardContent>
        </Card>
      </div>

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
                <div key={entry.prospect_id} className="flex flex-col gap-2 p-4">
                  <div className="flex items-center justify-between gap-4">
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
                  <CampaignProspectSequenceControl
                    campaignId={campaign.id}
                    prospectId={prospect.id}
                    status={entry.status}
                    currentStep={entry.current_step}
                    totalSteps={steps.length}
                    nextSendAt={entry.next_send_at}
                  />
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
