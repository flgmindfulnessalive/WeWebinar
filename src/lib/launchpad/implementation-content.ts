// Contenido estático de la etapa "Implementación" -- el checklist refleja
// las secciones reales del wizard de creación de webinar (ver
// src/app/dashboard/webinars/[id]/edit/*-section.tsx y el namespace
// WizardSteps), no una versión paralela inventada, para que lo que el
// usuario ve acá sea exactamente lo que se va a encontrar al crear su
// primer webinar.
export const IMPLEMENTATION_CHECKLIST_ITEM_KEYS = [
  "video",
  "schedule",
  "waitingRoom",
  "chat",
  "ctas",
  "publish",
] as const;
export type ImplementationChecklistItemKey = (typeof IMPLEMENTATION_CHECKLIST_ITEM_KEYS)[number];

export const TOTAL_IMPLEMENTATION_ITEMS = IMPLEMENTATION_CHECKLIST_ITEM_KEYS.length;

export function isImplementationChecklistItemKey(value: string): value is ImplementationChecklistItemKey {
  return (IMPLEMENTATION_CHECKLIST_ITEM_KEYS as readonly string[]).includes(value);
}
