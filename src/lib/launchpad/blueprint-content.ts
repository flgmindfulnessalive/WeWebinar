// Estructura de las 18 slides del Blueprint -- mismos números, orden y
// actos que ARCHITECTURE_SECTION en src/lib/script-builder/prompt-builder.ts
// (la sección que el Prompt Maestro le manda a la IA), para que lo que el
// usuario recorre acá sea exactamente lo que su guion terminará
// generando, no una segunda taxonomía inventada en paralelo. El copy real
// (título, objetivo psicológico, pregunta, ejemplo, recomendación visual)
// vive en next-intl bajo Launchpad.blueprint.slides.slide<N>.*, esto solo
// fija a qué acto pertenece cada número.

export const BLUEPRINT_ACT_KEYS = ["problem", "new_way", "criteria", "implementation"] as const;
export type BlueprintActKey = (typeof BLUEPRINT_ACT_KEYS)[number];

export type BlueprintSlideDefinition = {
  number: number; // 1-18
  act: BlueprintActKey;
};

export const BLUEPRINT_SLIDES: BlueprintSlideDefinition[] = [
  { number: 1, act: "problem" },
  { number: 2, act: "problem" },
  { number: 3, act: "problem" },
  { number: 4, act: "problem" },
  { number: 5, act: "problem" },
  { number: 6, act: "new_way" },
  { number: 7, act: "new_way" },
  { number: 8, act: "new_way" },
  { number: 9, act: "new_way" },
  { number: 10, act: "new_way" },
  { number: 11, act: "criteria" },
  { number: 12, act: "criteria" },
  { number: 13, act: "criteria" },
  { number: 14, act: "criteria" },
  { number: 15, act: "criteria" },
  { number: 16, act: "implementation" },
  { number: 17, act: "implementation" },
  { number: 18, act: "implementation" },
];

export const TOTAL_BLUEPRINT_SLIDES = BLUEPRINT_SLIDES.length;

export function slideDefinition(slideNumber: number): BlueprintSlideDefinition {
  const found = BLUEPRINT_SLIDES.find((s) => s.number === slideNumber);
  if (!found) throw new Error(`[blueprint-content] slide ${slideNumber} no existe (1-18)`);
  return found;
}

export function slidesForAct(act: BlueprintActKey): BlueprintSlideDefinition[] {
  return BLUEPRINT_SLIDES.filter((s) => s.act === act);
}
