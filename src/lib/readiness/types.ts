// Tipos compartidos por toda la feature de Readiness Score -- dominio
// puro, sin dependencias de Next.js/React/Supabase, para que scoring.ts y
// recommendations.ts sean testeables sin ningún mock de infraestructura.

export const READINESS_CATEGORY_KEYS = [
  "strategy",
  "presentation",
  "recording",
  "evergreen",
  "followup",
  "measurement",
] as const;
export type CategoryKey = (typeof READINESS_CATEGORY_KEYS)[number];

// Orden de prioridad para desempatar el "cuello de botella principal" --
// ver scoring.ts. Un problema estratégico pesa más que uno operativo
// (grabación) aunque tengan el mismo puntaje.
export const WEAKEST_CATEGORY_TIEBREAK_ORDER: CategoryKey[] = [
  "strategy",
  "presentation",
  "evergreen",
  "followup",
  "measurement",
  "recording",
];

export const QUESTIONS_PER_CATEGORY = 5;
export const TOTAL_QUESTIONS = READINESS_CATEGORY_KEYS.length * QUESTIONS_PER_CATEGORY;
export const MAX_POINTS_PER_CATEGORY = QUESTIONS_PER_CATEGORY * 2;
export const MAX_TOTAL_POINTS = TOTAL_QUESTIONS * 2;

export type QuestionIndex = 1 | 2 | 3 | 4 | 5;

// "strategy_q1", "measurement_q5", etc. -- estable, usado como question_id
// en la tabla readiness_answers y como clave de traducción.
export type QuestionId = `${CategoryKey}_q${QuestionIndex}`;

export const ANSWER_VALUES = ["yes", "partial", "no"] as const;
export type AnswerValue = (typeof ANSWER_VALUES)[number];

export const ANSWER_POINTS: Record<AnswerValue, 0 | 1 | 2> = {
  yes: 2,
  partial: 1,
  no: 0,
};

export type QuestionAnswers = Partial<Record<QuestionId, AnswerValue>>;

export const BUSINESS_TYPES = [
  "coaching",
  "digital_product",
  "membership",
  "network_marketing",
  "agency",
  "saas",
  "professional_services",
  "other",
] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const PRESENTATION_STATUSES = ["recorded", "live_only", "partial_structure", "none"] as const;
export type PresentationStatus = (typeof PRESENTATION_STATUSES)[number];

export const PRIMARY_GOALS = [
  "save_time",
  "more_sales",
  "scale_presentation",
  "improve_conversion",
  "follow_up_prospects",
  "measure_audience",
] as const;
export type PrimaryGoal = (typeof PRIMARY_GOALS)[number];

export type ContextAnswers = {
  businessType: BusinessType;
  presentationStatus: PresentationStatus;
  primaryGoal: PrimaryGoal;
};

// Los seis parámetros de atribución del brief -- se preservan tal cual
// lleguen por querystring, sin validación de valores permitidos (son
// texto libre de campañas de marketing).
export type AttributionParams = {
  source?: string;
  medium?: string;
  campaign?: string;
  content?: string;
  affiliate?: string;
  ref?: string;
};

export const READINESS_STATUS_KEYS = ["not_ready", "foundation_built", "almost_ready", "ready"] as const;
export type ReadinessStatusKey = (typeof READINESS_STATUS_KEYS)[number];

export const CATEGORY_STATUS_KEYS = ["critical", "needs_work", "good_base", "prepared"] as const;
export type CategoryStatusKey = (typeof CATEGORY_STATUS_KEYS)[number];

export type CategoryScore = {
  category: CategoryKey;
  points: number; // 0-10
  percentage: number; // 0-100
  status: CategoryStatusKey;
};

// Lo que persiste readiness_answers por pregunta, y lo que el endpoint
// recibe del cliente (sin score -- el score lo calcula el servidor).
export type SubmittedAnswer = {
  questionId: QuestionId;
  answer: AnswerValue;
};

export type ReadinessReport = {
  assessmentId: string;
  totalPoints: number;
  scorePercentage: number;
  readinessStatus: ReadinessStatusKey;
  categoryScores: CategoryScore[];
  weakestCategory: CategoryKey;
  recommendations: RecommendationId[];
};

// "strategy_1", "strategy_2", "strategy_3" -- una recomendación fija por
// categoría, ver recommendations.ts.
export type RecommendationId = `${CategoryKey}_${1 | 2 | 3}`;
