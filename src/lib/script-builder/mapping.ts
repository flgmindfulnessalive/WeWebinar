// Traduce entre WebinarProjectProfile (camelCase, tal como vive en el
// cliente/el dominio) y las columnas de public.webinar_projects
// (snake_case). Dominio puro -- sin dependencias de Supabase -- para que
// tanto /api/script-builder/save como el evento script_prompt_generated
// (que reconstruye el prompt server-side a partir de la fila) puedan
// usarla sin duplicar el mapeo.

import type { ProofPoint, WebinarProjectProfile } from "./types";

// Solo las columnas de perfil (no id/account_id/status/lead_*/atribución/
// ip_hash/timestamps, que se manejan aparte en cada caller).
export type WebinarProjectProfileRow = {
  project_name: string | null;
  business_type: string | null;
  product_name: string | null;
  product_type: string | null;
  product_description: string | null;
  product_price: number | null;
  currency: string | null;
  offer_url: string | null;
  desired_duration: string | null;
  desired_duration_custom_minutes: number | null;
  target_audience: string | null;
  audience_awareness: string | null;
  current_situation: string | null;
  main_problem: string | null;
  frustrations: string | null;
  desired_result: string | null;
  current_belief: string | null;
  common_solution: string | null;
  why_common_solution_fails: string | null;
  root_cause: string | null;
  new_paradigm: string | null;
  mechanism_name: string | null;
  mechanism_description: string | null;
  mechanism_steps: string[];
  differentiators: string | null;
  founder_story: string | null;
  credentials: string | null;
  proof_points: ProofPoint[];
  evidence_limitations: string | null;
  offer_name: string | null;
  deliverables: string[];
  benefits: string[];
  bonuses: string[];
  pricing_structure: string | null;
  guarantee: string | null;
  risk_reversal: string | null;
  legitimate_urgency: string | null;
  objections: string[];
  primary_cta: string | null;
  cta_type: string | null;
  cta_url: string | null;
  webinar_title: string | null;
  presentation_format: string | null;
  delivery_style: string[];
  script_detail: string | null;
  language: string | null;
  forbidden_words: string[];
  required_concepts: string[];
  additional_instructions: string | null;
};

// Solo incluye las claves presentes en el perfil de entrada (undefined ->
// omitida, no null) -- así el .upsert() de Supabase nunca pisa con null
// una columna que el autoguardado de esta llamada no tocó.
export function profileToRow(profile: WebinarProjectProfile): Partial<WebinarProjectProfileRow> {
  const row: Partial<WebinarProjectProfileRow> = {};
  if (profile.projectName !== undefined) row.project_name = profile.projectName || null;
  if (profile.businessType !== undefined) row.business_type = profile.businessType || null;
  if (profile.productName !== undefined) row.product_name = profile.productName || null;
  if (profile.productType !== undefined) row.product_type = profile.productType || null;
  if (profile.productDescription !== undefined) row.product_description = profile.productDescription || null;
  if (profile.productPrice !== undefined) row.product_price = profile.productPrice ?? null;
  if (profile.currency !== undefined) row.currency = profile.currency || null;
  if (profile.offerUrl !== undefined) row.offer_url = profile.offerUrl || null;
  if (profile.desiredDuration !== undefined) row.desired_duration = profile.desiredDuration || null;
  if (profile.desiredDurationCustomMinutes !== undefined)
    row.desired_duration_custom_minutes = profile.desiredDurationCustomMinutes ?? null;
  if (profile.targetAudience !== undefined) row.target_audience = profile.targetAudience || null;
  if (profile.audienceAwareness !== undefined) row.audience_awareness = profile.audienceAwareness || null;
  if (profile.currentSituation !== undefined) row.current_situation = profile.currentSituation || null;
  if (profile.mainProblem !== undefined) row.main_problem = profile.mainProblem || null;
  if (profile.frustrations !== undefined) row.frustrations = profile.frustrations || null;
  if (profile.desiredResult !== undefined) row.desired_result = profile.desiredResult || null;
  if (profile.currentBelief !== undefined) row.current_belief = profile.currentBelief || null;
  if (profile.commonSolution !== undefined) row.common_solution = profile.commonSolution || null;
  if (profile.whyCommonSolutionFails !== undefined)
    row.why_common_solution_fails = profile.whyCommonSolutionFails || null;
  if (profile.rootCause !== undefined) row.root_cause = profile.rootCause || null;
  if (profile.newParadigm !== undefined) row.new_paradigm = profile.newParadigm || null;
  if (profile.mechanismName !== undefined) row.mechanism_name = profile.mechanismName || null;
  if (profile.mechanismDescription !== undefined) row.mechanism_description = profile.mechanismDescription || null;
  if (profile.mechanismSteps !== undefined) row.mechanism_steps = profile.mechanismSteps;
  if (profile.differentiators !== undefined) row.differentiators = profile.differentiators || null;
  if (profile.founderStory !== undefined) row.founder_story = profile.founderStory || null;
  if (profile.credentials !== undefined) row.credentials = profile.credentials || null;
  if (profile.proofPoints !== undefined) row.proof_points = profile.proofPoints;
  if (profile.evidenceLimitations !== undefined) row.evidence_limitations = profile.evidenceLimitations || null;
  if (profile.offerName !== undefined) row.offer_name = profile.offerName || null;
  if (profile.deliverables !== undefined) row.deliverables = profile.deliverables;
  if (profile.benefits !== undefined) row.benefits = profile.benefits;
  if (profile.bonuses !== undefined) row.bonuses = profile.bonuses;
  if (profile.pricingStructure !== undefined) row.pricing_structure = profile.pricingStructure || null;
  if (profile.guarantee !== undefined) row.guarantee = profile.guarantee || null;
  if (profile.riskReversal !== undefined) row.risk_reversal = profile.riskReversal || null;
  if (profile.legitimateUrgency !== undefined) row.legitimate_urgency = profile.legitimateUrgency || null;
  if (profile.objections !== undefined) row.objections = profile.objections;
  if (profile.primaryCta !== undefined) row.primary_cta = profile.primaryCta || null;
  if (profile.ctaType !== undefined) row.cta_type = profile.ctaType || null;
  if (profile.ctaUrl !== undefined) row.cta_url = profile.ctaUrl || null;
  if (profile.webinarTitle !== undefined) row.webinar_title = profile.webinarTitle || null;
  if (profile.presentationFormat !== undefined) row.presentation_format = profile.presentationFormat || null;
  if (profile.deliveryStyle !== undefined) row.delivery_style = profile.deliveryStyle;
  if (profile.scriptDetail !== undefined) row.script_detail = profile.scriptDetail || null;
  if (profile.language !== undefined) row.language = profile.language || null;
  if (profile.forbiddenWords !== undefined) row.forbidden_words = profile.forbiddenWords;
  if (profile.requiredConcepts !== undefined) row.required_concepts = profile.requiredConcepts;
  if (profile.additionalInstructions !== undefined)
    row.additional_instructions = profile.additionalInstructions || null;
  return row;
}

// Reconstruye el perfil completo (no parcial) a partir de una fila leída
// de webinar_projects -- usado server-side para recrear el prompt con
// buildEvergreenMasterPrompt sin depender de nada que envíe el cliente.
export function rowToProfile(row: WebinarProjectProfileRow): WebinarProjectProfile {
  return {
    projectName: row.project_name ?? undefined,
    businessType: row.business_type ?? undefined,
    productName: row.product_name ?? undefined,
    productType: (row.product_type as WebinarProjectProfile["productType"]) ?? undefined,
    productDescription: row.product_description ?? undefined,
    productPrice: row.product_price ?? undefined,
    currency: row.currency ?? undefined,
    offerUrl: row.offer_url ?? undefined,
    desiredDuration: (row.desired_duration as WebinarProjectProfile["desiredDuration"]) ?? undefined,
    desiredDurationCustomMinutes: row.desired_duration_custom_minutes ?? undefined,
    targetAudience: row.target_audience ?? undefined,
    audienceAwareness: (row.audience_awareness as WebinarProjectProfile["audienceAwareness"]) ?? undefined,
    currentSituation: row.current_situation ?? undefined,
    mainProblem: row.main_problem ?? undefined,
    frustrations: row.frustrations ?? undefined,
    desiredResult: row.desired_result ?? undefined,
    currentBelief: row.current_belief ?? undefined,
    commonSolution: row.common_solution ?? undefined,
    whyCommonSolutionFails: row.why_common_solution_fails ?? undefined,
    rootCause: row.root_cause ?? undefined,
    newParadigm: row.new_paradigm ?? undefined,
    mechanismName: row.mechanism_name ?? undefined,
    mechanismDescription: row.mechanism_description ?? undefined,
    mechanismSteps: row.mechanism_steps?.length ? row.mechanism_steps : undefined,
    differentiators: row.differentiators ?? undefined,
    founderStory: row.founder_story ?? undefined,
    credentials: row.credentials ?? undefined,
    proofPoints: row.proof_points?.length ? row.proof_points : undefined,
    evidenceLimitations: row.evidence_limitations ?? undefined,
    offerName: row.offer_name ?? undefined,
    deliverables: row.deliverables?.length ? row.deliverables : undefined,
    benefits: row.benefits?.length ? row.benefits : undefined,
    bonuses: row.bonuses?.length ? row.bonuses : undefined,
    pricingStructure: row.pricing_structure ?? undefined,
    guarantee: row.guarantee ?? undefined,
    riskReversal: row.risk_reversal ?? undefined,
    legitimateUrgency: row.legitimate_urgency ?? undefined,
    objections: row.objections?.length ? row.objections : undefined,
    primaryCta: row.primary_cta ?? undefined,
    ctaType: (row.cta_type as WebinarProjectProfile["ctaType"]) ?? undefined,
    ctaUrl: row.cta_url ?? undefined,
    webinarTitle: row.webinar_title ?? undefined,
    presentationFormat: (row.presentation_format as WebinarProjectProfile["presentationFormat"]) ?? undefined,
    deliveryStyle: row.delivery_style?.length ? (row.delivery_style as WebinarProjectProfile["deliveryStyle"]) : undefined,
    scriptDetail: (row.script_detail as WebinarProjectProfile["scriptDetail"]) ?? undefined,
    language: (row.language as WebinarProjectProfile["language"]) ?? undefined,
    forbiddenWords: row.forbidden_words?.length ? row.forbidden_words : undefined,
    requiredConcepts: row.required_concepts?.length ? row.required_concepts : undefined,
    additionalInstructions: row.additional_instructions ?? undefined,
  };
}
