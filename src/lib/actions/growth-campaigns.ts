"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { requireGrowthOperator, canEditPartnerEngine } from "@/lib/data/growth";
import type { PartnerCampaignStatus, PartnerPipeline } from "@/lib/supabase/database.types";

export type GrowthActionState = { error: string } | { success: string } | null;

const PIPELINES: PartnerPipeline[] = ["creator", "ugc", "distribution"];
function isPipeline(value: string): value is PartnerPipeline {
  return (PIPELINES as string[]).includes(value);
}

export async function createCampaign(
  _prevState: GrowthActionState,
  formData: FormData
): Promise<GrowthActionState> {
  const operator = await requireGrowthOperator();
  const t = await getTranslations("GrowthCampaigns");
  if (!canEditPartnerEngine(operator.role)) return { error: t("noPermission") };

  const name = String(formData.get("name") ?? "").trim();
  const rawPipeline = String(formData.get("pipeline") ?? "");
  const messageStrategy = String(formData.get("message_strategy") ?? "").trim();
  const offer = String(formData.get("offer") ?? "").trim();

  if (!name || !isPipeline(rawPipeline)) {
    return { error: t("missingFields") };
  }

  const supabase = await createClient();
  const { data: created, error } = await supabase
    .from("partner_campaigns")
    .insert({
      name,
      pipeline: rawPipeline,
      message_strategy: messageStrategy || null,
      offer: offer || null,
      owner_id: operator.userId,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/growth/campaigns");
  redirect(`/growth/campaigns/${created.id}`);
}

export async function updateCampaignStatus(campaignId: string, status: PartnerCampaignStatus): Promise<void> {
  const operator = await requireGrowthOperator();
  if (!canEditPartnerEngine(operator.role)) return;

  const supabase = await createClient();
  await supabase.from("partner_campaigns").update({ status }).eq("id", campaignId);
  revalidatePath(`/growth/campaigns/${campaignId}`);
  revalidatePath("/growth/campaigns");
}

// Idempotente: agregar un prospect ya asignado no duplica ni falla --
// primary key compuesta (campaign_id, prospect_id) en el join table.
export async function assignProspectToCampaign(prospectId: string, campaignId: string): Promise<GrowthActionState> {
  const operator = await requireGrowthOperator();
  const t = await getTranslations("GrowthCampaigns");
  if (!canEditPartnerEngine(operator.role)) return { error: t("noPermission") };
  if (!campaignId) return { error: t("selectCampaign") };

  const supabase = await createClient();
  const { error } = await supabase
    .from("partner_campaign_prospects")
    .upsert({ campaign_id: campaignId, prospect_id: prospectId }, { onConflict: "campaign_id,prospect_id" });
  if (error) return { error: error.message };

  revalidatePath(`/growth/prospects/${prospectId}`);
  revalidatePath(`/growth/campaigns/${campaignId}`);
  return { success: t("assigned") };
}

export async function removeProspectFromCampaign(prospectId: string, campaignId: string): Promise<void> {
  const operator = await requireGrowthOperator();
  if (!canEditPartnerEngine(operator.role)) return;

  const supabase = await createClient();
  await supabase
    .from("partner_campaign_prospects")
    .delete()
    .eq("campaign_id", campaignId)
    .eq("prospect_id", prospectId);

  revalidatePath(`/growth/prospects/${prospectId}`);
  revalidatePath(`/growth/campaigns/${campaignId}`);
}
