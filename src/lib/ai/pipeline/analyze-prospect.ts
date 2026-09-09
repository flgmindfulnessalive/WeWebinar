import { createHash } from "node:crypto";
import { z } from "zod";

import { getAIProvider, AIProviderError, AI_MODEL, type AIProvider } from "@/lib/ai";
import type { PartnerPipeline, PartnerPlatform } from "@/lib/supabase/database.types";

// See docs/partner-engine/ARCHITECTURE.md §E: the agent never "investigates"
// on its own -- there's no discovery/enrichment provider connected yet, so
// asking the model to research a creator with no real input would produce
// exactly the fabricated "I loved your content!" the brief explicitly
// forbids. It only structures what the operator already typed in (bio +
// their own notes) -- that's the entire evidence corpus.
export type ProspectEvidence = {
  fullName: string | null;
  username: string | null;
  profileUrl: string;
  platform: PartnerPlatform;
  pipeline: PartnerPipeline;
  bio: string | null;
  notes: string[];
};

export function hasEvidence(evidence: ProspectEvidence): boolean {
  return Boolean(evidence.bio?.trim()) || evidence.notes.some((n) => n.trim().length > 0);
}

// Only the fields that actually change the analysis feed the hash -- not
// created_at/ids, so a redundant refresh (e.g. someone else's page load)
// never invalidates a still-current analysis. Used to skip re-calling the
// LLM when nothing evidentiary changed since the last run (AI cost control,
// ARCHITECTURE.md §33).
export function hashEvidence(evidence: ProspectEvidence): string {
  const canonical = JSON.stringify({
    bio: evidence.bio ?? "",
    notes: [...evidence.notes].sort(),
    platform: evidence.platform,
    pipeline: evidence.pipeline,
  });
  return createHash("sha256").update(canonical).digest("hex");
}

const FitComponentSchema = z.object({
  points: z.number(),
  reason: z.string(),
});

const CreatorResearchSchema = z.object({
  primaryTopics: z.array(z.string()),
  audienceDescription: z.string(),
  probableBusinessModel: z.string(),
  fitComponents: z.object({
    audienceFit: FitComponentSchema,
    problemFit: FitComponentSchema,
    commercialIntent: FitComponentSchema,
    contentRelevance: FitComponentSchema,
    saasAffinity: FitComponentSchema,
    reachQuality: FitComponentSchema,
    brandFit: FitComponentSchema,
  }),
  opportunityComponents: z.object({
    responseProbability: FitComponentSchema,
    easeOfContact: FitComponentSchema,
    audienceQuality: FitComponentSchema,
    estimatedCost: FitComponentSchema,
    saasCollaborationHistory: FitComponentSchema,
    expectedRevenue: FitComponentSchema,
    competition: FitComponentSchema,
  }),
  recommendedPartnership: z.string(),
  recommendedAngle: z.string(),
  personalizationPoints: z.array(z.string()),
  risks: z.array(z.string()),
  summary: z.string(),
});

export type CreatorResearchResult = z.infer<typeof CreatorResearchSchema>;

// Points cap per component, matching ARCHITECTURE.md's Fit/Opportunity
// Score formulas exactly -- also enforced in code (clampFitScore /
// clampOpportunityScore in growth-scoring.ts) since the model's own
// adherence to the prompted caps isn't guaranteed.
export const FIT_MAX = {
  audienceFit: 25,
  problemFit: 20,
  commercialIntent: 15,
  contentRelevance: 15,
  saasAffinity: 10,
  reachQuality: 10,
  brandFit: 5,
} as const;

export const OPPORTUNITY_MAX = {
  responseProbability: 20,
  easeOfContact: 20,
  audienceQuality: 15,
  estimatedCost: 15,
  saasCollaborationHistory: 15,
  expectedRevenue: 10,
  competition: 5,
} as const;

export const PROMPT_VERSION = "creator-research-v1";

export async function analyzeProspect(
  evidence: ProspectEvidence,
  provider: AIProvider = getAIProvider()
): Promise<{
  result: CreatorResearchResult;
  inputTokens: number;
  outputTokens: number;
  promptVersion: string;
  model: string;
}> {
  const evidenceText = [
    evidence.bio?.trim() ? `Bio: ${evidence.bio.trim()}` : null,
    evidence.notes.length > 0
      ? `Notas del equipo:\n${evidence.notes.map((n) => `- ${n}`).join("\n")}`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  try {
    const { object, inputTokens, outputTokens } = await provider.generateStructuredObject({
      system: `Sos un analista de partnerships para WeWebinars, un SaaS que convierte presentaciones grabadas en webinars evergreen automatizados ("Convierte tu mejor presentación en un activo que trabaja por ti 24/7"). Evaluás si un prospect (creator, UGC creator o distribution partner) encaja como canal de adquisición, basándote ÚNICAMENTE en la evidencia provista -- nunca inventes datos que no estén en el texto ni frases como "vi tu contenido" si no hay evidencia real de contenido específico. Si la evidencia es escasa, decilo en "risks" y puntuá conservador en vez de asumir.

fitComponents (qué tan bien encaja como partner), máximos por componente: audienceFit ${FIT_MAX.audienceFit}, problemFit ${FIT_MAX.problemFit}, commercialIntent ${FIT_MAX.commercialIntent}, contentRelevance ${FIT_MAX.contentRelevance}, saasAffinity ${FIT_MAX.saasAffinity}, reachQuality ${FIT_MAX.reachQuality}, brandFit ${FIT_MAX.brandFit}.

opportunityComponents (qué tan fácil/barato es concretarlo, NO qué tan buen fit es), máximos: responseProbability ${OPPORTUNITY_MAX.responseProbability}, easeOfContact ${OPPORTUNITY_MAX.easeOfContact}, audienceQuality ${OPPORTUNITY_MAX.audienceQuality}, estimatedCost ${OPPORTUNITY_MAX.estimatedCost} (más puntos = más barato/accesible), saasCollaborationHistory ${OPPORTUNITY_MAX.saasCollaborationHistory}, expectedRevenue ${OPPORTUNITY_MAX.expectedRevenue}, competition ${OPPORTUNITY_MAX.competition} (más puntos = menos competencia por ese prospect).

Cada "reason" tiene que citar la evidencia concreta que justifica el puntaje, no una frase genérica.`,
      prompt: `Prospect: ${evidence.fullName ?? evidence.username ?? evidence.profileUrl}\nPipeline: ${evidence.pipeline}\nPlataforma: ${evidence.platform}\nURL: ${evidence.profileUrl}\n\nEvidencia disponible:\n${evidenceText || "(sin bio ni notas cargadas todavía)"}`,
      schema: CreatorResearchSchema,
      maxTokens: 3000,
      effort: "medium",
    });

    return { result: object, inputTokens, outputTokens, promptVersion: PROMPT_VERSION, model: AI_MODEL };
  } catch (err) {
    if (err instanceof AIProviderError && err.kind === "rate_limited") {
      throw new Error("El analizador de prospects está saturado, probá de nuevo en un momento.");
    }
    throw err;
  }
}
