import type { AttributionParams } from "./types";

// Clave versionada de localStorage -- ver storage.ts. Subir la versión
// (v2, v3...) invalida en limpio cualquier progreso guardado con un shape
// de estado viejo, en vez de intentar migrarlo.
export const READINESS_STORAGE_KEY = "wewebinars_readiness_v1";

// Lead magnet "Blueprint de 18 slides" -- todavía no existe (confirmado
// al inspeccionar el repo). Centralizado acá para que activarlo después
// sea cambiar un solo valor; mientras sea null, el CTA secundario no se
// renderiza (ver readiness-cta.tsx) en vez de apuntar a un link roto.
export const READINESS_BLUEPRINT_URL: string | null = null;

// Ventana y tope del rate limit por IP -- ver /api/readiness/submit.
// Generoso a propósito (un usuario real jamás completa el diagnóstico más
// de un par de veces); el objetivo es frenar scripts, no gente probando
// dos veces con datos distintos.
export const READINESS_RATE_LIMIT_WINDOW_HOURS = 24;
export const READINESS_RATE_LIMIT_MAX_SUBMISSIONS = 5;

export function buildSignupUrl({
  assessmentId,
  scorePercentage,
  weakestCategory,
  attribution,
}: {
  assessmentId: string;
  scorePercentage: number;
  weakestCategory: string;
  attribution: AttributionParams;
}): string {
  const params = new URLSearchParams();
  params.set("assessment_id", assessmentId);
  params.set("readiness_score", String(scorePercentage));
  params.set("weakest_category", weakestCategory);
  for (const [key, value] of Object.entries(attribution)) {
    if (value) params.set(key, value);
  }
  return `/signup?${params.toString()}`;
}
