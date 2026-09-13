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

// English pool, used when the webinar is being viewed in English (the
// visitor's own locale, not the account's) -- same rough idea as the
// Spanish pool above, just names an English-speaking audience reads as
// plausible instead of obviously mismatched with the rest of the page.
const FIRST_NAMES_EN = [
  "James", "Emily", "Michael", "Olivia", "David", "Sophia", "Daniel", "Emma", "Matthew", "Ava",
  "Christopher", "Isabella", "Andrew", "Mia", "Joshua", "Charlotte", "Ryan", "Amelia", "Brandon", "Harper",
  "Justin", "Evelyn", "Kevin", "Abigail", "Brian", "Ella", "Jason", "Grace", "Eric", "Chloe",
  "Nathan", "Victoria", "Adam", "Lily", "Jacob", "Hannah", "Tyler", "Zoe", "Aaron", "Natalie",
  "Sean", "Samantha", "Jonathan", "Madison", "Nicholas", "Layla", "Benjamin", "Aria", "Ethan", "Scarlett",
];

const SURNAMES_EN = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Miller", "Davis", "Garcia", "Wilson", "Anderson",
  "Taylor", "Thomas", "Moore", "Jackson", "Martin", "Lee", "Thompson", "White", "Harris", "Clark",
  "Lewis", "Walker", "Young", "Allen", "King", "Wright", "Scott", "Green", "Baker", "Adams",
  "Nelson", "Hill", "Campbell", "Mitchell", "Roberts", "Carter", "Phillips", "Evans", "Turner", "Parker",
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
  locale = "es",
}: {
  seed: string;
  count: number;
  exclude: Set<string>;
  locale?: string;
}): string[] {
  if (count <= 0) return [];

  const firstNames = locale === "en" ? FIRST_NAMES_EN : FIRST_NAMES;
  const surnames = locale === "en" ? SURNAMES_EN : SURNAMES;
  const rand = mulberry32(hash32(seed));
  const used = new Set(exclude);
  const result: string[] = [];

  // Generous retry budget to absorb hash collisions against `exclude`
  // without ever risking an infinite loop.
  const maxAttempts = count * 20 + 100;
  for (let attempts = 0; result.length < count && attempts < maxAttempts; attempts++) {
    const first = firstNames[Math.floor(rand() * firstNames.length)];
    const formatRoll = rand();
    let name: string;
    if (formatRoll < 0.4) {
      // "Nombre I." -- ~40% of the time
      const initial = LAST_INITIALS[Math.floor(rand() * LAST_INITIALS.length)];
      name = `${first} ${initial}.`;
    } else if (formatRoll < 0.7) {
      // "Nombre Apellido" -- ~30% of the time
      const surname = surnames[Math.floor(rand() * surnames.length)];
      name = `${first} ${surname}`;
    } else {
      // "Nombre Apellido I." -- ~30% of the time
      const surname = surnames[Math.floor(rand() * surnames.length)];
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
