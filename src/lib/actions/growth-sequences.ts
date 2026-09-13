"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { requireGrowthOperator, canEditPartnerEngine } from "@/lib/data/growth";
import type { PartnerChannel, PartnerMessageKind } from "@/lib/supabase/database.types";

export type GrowthActionState = { error: string } | { success: string } | null;

export async function createSequenceStep(
  _prevState: GrowthActionState,
  formData: FormData
): Promise<GrowthActionState> {
  const operator = await requireGrowthOperator();
  const t = await getTranslations("GrowthSequences");
  if (!canEditPartnerEngine(operator.role)) return { error: t("noPermission") };

  const campaignId = String(formData.get("campaign_id") ?? "");
  const channel = String(formData.get("channel") ?? "email") as PartnerChannel;
  const kind = String(formData.get("kind") ?? "follow_up") as PartnerMessageKind;
  const delayDaysRaw = formData.get("delay_days");
  const delayDays = delayDaysRaw ? Number(delayDaysRaw) : 0;
  const subject = String(formData.get("subject") ?? "").trim();
  const bodyTemplate = String(formData.get("body_template") ?? "").trim();

  if (!campaignId || !bodyTemplate || Number.isNaN(delayDays) || delayDays < 0) {
    return { error: t("missingFields") };
  }

  const supabase = await createClient();

  const { data: existingSteps } = await supabase
    .from("partner_sequence_steps")
    .select("step_order")
    .eq("campaign_id", campaignId)
    .order("step_order", { ascending: false })
    .limit(1);
  const nextOrder = (existingSteps?.[0]?.step_order ?? -1) + 1;

  const { error } = await supabase.from("partner_sequence_steps").insert({
    campaign_id: campaignId,
    step_order: nextOrder,
    delay_days: delayDays,
    channel,
    kind,
    subject: subject || null,
    body_template: bodyTemplate,
  });
  if (error) return { error: error.message };

  revalidatePath(`/growth/campaigns/${campaignId}`);
  return { success: t("stepAdded") };
}

export async function deleteSequenceStep(stepId: string, campaignId: string): Promise<void> {
  const operator = await requireGrowthOperator();
  if (!canEditPartnerEngine(operator.role)) return;

  const supabase = await createClient();
  await supabase.from("partner_sequence_steps").delete().eq("id", stepId);
  revalidatePath(`/growth/campaigns/${campaignId}`);
}

// Pausa manual: el operador revisa su inbox real y frena la secuencia de
// un prospect puntual apenas ve que respondió -- no hay detección
// automática de replies en esta pasada (decisión explícita del usuario).
export async function pauseCampaignProspectSequence(campaignId: string, prospectId: string): Promise<void> {
  const operator = await requireGrowthOperator();
  if (!canEditPartnerEngine(operator.role)) return;

  const supabase = await createClient();
  await supabase
    .from("partner_campaign_prospects")
    .update({ status: "paused", paused_at: new Date().toISOString() })
    .eq("campaign_id", campaignId)
    .eq("prospect_id", prospectId);

  revalidatePath(`/growth/campaigns/${campaignId}`);
  revalidatePath(`/growth/prospects/${prospectId}`);
}

export async function resumeCampaignProspectSequence(campaignId: string, prospectId: string): Promise<void> {
  const operator = await requireGrowthOperator();
  if (!canEditPartnerEngine(operator.role)) return;

  const supabase = await createClient();
  // Reanuda inmediatamente elegible para el próximo paso -- el cron la
  // recoge en su próxima corrida en vez de esperar el delay original.
  await supabase
    .from("partner_campaign_prospects")
    .update({ status: "active", paused_at: null, next_send_at: new Date().toISOString() })
    .eq("campaign_id", campaignId)
    .eq("prospect_id", prospectId);

  revalidatePath(`/growth/campaigns/${campaignId}`);
  revalidatePath(`/growth/prospects/${prospectId}`);
}
