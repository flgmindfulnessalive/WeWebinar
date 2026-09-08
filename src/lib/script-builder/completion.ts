import { COMPLETION_TRACKED_FIELDS, CRITICAL_FIELDS } from "./profile-config";
import type { WebinarProjectProfile } from "./types";

export const COMPLETION_BUCKETS = ["insufficient", "draft_ready", "solid", "excellent"] as const;
export type CompletionBucket = (typeof COMPLETION_BUCKETS)[number];

// Mínimo para poder generar el prompt (con [INFORMACIÓN REQUERIDA] donde
// falte) -- por debajo de esto, el prompt sería demasiado genérico para
// ser útil, según el propio brief.
export const MIN_PERCENTAGE_TO_GENERATE = 50;

function isFieldFilled(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.length > 0;
  return Boolean(value);
}

export function isCriticalFieldFilled(profile: WebinarProjectProfile, field: keyof WebinarProjectProfile): boolean {
  return isFieldFilled(profile[field]);
}

export function missingCriticalFields(profile: WebinarProjectProfile): (keyof WebinarProjectProfile)[] {
  return CRITICAL_FIELDS.filter((field) => !isCriticalFieldFilled(profile, field));
}

export function computeProfileCompletion(profile: WebinarProjectProfile): number {
  const filled = COMPLETION_TRACKED_FIELDS.filter((field) => isFieldFilled(profile[field])).length;
  return Math.round((filled / COMPLETION_TRACKED_FIELDS.length) * 100);
}

export function completionBucket(percentage: number): CompletionBucket {
  if (percentage >= 90) return "excellent";
  if (percentage >= 75) return "solid";
  if (percentage >= 50) return "draft_ready";
  return "insufficient";
}

export function canGeneratePrompt(percentage: number): boolean {
  return percentage >= MIN_PERCENTAGE_TO_GENERATE;
}
