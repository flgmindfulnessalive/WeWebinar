import { z } from "zod";

import {
  AWARENESS_LEVELS,
  CTA_TYPES,
  DURATION_BUCKETS,
  EVIDENCE_TYPES,
  OFFER_TYPES,
  PRESENTATION_FORMATS,
  PROJECT_LANGUAGES,
  SCRIPT_DETAIL_LEVELS,
  TONES,
} from "./types";

// Mismo criterio que src/lib/readiness/validation.ts: Zod para un payload
// con muchos campos tipados contra un vocabulario cerrado, en vez de
// validación manual campo por campo.

const SHORT_TEXT = z.string().trim().max(300);
const LONG_TEXT = z.string().trim().max(4000);
const URL_FIELD = z.url().max(500).optional();
const STRING_LIST = z.array(z.string().trim().max(300)).max(20).optional();

const ProofPointSchema = z.object({
  type: z.enum(EVIDENCE_TYPES),
  label: SHORT_TEXT,
  url: URL_FIELD,
  note: LONG_TEXT.optional(),
});

// Todo opcional -- el perfil se llena progresivamente a lo largo de 7
// etapas y se guarda con autoguardado, nunca de una sola vez.
export const WebinarProjectProfileSchema = z.object({
  projectName: SHORT_TEXT.optional(),
  businessType: SHORT_TEXT.optional(),
  productName: SHORT_TEXT.optional(),
  productType: z.enum(OFFER_TYPES).optional(),
  productDescription: LONG_TEXT.optional(),
  productPrice: z.number().min(0).max(10_000_000).optional(),
  currency: z.string().trim().max(10).optional(),
  offerUrl: URL_FIELD,
  desiredDuration: z.enum(DURATION_BUCKETS).optional(),
  desiredDurationCustomMinutes: z.number().int().min(1).max(240).optional(),

  targetAudience: LONG_TEXT.optional(),
  audienceAwareness: z.enum(AWARENESS_LEVELS).optional(),
  currentSituation: LONG_TEXT.optional(),
  mainProblem: LONG_TEXT.optional(),
  frustrations: LONG_TEXT.optional(),
  desiredResult: LONG_TEXT.optional(),

  currentBelief: LONG_TEXT.optional(),
  commonSolution: LONG_TEXT.optional(),
  whyCommonSolutionFails: LONG_TEXT.optional(),
  rootCause: LONG_TEXT.optional(),
  newParadigm: LONG_TEXT.optional(),

  mechanismName: SHORT_TEXT.optional(),
  mechanismDescription: LONG_TEXT.optional(),
  mechanismSteps: z.array(SHORT_TEXT).max(3).optional(),
  differentiators: LONG_TEXT.optional(),

  founderStory: LONG_TEXT.optional(),
  credentials: LONG_TEXT.optional(),
  proofPoints: z.array(ProofPointSchema).max(10).optional(),
  evidenceLimitations: LONG_TEXT.optional(),

  offerName: SHORT_TEXT.optional(),
  deliverables: STRING_LIST,
  benefits: STRING_LIST,
  bonuses: STRING_LIST,
  pricingStructure: LONG_TEXT.optional(),
  guarantee: LONG_TEXT.optional(),
  riskReversal: LONG_TEXT.optional(),
  legitimateUrgency: LONG_TEXT.optional(),
  objections: STRING_LIST,
  primaryCta: SHORT_TEXT.optional(),
  ctaType: z.enum(CTA_TYPES).optional(),
  ctaUrl: URL_FIELD,

  webinarTitle: SHORT_TEXT.optional(),
  presentationFormat: z.enum(PRESENTATION_FORMATS).optional(),
  deliveryStyle: z.array(z.enum(TONES)).max(TONES.length).optional(),
  scriptDetail: z.enum(SCRIPT_DETAIL_LEVELS).optional(),
  language: z.enum(PROJECT_LANGUAGES).optional(),
  forbiddenWords: STRING_LIST,
  requiredConcepts: STRING_LIST,
  additionalInstructions: LONG_TEXT.optional(),
});

const MAX_TEXT_LENGTH = 200;
const attributionField = z.string().trim().max(MAX_TEXT_LENGTH).optional();

export const ScriptBuilderSaveSchema = z.object({
  projectId: z.uuid(),
  assessmentId: z.uuid().optional(),
  profile: WebinarProjectProfileSchema,
  attribution: z.object({
    source: attributionField,
    medium: attributionField,
    campaign: attributionField,
    content: attributionField,
    affiliate: attributionField,
    ref: attributionField,
  }),
  lead: z
    .object({
      name: z.string().trim().min(2).max(MAX_TEXT_LENGTH),
      email: z.email().max(MAX_TEXT_LENGTH),
      consentGiven: z.literal(true),
      marketingConsent: z.boolean(),
    })
    .optional(),
  // Honeypot silencioso -- ver /api/script-builder/save.
  website: z.string().max(MAX_TEXT_LENGTH).optional().default(""),
});

export type ScriptBuilderSavePayload = z.infer<typeof ScriptBuilderSaveSchema>;

const KNOWN_EVENT_TYPES = [
  "script_builder_viewed",
  "script_builder_started",
  "script_builder_resumed",
  "script_builder_step_started",
  "script_builder_step_completed",
  "script_builder_progress_saved",
  "script_builder_review_viewed",
  "script_builder_lead_form_viewed",
  "script_builder_lead_submitted",
  "script_prompt_generated",
  "script_prompt_viewed",
  "script_prompt_copied",
  "script_chatgpt_opened",
  "script_answers_edited",
  "script_project_restarted",
  "script_wewebinars_cta_viewed",
  "script_wewebinars_cta_clicked",
] as const;
export type ScriptBuilderEventType = (typeof KNOWN_EVENT_TYPES)[number];

export const ScriptBuilderEventSchema = z.object({
  projectId: z.uuid(),
  eventType: z.enum(KNOWN_EVENT_TYPES),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional().default({}),
});

export type ScriptBuilderEventPayload = z.infer<typeof ScriptBuilderEventSchema>;
