import type { AttributionParams } from "./types";

export const SCRIPT_BUILDER_STORAGE_KEY = "wewebinars_script_builder_v1";

// Sube esta versión cada vez que cambie el texto estático de
// prompt-builder.ts (reglas, arquitectura de 18 slides, formato de
// salida) -- script_prompt_generations guarda esta versión en vez del
// prompt completo, así que un cambio de plantilla debe ser detectable.
export const PROMPT_TEMPLATE_VERSION = "v1";

export const CHATGPT_NEW_CHAT_URL = "https://chat.openai.com/";

// Ventana y tope del rate limit por IP -- ver /api/script-builder/save.
// A diferencia de Readiness (un submit final único), acá se autoguarda
// muchas veces por proyecto -- por eso el límite se aplica solo a
// *proyectos nuevos* creados por esa IP en la ventana, nunca a los
// autoguardados de un proyecto ya existente.
export const SCRIPT_BUILDER_RATE_LIMIT_WINDOW_HOURS = 24;
export const SCRIPT_BUILDER_RATE_LIMIT_MAX_NEW_PROJECTS = 8;

export function buildScriptBuilderSignupUrl({
  projectId,
  profileCompletion,
  assessmentId,
  attribution,
}: {
  projectId: string;
  profileCompletion: number;
  assessmentId?: string;
  attribution: AttributionParams;
}): string {
  const params = new URLSearchParams();
  params.set("project_id", projectId);
  params.set("profile_completion", String(profileCompletion));
  params.set("action", "script_generated");
  if (assessmentId) params.set("assessment_id", assessmentId);
  for (const [key, value] of Object.entries(attribution)) {
    if (value) params.set(key, value);
  }
  return `/signup?${params.toString()}`;
}
