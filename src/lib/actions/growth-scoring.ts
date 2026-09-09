"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";

import { createClient } from "@/lib/supabase/server";
import { requireGrowthOperator, canEditPartnerEngine } from "@/lib/data/growth";
import {
  analyzeProspect,
  hashEvidence,
  hasEvidence,
  type ProspectEvidence,
  type CreatorResearchResult,
} from "@/lib/ai/pipeline/analyze-prospect";
import { generateOutreachMessage } from "@/lib/ai/pipeline/generate-outreach-message";
import { computeFitScore, computeOpportunityScore } from "@/lib/growth/scoring";
import type { Database, Json, PartnerChannel, PartnerMessageKind } from "@/lib/supabase/database.types";

export type GrowthActionState = { error: string } | { success: string } | null;

async function logActivity(
  supabase: Awaited<ReturnType<typeof createClient>>,
  prospectId: string,
  type: Database["public"]["Tables"]["partner_activity_log"]["Row"]["type"],
  actorId: string,
  payload: Json = {}
) {
  await supabase.from("partner_activity_log").insert({ prospect_id: prospectId, type, actor_id: actorId, payload });
}

async function loadEvidence(
  supabase: Awaited<ReturnType<typeof createClient>>,
  prospectId: string
): Promise<ProspectEvidence | null> {
  const { data: prospect } = await supabase
    .from("partner_prospects")
    .select("full_name, username, profile_url, platform, pipeline, bio")
    .eq("id", prospectId)
    .maybeSingle();
  if (!prospect) return null;

  const { data: notes } = await supabase
    .from("partner_notes")
    .select("body")
    .eq("prospect_id", prospectId)
    .order("created_at", { ascending: false });

  return {
    fullName: prospect.full_name,
    username: prospect.username,
    profileUrl: prospect.profile_url,
    platform: prospect.platform,
    pipeline: prospect.pipeline,
    bio: prospect.bio,
    notes: (notes ?? []).map((n) => n.body),
  };
}

// Botón "Analizar con IA" del detalle -- no está atado a un form (sin
// inputs propios), así que se llama directo desde un client component con
// useTransition, mismo patrón que updateProspectStage/archiveProspect.
export async function analyzeProspectAction(
  prospectId: string,
  { force = false }: { force?: boolean } = {}
): Promise<GrowthActionState> {
  const operator = await requireGrowthOperator();
  const t = await getTranslations("GrowthScoring");
  if (!canEditPartnerEngine(operator.role)) return { error: t("noPermission") };

  const supabase = await createClient();
  const evidence = await loadEvidence(supabase, prospectId);
  if (!evidence) return { error: t("prospectNotFound") };
  if (!hasEvidence(evidence)) return { error: t("noEvidence") };

  const sourceHash = hashEvidence(evidence);

  if (!force) {
    const { data: latest } = await supabase
      .from("partner_ai_analyses")
      .select("id, source_hash")
      .eq("prospect_id", prospectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latest?.source_hash === sourceHash) {
      return { success: t("alreadyUpToDate") };
    }
  }

  let outcome: Awaited<ReturnType<typeof analyzeProspect>>;
  try {
    outcome = await analyzeProspect(evidence);
  } catch (err) {
    console.error(`[growth] analyzeProspect failed for ${prospectId}:`, err);
    return { error: err instanceof Error ? err.message : t("analysisFailed") };
  }

  const { data: analysisRow, error: analysisError } = await supabase
    .from("partner_ai_analyses")
    .insert({
      prospect_id: prospectId,
      prompt_version: outcome.promptVersion,
      model: outcome.model,
      source_hash: sourceHash,
      result: outcome.result as unknown as Json,
      input_tokens: outcome.inputTokens,
      output_tokens: outcome.outputTokens,
    })
    .select("id")
    .single();
  if (analysisError) return { error: analysisError.message };

  const fit = computeFitScore(outcome.result);
  const opportunity = computeOpportunityScore(outcome.result);

  const { error: scoreError } = await supabase.from("partner_scores").insert({
    prospect_id: prospectId,
    fit_score: fit.score,
    fit_breakdown: fit.breakdown as unknown as Json,
    opportunity_score: opportunity.score,
    opportunity_breakdown: opportunity.breakdown as unknown as Json,
    based_on_analysis_id: analysisRow.id,
  });
  if (scoreError) return { error: scoreError.message };

  await logActivity(supabase, prospectId, "analyzed", operator.userId, { analysis_id: analysisRow.id });
  await logActivity(supabase, prospectId, "score_updated", operator.userId, {
    fit_score: fit.score,
    opportunity_score: opportunity.score,
  });

  revalidatePath(`/growth/prospects/${prospectId}`);
  return { success: t("analysisComplete") };
}

export async function generateMessageAction(
  _prevState: GrowthActionState,
  formData: FormData
): Promise<GrowthActionState> {
  const operator = await requireGrowthOperator();
  const t = await getTranslations("GrowthScoring");
  if (!canEditPartnerEngine(operator.role)) return { error: t("noPermission") };

  const prospectId = String(formData.get("prospect_id") ?? "");
  const channel = String(formData.get("channel") ?? "") as PartnerChannel;
  const kind = String(formData.get("kind") ?? "") as PartnerMessageKind;
  if (!prospectId || !channel || !kind) return { error: t("missingFields") };

  const supabase = await createClient();

  const [{ data: prospect }, { data: latestAnalysis }] = await Promise.all([
    supabase.from("partner_prospects").select("full_name, username, pipeline").eq("id", prospectId).maybeSingle(),
    supabase
      .from("partner_ai_analyses")
      .select("result")
      .eq("prospect_id", prospectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (!prospect) return { error: t("prospectNotFound") };
  if (!latestAnalysis) return { error: t("analyzeFirst") };

  let generated: Awaited<ReturnType<typeof generateOutreachMessage>>;
  try {
    generated = await generateOutreachMessage({
      fullName: prospect.full_name,
      username: prospect.username,
      pipeline: prospect.pipeline,
      channel,
      kind,
      analysis: latestAnalysis.result as unknown as CreatorResearchResult,
    });
  } catch (err) {
    console.error(`[growth] generateOutreachMessage failed for ${prospectId}:`, err);
    return { error: err instanceof Error ? err.message : t("messageGenerationFailed") };
  }

  const { error } = await supabase.from("partner_messages").insert({
    prospect_id: prospectId,
    channel,
    kind,
    body: generated.body,
    created_by: operator.userId,
  });
  if (error) return { error: error.message };

  await logActivity(supabase, prospectId, "message_generated", operator.userId, { channel, kind });
  revalidatePath(`/growth/prospects/${prospectId}`);
  return { success: t("messageGenerated") };
}

export async function markMessageSent(messageId: string, prospectId: string): Promise<void> {
  const operator = await requireGrowthOperator();
  if (!canEditPartnerEngine(operator.role)) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("partner_messages")
    .update({ status: "marked_sent", sent_at: new Date().toISOString() })
    .eq("id", messageId);
  if (!error) {
    await supabase
      .from("partner_prospects")
      .update({ last_contact_at: new Date().toISOString() })
      .eq("id", prospectId);
    await logActivity(supabase, prospectId, "marked_contacted", operator.userId, { message_id: messageId });
  }
  revalidatePath(`/growth/prospects/${prospectId}`);
}
