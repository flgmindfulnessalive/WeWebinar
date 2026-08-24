// Deterministic filler names for the "Conectados" list, in the same
// "Nombre I." style as the webinar's own configured simulated chat names
// (e.g. "Iván C."). Seeded the same way as fakeViewerCount (webinar_id +
// session start) so every attendee of the same session sees the same list,
// and it stays stable across re-renders within that session.

import { hash32, mulberry32 } from "./fake-viewers";

const FIRST_NAMES = [
  "Carlos", "Laura", "Pedro", "Iván", "Ana", "Miguel", "Sofía", "Diego", "Valentina", "Andrés",
  "Camila", "Javier", "Daniela", "Luis", "Fernanda", "José", "Paola", "Ricardo", "Gabriela", "Mario",
  "Isabella", "Sergio", "Natalia", "Alejandro", "Carolina", "Roberto", "Valeria", "Fernando", "Adriana", "Manuel",
  "Lucía", "Eduardo", "Marcela", "Raúl", "Patricia", "Óscar", "Rosa", "Alberto", "Claudia", "Enrique",
  "Verónica", "Hugo", "Silvia", "Julio", "Mónica", "Rubén", "Elena", "Gustavo", "Teresa", "Álvaro",
];

const LAST_INITIALS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

/**
 * Generates up to `count` unique filler names, skipping anything already in
 * `exclude` (the presenter, the viewer, and any names already configured in
 * the webinar's simulated chat script).
 */
export function fakeConnectedNames({
  seed,
  count,
  exclude,
}: {
  seed: string;
  count: number;
  exclude: Set<string>;
}): string[] {
  if (count <= 0) return [];

  const rand = mulberry32(hash32(seed));
  const used = new Set(exclude);
  const result: string[] = [];

  // Generous retry budget to absorb hash collisions against `exclude`
  // without ever risking an infinite loop.
  const maxAttempts = count * 20 + 100;
  for (let attempts = 0; result.length < count && attempts < maxAttempts; attempts++) {
    const first = FIRST_NAMES[Math.floor(rand() * FIRST_NAMES.length)];
    const initial = LAST_INITIALS[Math.floor(rand() * LAST_INITIALS.length)];
    const name = `${first} ${initial}.`;
    if (!used.has(name)) {
      used.add(name);
      result.push(name);
    }
  }

  return result;
}
