import { z } from "zod";

// Límites generosos pero reales -- evita que un payload absurdo (horas
// negativas, un valor por hora de 10 dígitos) llegue a persistirse o a
// alimentar un cálculo con NaN/Infinity. Mismo criterio que
// readiness/script-builder: validación server-side siempre, nunca
// confiar en lo que ya validó el cliente.
export const RepetitionCalculatorInputSchema = z.object({
  presentationsPerWeek: z.number().min(0).max(100),
  durationMinutes: z.number().min(0).max(600),
  prepAndFollowupMinutes: z.number().min(0).max(600),
  peopleRepeating: z.number().min(0).max(500),
  hourlyValueUsd: z.number().min(0).max(10000),
  automatablePercentage: z.number().min(0).max(1),
});

export const LaunchpadCalculatorSaveSchema = z.object({
  inputs: RepetitionCalculatorInputSchema,
});
export type LaunchpadCalculatorSavePayload = z.infer<typeof LaunchpadCalculatorSaveSchema>;

export const BlueprintSlideSaveSchema = z.object({
  slideNumber: z.number().int().min(1).max(18),
  completed: z.boolean(),
  notes: z.string().max(2000).optional(),
});
export type BlueprintSlideSavePayload = z.infer<typeof BlueprintSlideSaveSchema>;

// Solo los eventos que este slice efectivamente dispara -- se extiende
// (agregando valores al enum de Postgres + acá) a medida que se
// construyen los módulos de video/demo/rewards, mismo criterio que
// readiness_event_type/script_builder_event_type.
const KNOWN_EVENT_TYPES = [
  "launchpad_viewed",
  "launchpad_step_started",
  "launchpad_step_completed",
  "repetition_calculation_completed",
  "create_webinar_clicked",
  "blueprint_slide_viewed",
  "blueprint_completed",
] as const;
export type LaunchpadEventType = (typeof KNOWN_EVENT_TYPES)[number];

export const LaunchpadEventSchema = z.object({
  projectId: z.uuid(),
  eventType: z.enum(KNOWN_EVENT_TYPES),
  properties: z.record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()])).optional().default({}),
});
