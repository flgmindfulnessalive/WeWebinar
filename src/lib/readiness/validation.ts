import { z } from "zod";

import { isKnownQuestionId } from "./questions";
import {
  ANSWER_VALUES,
  BUSINESS_TYPES,
  PRESENTATION_STATUSES,
  PRIMARY_GOALS,
  TOTAL_QUESTIONS,
} from "./types";

// Primera Server Action/route del repo que valida con Zod en vez de a
// mano campo por campo (el patrón existente en src/lib/actions/*.ts y las
// demás route.ts) -- decisión deliberada, no un reemplazo silencioso: 30
// respuestas tipadas contra un set cerrado de question_id es exactamente
// el caso donde un schema declarativo evita que la validación manual y el
// config de preguntas se desincronicen con el tiempo.

const MAX_TEXT_LENGTH = 200;
const attributionField = z.string().trim().max(MAX_TEXT_LENGTH).optional();

const AnswerSchema = z.object({
  questionId: z.string().refine(isKnownQuestionId, { message: "unknown question_id" }),
  answer: z.enum(ANSWER_VALUES),
});

export const ReadinessSubmitSchema = z.object({
  assessmentId: z.uuid(),
  startedAt: z.iso.datetime(),
  answers: z
    .array(AnswerSchema)
    .length(TOTAL_QUESTIONS)
    .refine(
      (answers) => new Set(answers.map((a) => a.questionId)).size === TOTAL_QUESTIONS,
      { message: "duplicate or missing question_id" }
    ),
  context: z.object({
    businessType: z.enum(BUSINESS_TYPES),
    presentationStatus: z.enum(PRESENTATION_STATUSES),
    primaryGoal: z.enum(PRIMARY_GOALS),
  }),
  lead: z.object({
    name: z.string().trim().min(2).max(MAX_TEXT_LENGTH),
    email: z.email().max(MAX_TEXT_LENGTH),
    consentGiven: z.literal(true),
    marketingConsent: z.boolean(),
  }),
  attribution: z.object({
    source: attributionField,
    medium: attributionField,
    campaign: attributionField,
    content: attributionField,
    affiliate: attributionField,
    ref: attributionField,
  }),
  // Honeypot silencioso: un campo que ningún usuario real completa. Si
  // llega no-vacío, el endpoint responde éxito (para no delatar el
  // honeypot a un bot) pero descarta el envío sin persistir nada.
  website: z.string().max(MAX_TEXT_LENGTH).optional().default(""),
});

export type ReadinessSubmitPayload = z.infer<typeof ReadinessSubmitSchema>;

const KNOWN_EVENT_TYPES = [
  "readiness_viewed",
  "readiness_started",
  "readiness_context_completed",
  "readiness_category_started",
  "readiness_category_completed",
  "readiness_progress_saved",
  "readiness_lead_form_viewed",
  "readiness_lead_submitted",
  "readiness_completed",
  "readiness_result_viewed",
  "readiness_cta_clicked",
  "readiness_blueprint_clicked",
  "readiness_restarted",
] as const;
export type ReadinessEventType = (typeof KNOWN_EVENT_TYPES)[number];

export const ReadinessEventSchema = z.object({
  assessmentId: z.uuid(),
  eventType: z.enum(KNOWN_EVENT_TYPES),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional().default({}),
});

export type ReadinessEventPayload = z.infer<typeof ReadinessEventSchema>;
