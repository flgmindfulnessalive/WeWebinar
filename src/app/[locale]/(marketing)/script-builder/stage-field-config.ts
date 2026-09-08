// Configuración declarativa de qué widget usar por campo, por etapa --
// maneja StageForm para no repetir 7 componentes de etapa casi idénticos
// (63 campos en total repartidos en 7 pantallas: mismo layout de
// título+progreso+nav, solo cambian los campos). Solo dice "qué tipo de
// input", nunca copy -- las etiquetas siempre vienen de useTranslations en
// stage-form.tsx (sitio bilingüe, nada de texto fijo acá).

import {
  AWARENESS_LEVELS,
  CTA_TYPES,
  DURATION_BUCKETS,
  OFFER_TYPES,
  PRESENTATION_FORMATS,
  PROJECT_LANGUAGES,
  SCRIPT_DETAIL_LEVELS,
  TONES,
  type WebinarProjectProfile,
} from "@/lib/script-builder/types";
import { CRITICAL_FIELDS, STAGE_FIELDS, type StageKey } from "@/lib/script-builder/profile-config";

type ProfileFieldName = keyof WebinarProjectProfile;

export type FieldDescriptor =
  | { kind: "text"; key: ProfileFieldName; url?: boolean }
  | { kind: "textarea"; key: ProfileFieldName }
  | { kind: "number"; key: ProfileFieldName; min?: number; max?: number; showIf?: (profile: WebinarProjectProfile) => boolean }
  | { kind: "singleSelect"; key: ProfileFieldName; options: readonly string[]; columns?: 1 | 2 }
  | { kind: "multiSelect"; key: ProfileFieldName; options: readonly string[]; max?: number }
  | { kind: "stringList"; key: ProfileFieldName; max: number }
  | { kind: "proofPoints"; key: "proofPoints" };

function isCritical(key: ProfileFieldName): boolean {
  return (CRITICAL_FIELDS as ProfileFieldName[]).includes(key);
}

export const STAGE_FIELD_CONFIG: Record<StageKey, FieldDescriptor[]> = {
  basics: [
    { kind: "text", key: "projectName" },
    { kind: "text", key: "productName" },
    { kind: "singleSelect", key: "productType", options: OFFER_TYPES },
    { kind: "textarea", key: "productDescription" },
    { kind: "number", key: "productPrice", min: 0 },
    { kind: "text", key: "currency" },
    { kind: "text", key: "offerUrl", url: true },
    { kind: "singleSelect", key: "desiredDuration", options: DURATION_BUCKETS },
    {
      kind: "number",
      key: "desiredDurationCustomMinutes",
      min: 1,
      max: 240,
      showIf: (profile) => profile.desiredDuration === "custom",
    },
  ],
  audience: [
    { kind: "textarea", key: "targetAudience" },
    { kind: "singleSelect", key: "audienceAwareness", options: AWARENESS_LEVELS },
    { kind: "textarea", key: "currentSituation" },
    { kind: "textarea", key: "mainProblem" },
    { kind: "textarea", key: "frustrations" },
    { kind: "textarea", key: "desiredResult" },
  ],
  belief: [
    { kind: "textarea", key: "currentBelief" },
    { kind: "textarea", key: "commonSolution" },
    { kind: "textarea", key: "whyCommonSolutionFails" },
    { kind: "textarea", key: "rootCause" },
    { kind: "textarea", key: "newParadigm" },
  ],
  mechanism: [
    { kind: "text", key: "mechanismName" },
    { kind: "textarea", key: "mechanismDescription" },
    { kind: "stringList", key: "mechanismSteps", max: 3 },
    { kind: "textarea", key: "differentiators" },
  ],
  evidence: [
    { kind: "textarea", key: "founderStory" },
    { kind: "textarea", key: "credentials" },
    { kind: "proofPoints", key: "proofPoints" },
    { kind: "textarea", key: "evidenceLimitations" },
  ],
  offer: [
    { kind: "text", key: "offerName" },
    { kind: "stringList", key: "deliverables", max: 20 },
    { kind: "stringList", key: "benefits", max: 20 },
    { kind: "stringList", key: "bonuses", max: 20 },
    { kind: "textarea", key: "pricingStructure" },
    { kind: "textarea", key: "guarantee" },
    { kind: "textarea", key: "riskReversal" },
    { kind: "textarea", key: "legitimateUrgency" },
    { kind: "stringList", key: "objections", max: 20 },
    { kind: "text", key: "primaryCta" },
    { kind: "singleSelect", key: "ctaType", options: CTA_TYPES },
    { kind: "text", key: "ctaUrl", url: true },
  ],
  voice: [
    { kind: "text", key: "webinarTitle" },
    { kind: "singleSelect", key: "presentationFormat", options: PRESENTATION_FORMATS },
    { kind: "multiSelect", key: "deliveryStyle", options: TONES },
    { kind: "singleSelect", key: "scriptDetail", options: SCRIPT_DETAIL_LEVELS, columns: 1 },
    { kind: "singleSelect", key: "language", options: PROJECT_LANGUAGES },
    { kind: "stringList", key: "forbiddenWords", max: 20 },
    { kind: "stringList", key: "requiredConcepts", max: 20 },
    { kind: "textarea", key: "additionalInstructions" },
  ],
};

// Confirma en tiempo de import que la config cubre al menos los mismos
// campos que profile-config.ts declaró para cada etapa -- si alguien
// agrega un campo a STAGE_FIELDS y se olvida acá, esto explota temprano
// en vez de silenciosamente perder un campo del wizard. No exige match
// exacto de tamaño: desiredDurationCustomMinutes es un campo condicional
// (showIf) que no vive en STAGE_FIELDS/COMPLETION_TRACKED_FIELDS porque
// solo aplica cuando desiredDuration === "custom".
for (const stage of Object.keys(STAGE_FIELD_CONFIG) as StageKey[]) {
  const configured = new Set(STAGE_FIELD_CONFIG[stage].map((f) => f.key));
  const expected = STAGE_FIELDS[stage];
  const missing = expected.filter((key) => !configured.has(key));
  if (missing.length > 0) {
    throw new Error(`[script-builder] STAGE_FIELD_CONFIG.${stage} no cubre: ${missing.join(", ")}`);
  }
}

export { isCritical };
