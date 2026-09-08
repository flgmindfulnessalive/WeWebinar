import type { LaunchpadStepKey } from "./types";
import { LAUNCHPAD_STEP_KEYS } from "./types";

// Metadata estructural de cada etapa -- fuente única para las tarjetas del
// dashboard, la barra de progreso y el orden recomendado (nunca un orden
// duplicado o recalculado en cada componente). El copy real (nombre,
// resultado, CTA) vive en next-intl bajo Launchpad.steps.<stepKey>.*, esto
// solo dice "cuánto pesa, cuánto tarda, y a qué ruta lleva".
export type LaunchpadStepDefinition = {
  key: LaunchpadStepKey;
  order: number;
  route: string;
  estimatedMinutes: number;
  // Si es false, la etapa todavía no tiene una herramienta construida --
  // la tarjeta se muestra en el dashboard (transparencia sobre el
  // recorrido completo) pero deshabilitada con un estado "Próximamente",
  // en vez de ocultarla o llevar a una ruta rota.
  available: boolean;
};

export const LAUNCHPAD_STEPS: Record<LaunchpadStepKey, LaunchpadStepDefinition> = {
  cost: { key: "cost", order: 1, route: "/dashboard/launchpad/calculator", estimatedMinutes: 3, available: true },
  diagnosis: { key: "diagnosis", order: 2, route: "/readiness", estimatedMinutes: 7, available: true },
  architecture: {
    key: "architecture",
    order: 3,
    route: "/dashboard/launchpad/blueprint",
    estimatedMinutes: 10,
    available: true,
  },
  script: { key: "script", order: 4, route: "/script-builder", estimatedMinutes: 15, available: true },
  implementation: {
    key: "implementation",
    order: 5,
    route: "/dashboard/launchpad/implementation",
    estimatedMinutes: 8,
    available: true,
  },
  demo: { key: "demo", order: 6, route: "/dashboard/launchpad/demo", estimatedMinutes: 5, available: true },
  create: { key: "create", order: 7, route: "/dashboard/webinars/new", estimatedMinutes: 2, available: true },
};

export const ORDERED_LAUNCHPAD_STEPS: LaunchpadStepDefinition[] = LAUNCHPAD_STEP_KEYS.map(
  (key) => LAUNCHPAD_STEPS[key]
);
