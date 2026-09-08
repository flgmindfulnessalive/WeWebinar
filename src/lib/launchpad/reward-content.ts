// Contenido estático del Playbook (recompensa "playbook") -- las
// secciones estratégicas (por qué evergreen, errores comunes, próximos
// pasos) son copy propio del Playbook, pero los actos del guion y el
// checklist de lanzamiento se reutilizan de blueprint-content.ts e
// implementation-content.ts en vez de duplicarlos: el Playbook debe
// coincidir con lo que el usuario ya recorrió, no contar una versión
// paralela.
export const PLAYBOOK_SECTION_KEYS = [
  "why_evergreen",
  "the_four_acts",
  "launch_checklist",
  "common_mistakes",
  "next_steps",
] as const;
export type PlaybookSectionKey = (typeof PLAYBOOK_SECTION_KEYS)[number];
