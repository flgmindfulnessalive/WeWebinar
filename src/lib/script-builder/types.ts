// Tipos compartidos del Script Builder -- dominio puro, sin dependencias
// de Next.js/React/Supabase (mismo criterio que src/lib/readiness/types.ts).
// El shape de WebinarProjectProfile espeja 1:1 las columnas de
// webinar_projects (ver la migración) para que no haya un mapeo
// silencioso entre "lo que llena el usuario" y "lo que se persiste".

export const OFFER_TYPES = [
  "coaching",
  "consulting",
  "course",
  "digital_product",
  "membership",
  "community",
  "network_marketing",
  "software",
  "professional_service",
  "physical_product",
  "event",
  "other",
] as const;
export type OfferType = (typeof OFFER_TYPES)[number];

export const DURATION_BUCKETS = ["10_15", "15_20", "20_30", "30_45", "custom"] as const;
export type DurationBucket = (typeof DURATION_BUCKETS)[number];

export const AWARENESS_LEVELS = [
  "unaware",
  "problem_aware",
  "solution_aware",
  "product_aware",
  "most_aware",
] as const;
export type AwarenessLevel = (typeof AWARENESS_LEVELS)[number];

export const PRESENTATION_FORMATS = [
  "camera",
  "voiceover_slides",
  "presenter_and_slides",
  "screen_demo",
  "interview",
  "mixed",
] as const;
export type PresentationFormat = (typeof PRESENTATION_FORMATS)[number];

export const SCRIPT_DETAIL_LEVELS = [
  "word_for_word",
  "natural_freedom",
  "talking_points",
  "hybrid_open_close",
] as const;
export type ScriptDetailLevel = (typeof SCRIPT_DETAIL_LEVELS)[number];

export const CTA_TYPES = [
  "buy",
  "register",
  "book_call",
  "request_info",
  "start_trial",
  "join_community",
  "talk_to_person",
  "other",
] as const;
export type CtaType = (typeof CTA_TYPES)[number];

export const TONES = [
  "professional",
  "warm",
  "inspirational",
  "educational",
  "direct",
  "conversational",
  "authoritative",
] as const;
export type Tone = (typeof TONES)[number];

export const PROJECT_LANGUAGES = ["es", "en", "pt", "fr"] as const;
export type ProjectLanguage = (typeof PROJECT_LANGUAGES)[number];

export const EVIDENCE_TYPES = ["case_study", "testimonial", "data_source", "demonstration"] as const;
export type EvidenceType = (typeof EVIDENCE_TYPES)[number];

export type ProofPoint = {
  type: EvidenceType;
  label: string;
  url?: string;
  note?: string;
};

export const PROJECT_STATUSES = ["draft", "profile_complete", "prompt_generated"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export type AttributionParams = {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  affiliate?: string;
  ref?: string;
};

// El perfil tal como vive en el cliente mientras se completa -- todo
// opcional porque se llena progresivamente a lo largo de las 7 etapas.
// La version *validada* (con los campos críticos garantizados) es
// ValidatedProjectProfile, más abajo.
export type WebinarProjectProfile = {
  // Etapa 1 -- Tu proyecto
  projectName?: string;
  // Precargado desde readiness_assessments.business_type cuando el
  // proyecto viene de un assessment (Escenario A) -- vocabulario propio
  // de Readiness Score, no se vuelve a preguntar acá, por eso no usa
  // OFFER_TYPES (el tipo de oferta específico de este wizard).
  businessType?: string;
  productName?: string;
  productType?: OfferType;
  productDescription?: string;
  productPrice?: number;
  currency?: string;
  offerUrl?: string;
  desiredDuration?: DurationBucket;
  desiredDurationCustomMinutes?: number;

  // Etapa 2 -- Tu audiencia
  targetAudience?: string;
  audienceAwareness?: AwarenessLevel;
  currentSituation?: string;
  mainProblem?: string;
  frustrations?: string;
  desiredResult?: string;

  // Etapa 3 -- Cambio de creencia
  currentBelief?: string;
  commonSolution?: string;
  whyCommonSolutionFails?: string;
  rootCause?: string;
  newParadigm?: string;

  // Etapa 4 -- Mecanismo
  mechanismName?: string;
  mechanismDescription?: string;
  mechanismSteps?: string[]; // hasta 3 pasos
  differentiators?: string;

  // Etapa 5 -- Evidencia y autoridad
  founderStory?: string;
  credentials?: string;
  proofPoints?: ProofPoint[];
  evidenceLimitations?: string;

  // Etapa 6 -- Oferta y decisión
  offerName?: string;
  deliverables?: string[];
  benefits?: string[];
  bonuses?: string[];
  pricingStructure?: string;
  guarantee?: string;
  riskReversal?: string;
  legitimateUrgency?: string;
  objections?: string[];
  primaryCta?: string;
  ctaType?: CtaType;
  ctaUrl?: string;

  // Etapa 7 -- Voz y formato
  webinarTitle?: string;
  presentationFormat?: PresentationFormat;
  deliveryStyle?: Tone[];
  scriptDetail?: ScriptDetailLevel;
  language?: ProjectLanguage;
  forbiddenWords?: string[];
  requiredConcepts?: string[];
  additionalInstructions?: string;
};

export type ScriptBuilderLeadInfo = {
  name: string;
  email: string;
  consentGiven: boolean;
  marketingConsent: boolean;
};
