// Deterministic filler names for the "Conectados" list, in the same rough
// style as the webinar's own configured simulated chat names (e.g. "Iván
// C."). Seeded the same way as fakeViewerCount (webinar_id + session
// start) so every attendee of the same session sees the same list, and it
// stays stable across re-renders within that session.
//
// Mixes a few different formats -- "Nombre I.", "Nombre Apellido", "Nombre
// Apellido I." -- instead of one rigid pattern: a list where every single
// entry is "Nombre I." reads as obviously generated once you see more than
// a couple of them.

import { hash32, mulberry32 } from "./fake-viewers";

const FIRST_NAMES = [
  "Carlos", "Laura", "Pedro", "Iván", "Ana", "Miguel", "Sofía", "Diego", "Valentina", "Andrés",
  "Camila", "Javier", "Daniela", "Luis", "Fernanda", "José", "Paola", "Ricardo", "Gabriela", "Mario",
  "Isabella", "Sergio", "Natalia", "Alejandro", "Carolina", "Roberto", "Valeria", "Fernando", "Adriana", "Manuel",
  "Lucía", "Eduardo", "Marcela", "Raúl", "Patricia", "Óscar", "Rosa", "Alberto", "Claudia", "Enrique",
  "Verónica", "Hugo", "Silvia", "Julio", "Mónica", "Rubén", "Elena", "Gustavo", "Teresa", "Álvaro",
];

const SURNAMES = [
  "García", "Rodríguez", "Martínez", "López", "González", "Pérez", "Sánchez", "Ramírez", "Torres", "Flores",
  "Rivera", "Gómez", "Díaz", "Reyes", "Cruz", "Morales", "Ortiz", "Gutiérrez", "Chávez", "Ramos",
  "Vargas", "Castillo", "Jiménez", "Mendoza", "Romero", "Álvarez", "Herrera", "Medina", "Aguilar", "Ferrari",
  "Ross", "Mejía", "Fuentes", "Salazar", "Cordero", "Delgado", "Peña", "Núñez", "Vega", "Campos",
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
    const formatRoll = rand();
    let name: string;
    if (formatRoll < 0.4) {
      // "Nombre I." -- ~40% of the time
      const initial = LAST_INITIALS[Math.floor(rand() * LAST_INITIALS.length)];
      name = `${first} ${initial}.`;
    } else if (formatRoll < 0.7) {
      // "Nombre Apellido" -- ~30% of the time
      const surname = SURNAMES[Math.floor(rand() * SURNAMES.length)];
      name = `${first} ${surname}`;
    } else {
      // "Nombre Apellido I." -- ~30% of the time
      const surname = SURNAMES[Math.floor(rand() * SURNAMES.length)];
      const initial = LAST_INITIALS[Math.floor(rand() * LAST_INITIALS.length)];
      name = `${first} ${surname} ${initial}.`;
    }
    if (!used.has(name)) {
      used.add(name);
      result.push(name);
    }
  }

  return result;
}
