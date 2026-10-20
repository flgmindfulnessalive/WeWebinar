// Casuísticas educativas precargadas, con las reglas de la tabla oficial.
// 1 sobre = 77 PV (dato indicado por el propietario; las fuentes no publican
// el volumen por producto) y el mismo valor como volumen comisionable.
import { DEFAULT_ASSUMPTIONS, ROOT_ID, type Assumptions, type Person, type Product, type QuickOrg, type SimulationInput } from "../engine/model";
import type { RankId } from "../plan/types";

export const EXAMPLE_PRODUCTS: Product[] = [
  { id: "sobre", name: "Sobre X39 (30 parches)", qv: 77, cv: 77, retailMargin: 50, preferredMargin: 20 },
];
export const EXAMPLE_NOTE = "Ejemplos con 1 sobre = 77 PV (mismo valor como volumen comisionable) y $50 de ganancia minorista por sobre. Puedes cambiarlo en Catálogo.";

export interface Scenario {
  id: string;
  title: string;
  situation: string;
  assumptions: string;
  limitation: string;
  work: string;
  input: SimulationInput;
  /** Para escenarios de antes/después o de comparación. */
  compare?: { label: string; baseLabel: string; input: SimulationInput };
  /** Lo que el motor debe producir (se verifica en las pruebas). */
  expect: { rank: RankId | null; compareRank?: RankId | null; note?: string };
}

const A = (o: Partial<Assumptions> = {}): Assumptions => ({ ...DEFAULT_ASSUMPTIONS, ...o });
const quickIn = (q: Partial<QuickOrg>, a: Partial<Assumptions> = {}): SimulationInput => ({
  mode: "rapido", products: EXAMPLE_PRODUCTS, assumptions: A(a),
  quick: { personal: [], customers: [], sponsored: [], sponsoredInactive: 0, team: [], teamInactive: 0, distribution: { lines: 0, largestPct: 0, secondPct: 0, leftPct: 50 }, enrollments: [], ...q },
});
const detIn = (people: Person[], a: Partial<Assumptions> = {}): SimulationInput => ({ mode: "detallado", products: EXAMPLE_PRODUCTS, assumptions: A(a), detailed: { people } });

const person = (id: string, label: string, sponsorId: string | null, placement: [string, "L" | "R"] | null, qty: number): Person => ({
  id, label, kind: "bp", sponsorId, placement: placement ? { parentId: placement[0], side: placement[1] } : null, orders: qty ? [{ productId: "sobre", qty }] : [],
});
const customer = (id: string, label: string, sponsorId: string, qty: number): Person => ({
  id, label, kind: "cliente_preferente", sponsorId, placement: null, orders: [{ productId: "sobre", qty }],
});

/**
 * Construye una línea: un líder patrocinado por ti y `members` personas
 * patrocinadas por el líder, colocadas en cadena bajo él en el binario.
 */
function line(key: string, name: string, place: [string, "L" | "R"], members: number, qty: number): Person[] {
  const leader = person(key, name, ROOT_ID, place, qty);
  const out = [leader];
  let parent = key;
  for (let i = 1; i <= members; i++) {
    const id = `${key}${i}`;
    out.push(person(id, `${name} · equipo ${i}`, key, [parent, "L"], qty));
    parent = id;
  }
  return out;
}

const root = (qty: number): Person => ({ id: ROOT_ID, label: "Tú", kind: "bp", sponsorId: null, placement: null, orders: [{ productId: "sobre", qty }] });

// Organización equilibrada: 4 líneas de 17 socios (líder + 16), 1 sobre cada uno;
// 2 líneas en cada pierna del binario.
const balancedPeople = (rootQty: number, withCustomer = true): Person[] => [
  root(rootQty),
  ...(withCustomer ? [customer("k1", "Cliente 1", ROOT_ID, 1)] : []),
  ...line("a", "Ana", [ROOT_ID, "L"], 16, 1),
  ...line("b", "Beto", [ROOT_ID, "R"], 16, 1),
  // Las líneas C y D se colocan bajo el último de A y B para repartir piernas
  ...line("c", "Carla", ["a16", "R"], 16, 1),
  ...line("d", "Dani", ["b16", "R"], 16, 1),
];

// Las mismas 68 personas y compras, con 50 en la línea de Ana.
const concentratedPeople = (): Person[] => [
  root(2),
  customer("k1", "Cliente 1", ROOT_ID, 1),
  ...line("a", "Ana", [ROOT_ID, "L"], 49, 1),
  ...line("b", "Beto", [ROOT_ID, "R"], 5, 1),
  ...line("c", "Carla", ["b5", "R"], 5, 1),
  ...line("d", "Dani", ["c5", "R"], 5, 1),
];

export const SCENARIOS: Scenario[] = [
  {
    id: "nuevo",
    title: "1 · Socio nuevo con pocos clientes",
    situation: "Acabas de inscribirte: compras 1 sobre, tienes 3 clientes preferentes de 1 sobre e inscribiste a una persona con el Paquete Básico, que aún no compra.",
    assumptions: "Calificación mensual; 1 sobre = 77 PV.",
    limitation: "Eres Socio Activo (308 PV), pero tus clientes suman 231 PV y el Bono por Cliente empieza en 300. El Socio Activo cobra 0 % de Nivel Comprimido. El PIB de $35 es puntual.",
    work: "Sumar 1 cliente más de 1 sobre (308 PV de clientes → 5 %) y ayudar a tu patrocinado a comprar. Para cobrar el 10 % necesitas 1★ Gerente: 750 de QDV en tu organización.",
    input: quickIn({ personal: [{ productId: "sobre", qty: 1 }], customers: [{ count: 3, productId: "sobre", qty: 1, kind: "cliente_preferente" }], sponsoredInactive: 1, enrollments: [{ packageId: "basico", count: 1 }] }),
    expect: { rank: "abp" },
  },
  {
    id: "uno",
    title: "2 · Compradores de un sobre al mes",
    situation: "Tienes 20 socios patrocinados personalmente; cada uno compra 1 sobre al mes. Tú compras 1.",
    assumptions: "Cada patrocinado encabeza su propia línea; compras repartidas en el mes.",
    limitation: "1 540 PV en tu organización: 2★ Gerente. El 10 % depende solo del volumen de tus directos: 154 al mes. El binario solo se puede estimar.",
    work: "Para 3★ Gerente faltan 960 PV (≈ 13 compradores más). Ayudar a cada patrocinado a construir su propia línea suma QDV.",
    input: quickIn({ personal: [{ productId: "sobre", qty: 1 }], sponsored: [{ count: 20, productId: "sobre", qty: 1 }], distribution: { lines: 20, largestPct: 5, secondPct: 5, leftPct: 50 } }),
    expect: { rank: "m2" },
  },
  {
    id: "dos",
    title: "3 · Compradores de dos sobres al mes",
    situation: "10 socios patrocinados personalmente compran 2 sobres cada uno. Tú compras 1.",
    assumptions: "Igual que el caso 2, con la mitad de personas y el doble de compra por persona.",
    limitation: "Mismo volumen (1 540 PV), mismo rango y mismo 10 % que el caso 2 con la mitad de personas; pero depende de que cada uno mantenga 2 sobres.",
    work: "Mantener la recompra de 2 sobres; si alguien baja a 1, el volumen cae en proporción.",
    input: quickIn({ personal: [{ productId: "sobre", qty: 1 }], sponsored: [{ count: 10, productId: "sobre", qty: 2 }], distribution: { lines: 10, largestPct: 10, secondPct: 10, leftPct: 50 } }),
    expect: { rank: "m2" },
  },
  {
    id: "mixta",
    title: "4 · Organización mixta",
    situation: "8 clientes preferentes (la mitad compra 1 sobre y la otra mitad 2) y 12 patrocinados (8 compran 1 sobre y 4 compran 2). Tú compras 1.",
    assumptions: "Clientes y socios se combinan: el volumen de clientes cuenta para tu PV y para el Bono por Cliente.",
    limitation: "Los clientes suman 924 PV (tramo del 10 %). Los socios suman 1 232 PV de QDV: 1★ Gerente; faltan 268 para 2★ Gerente.",
    work: "Sumar clientes hasta 1 200 PV (≈ 4 sobres más) para el tramo del 20 % y activar 4 socios más para 2★ Gerente.",
    input: quickIn({
      personal: [{ productId: "sobre", qty: 1 }],
      customers: [{ count: 4, productId: "sobre", qty: 1, kind: "cliente_preferente" }, { count: 4, productId: "sobre", qty: 2, kind: "cliente_preferente" }],
      sponsored: [{ count: 8, productId: "sobre", qty: 1 }, { count: 4, productId: "sobre", qty: 2 }],
      distribution: { lines: 12, largestPct: 100 / 12, secondPct: 100 / 12, leftPct: 50 },
    }),
    expect: { rank: "m1" },
  },
  {
    id: "equilibrada",
    title: "5 · Organización equilibrada",
    situation: "4 líneas de 17 socios (líder + 16) que compran 1 sobre; 2 líneas en cada pierna del binario. Tú compras 2 y tienes 1 cliente.",
    assumptions: "Modo detallado: patrocinio y colocación definidos persona por persona.",
    limitation: "Cada línea aporta 1 309 PV, por debajo de la MVR de 1★ Director (2 500), y las piernas quedan iguales (2 618). Llegas a 1★ Director.",
    work: "Para 2★ Director: 10 000 de QDV con ninguna línea contando más de 5 000, y 2 000 en la pierna menor.",
    input: detIn(balancedPeople(2)),
    expect: { rank: "d1" },
  },
  {
    id: "concentrada",
    title: "6 · Mucho volumen en una sola rama",
    situation: "Las mismas 68 personas y compras que el caso 5, pero 50 están en la línea de Ana.",
    assumptions: "Modo detallado; mismo volumen total que el caso 5.",
    limitation: "Regla de Volumen Máximo de 1★ Director: la línea de Ana (3 850 PV) solo cuenta 2 500. QDV contable 3 886 de 5 000: te quedas en 3★ Gerente con el mismo volumen que el caso 5 (los Gerentes no tienen MVR).",
    work: "Desarrollar las otras líneas: con 1 114 PV más fuera de la línea de Ana (≈ 15 compradores) llegarías a 1★ Director.",
    input: detIn(concentratedPeople()),
    expect: { rank: "m3" },
  },
  {
    id: "incompleta",
    title: "7 · Volumen suficiente, requisitos incompletos",
    situation: "La organización del caso 5, pero tú solo compras 1 sobre y no tienes clientes propios.",
    assumptions: "Igual que el caso 5 salvo tu compra personal.",
    limitation: "Tu PV (77) no llega a los 110 de 1★ Director: aunque tu organización tiene 5 236 PV y está equilibrada, te pagan como 3★ Gerente (10 % de binario en vez de 11 % y sin Mentor Match).",
    work: "Subir tu PV a 110 o más: un segundo sobre o un cliente propio recupera el 1★ Director.",
    input: detIn(balancedPeople(1, false)),
    expect: { rank: "m3" },
  },
  {
    id: "pierde",
    title: "8 · La organización pierde compradores",
    situation: "Antes: 20 patrocinados compraban 2 sobres. Después: 5 dejan de comprar y 5 bajan a 1 sobre.",
    assumptions: "Mismas líneas; solo cambia la actividad.",
    limitation: "El volumen cae de 3 080 a 1 925 PV: pasas de 3★ Gerente a 2★ Gerente y el 10 % baja de 308 a 192,50 al mes.",
    work: "Recuperar 5 compradores o volver a 2 sobres: los requisitos se miden en cada periodo, no se conservan.",
    input: quickIn({ personal: [{ productId: "sobre", qty: 1 }], sponsored: [{ count: 20, productId: "sobre", qty: 2 }], distribution: { lines: 20, largestPct: 5, secondPct: 5, leftPct: 50 } }),
    compare: {
      label: "Después", baseLabel: "Antes",
      input: quickIn({ personal: [{ productId: "sobre", qty: 1 }], sponsored: [{ count: 10, productId: "sobre", qty: 2 }, { count: 5, productId: "sobre", qty: 1 }], sponsoredInactive: 5, distribution: { lines: 15, largestPct: 100 / 15, secondPct: 100 / 15, leftPct: 50 } }),
    },
    expect: { rank: "m3", compareRank: "m2" },
  },
  {
    id: "comparacion",
    title: "Comparación · Mismas personas, distinta distribución",
    situation: "Dos organizaciones de 70 personas (tú, 1 cliente y 68 socios) que compran lo mismo (casos 5 y 6).",
    assumptions: "Modo detallado; mismo volumen total (5 236 PV).",
    limitation: "La equilibrada llega a 1★ Director; la concentrada se queda en 3★ Gerente por la Regla de Volumen Máximo.",
    work: "Equilibrar las líneas vale tanto como sumar volumen: el mismo trabajo rinde distinto según dónde se construye.",
    input: detIn(balancedPeople(2)),
    compare: { label: "Concentrada", baseLabel: "Equilibrada", input: detIn(concentratedPeople()) },
    expect: { rank: "d1", compareRank: "m3" },
  },
];
