import type { WebinarProjectProfile } from "./types";

export const STAGE_KEYS = [
  "basics",
  "audience",
  "belief",
  "mechanism",
  "evidence",
  "offer",
  "voice",
] as const;
export type StageKey = (typeof STAGE_KEYS)[number];

type ProfileFieldName = keyof WebinarProjectProfile;

// Qué campos pertenecen a cada etapa -- usado por ProjectReview para
// saber a qué paso mandar al usuario si algo falta, y por el wizard para
// saber si una etapa está "tocada".
export const STAGE_FIELDS: Record<StageKey, ProfileFieldName[]> = {
  basics: [
    "projectName",
    "productName",
    "productType",
    "productDescription",
    "productPrice",
    "currency",
    "offerUrl",
    "desiredDuration",
  ],
  audience: [
    "targetAudience",
    "audienceAwareness",
    "currentSituation",
    "mainProblem",
    "frustrations",
    "desiredResult",
  ],
  belief: ["currentBelief", "commonSolution", "whyCommonSolutionFails", "rootCause", "newParadigm"],
  mechanism: ["mechanismName", "mechanismDescription", "mechanismSteps", "differentiators"],
  evidence: ["founderStory", "credentials", "proofPoints", "evidenceLimitations"],
  offer: [
    "offerName",
    "deliverables",
    "benefits",
    "bonuses",
    "pricingStructure",
    "guarantee",
    "riskReversal",
    "legitimateUrgency",
    "objections",
    "primaryCta",
    "ctaType",
    "ctaUrl",
  ],
  voice: [
    "webinarTitle",
    "presentationFormat",
    "deliveryStyle",
    "scriptDetail",
    "language",
    "forbiddenWords",
    "requiredConcepts",
    "additionalInstructions",
  ],
};

// Los 9 campos que el brief marca como críticos (sección 9): sin estos,
// el prompt resultante es genérico al punto de no ser accionable.
export const CRITICAL_FIELDS: ProfileFieldName[] = [
  "productName",
  "targetAudience",
  "mainProblem",
  "desiredResult",
  "rootCause",
  "newParadigm",
  "mechanismDescription",
  "offerName",
  "primaryCta",
];

// El resto de los campos "de contenido" que cuentan para el % de
// completitud (se excluyen los puramente cosméticos/de sistema:
// projectName, currency, offerUrl, ctaUrl, forbiddenWords,
// additionalInstructions, businessType heredado).
export const RECOMMENDED_FIELDS: ProfileFieldName[] = [
  "productType",
  "productDescription",
  "desiredDuration",
  "audienceAwareness",
  "currentSituation",
  "frustrations",
  "commonSolution",
  "whyCommonSolutionFails",
  "currentBelief",
  "mechanismName",
  "mechanismSteps",
  "differentiators",
  "founderStory",
  "credentials",
  "proofPoints",
  "deliverables",
  "benefits",
  "pricingStructure",
  "guarantee",
  "ctaType",
  "webinarTitle",
  "presentationFormat",
  "deliveryStyle",
  "scriptDetail",
  "language",
];

// Todos los campos que entran en el cálculo de completitud --
// críticos + recomendados. Los "opcionales" (bonuses, riskReversal,
// legitimateUrgency, objections, evidenceLimitations, requiredConcepts,
// forbiddenWords, additionalInstructions, offerUrl, currency, ctaUrl,
// productPrice) no restan ni suman puntos: son valiosos si están, pero
// no penalizan un perfil por default.
export const COMPLETION_TRACKED_FIELDS: ProfileFieldName[] = [...CRITICAL_FIELDS, ...RECOMMENDED_FIELDS];
