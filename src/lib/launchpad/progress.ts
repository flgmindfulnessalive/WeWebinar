import { LAUNCHPAD_STEP_KEYS, type LaunchpadStepKey, type LaunchpadStepProgress } from "./types";
import { ORDERED_LAUNCHPAD_STEPS } from "./steps-config";

// Única capa de cálculo de progreso del Launchpad -- el dashboard, la
// tarjeta de progreso y cada tarjeta de etapa leen de acá, nunca
// recalculan el porcentaje por su cuenta (ver sección 20 del brief:
// "Centraliza la lógica de progreso en una sola capa").

export function stepStatusFor(
  steps: LaunchpadStepProgress[],
  stepKey: LaunchpadStepKey
): LaunchpadStepProgress["status"] {
  return steps.find((s) => s.stepKey === stepKey)?.status ?? "not_started";
}

export function completedStepCount(steps: LaunchpadStepProgress[]): number {
  return steps.filter((s) => s.status === "completed").length;
}

export function computeProjectCompletionPercentage(steps: LaunchpadStepProgress[]): number {
  return Math.round((completedStepCount(steps) / LAUNCHPAD_STEP_KEYS.length) * 100);
}

// Primer paso (en el orden recomendado) que todavía no está completo --
// nunca el primero "disponible", para que el usuario siempre vea a dónde
// seguir aunque el siguiente paso recomendado todavía no tenga
// herramienta construida (available: false en steps-config.ts).
export function nextRecommendedStep(steps: LaunchpadStepProgress[]): LaunchpadStepKey {
  for (const def of ORDERED_LAUNCHPAD_STEPS) {
    if (stepStatusFor(steps, def.key) !== "completed") return def.key;
  }
  return "create";
}

export function estimatedMinutesRemaining(steps: LaunchpadStepProgress[]): number {
  return ORDERED_LAUNCHPAD_STEPS.filter((def) => stepStatusFor(steps, def.key) !== "completed").reduce(
    (total, def) => total + def.estimatedMinutes,
    0
  );
}
