// Casuísticas educativas precargadas. Los volúmenes por sobre son
// HIPOTÉTICOS (las fuentes no los publican): se marcan como tales en la
// interfaz y se pueden cambiar en el catálogo.
import { DEFAULT_ASSUMPTIONS, ROOT_ID, type Assumptions, type Person, type Product, type QuickOrg, type SimulationInput } from "../engine/model";
import type { RankId } from "../plan/types";

export const EXAMPLE_PRODUCTS: Product[] = [
  { id: "sobre", name: "Sobre X39 (30 parches)", qv: 50, cv: 40, retailMargin: null },
];
export const EXAMPLE_NOTE = "Volúmenes de ejemplo HIPOTÉTICOS: 1 sobre = 50 de volumen de calificación y 40 de volumen comisionable. Las fuentes no publican el volumen de cada producto: cámbialos en Catálogo por los de tu back office.";

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

// Organización equilibrada: 4 líneas iguales, 2 a cada lado del binario.
const balancedPeople = (rootQty: number): Person[] => [
  root(rootQty),
  customer("k1", "Cliente 1", ROOT_ID, 1),
  ...line("a", "Ana", [ROOT_ID, "L"], 6, 2),
  ...line("b", "Beto", [ROOT_ID, "R"], 6, 2),
  // Las líneas C y D se colocan bajo el último de A y B para repartir piernas
  ...line("c", "Carla", ["a6", "R"], 6, 2),
  ...line("d", "Dani", ["b6", "R"], 6, 2),
];

// Misma cantidad de personas y compras, concentradas en una línea.
const concentratedPeople = (): Person[] => [
  root(2),
  customer("k1", "Cliente 1", ROOT_ID, 1),
  ...line("a", "Ana", [ROOT_ID, "L"], 21, 2),
  ...line("b", "Beto", [ROOT_ID, "R"], 1, 2),
  ...line("c", "Carla", ["b1", "R"], 1, 2),
  ...line("d", "Dani", ["c1", "R"], 1, 2),
];

export const SCENARIOS: Scenario[] = [
  {
    id: "nuevo",
    title: "1 · Socio nuevo con pocos clientes",
    situation: "Acabas de inscribirte: compras 1 sobre, tienes 3 clientes preferentes de 1 sobre e inscribiste a una persona con el Paquete Básico, que aún no compra.",
    assumptions: "Calificación mensual; volúmenes hipotéticos del catálogo de ejemplo.",
    limitation: "Llegas a BP Activo, pero tus clientes suman 150 de volumen: el Bono para el cliente empieza en 300. El PIB de $35 es puntual.",
    work: "Sumar 3 clientes más de 1 sobre (o que 3 de ellos compren 2) para llegar a 300 de volumen de clientes, y acompañar a tu patrocinado para que compre.",
    input: quickIn({ personal: [{ productId: "sobre", qty: 1 }], customers: [{ count: 3, productId: "sobre", qty: 1, kind: "cliente_preferente" }], sponsoredInactive: 1, enrollments: [{ packageId: "basico", count: 1 }] }),
    expect: { rank: "abp" },
  },
  {
    id: "uno",
    title: "2 · Compradores de un sobre al mes",
    situation: "Tienes 20 Brand Partners patrocinados personalmente; cada uno compra 1 sobre al mes. Tú compras 2.",
    assumptions: "Cada patrocinado encabeza su propia línea; reparto uniforme de compras en las semanas.",
    limitation: "El 10 % Personal Team depende solo del volumen de tus patrocinados directos: 20 sobres generan una cifra modesta. El binario queda pendiente sin supuestos.",
    work: "Aumentar compradores activos o que pasen a 2 sobres; ayudar a cada patrocinado a construir su propia línea para sumar QDV.",
    input: quickIn({ personal: [{ productId: "sobre", qty: 2 }], sponsored: [{ count: 20, productId: "sobre", qty: 1 }], distribution: { lines: 20, largestPct: 5, secondPct: 5, leftPct: 50 } }),
    expect: { rank: "m1" },
  },
  {
    id: "dos",
    title: "3 · Compradores de dos sobres al mes",
    situation: "10 Brand Partners patrocinados personalmente compran 2 sobres cada uno. Tú compras 2.",
    assumptions: "Igual que el caso 2, con la mitad de personas y el doble de compra por persona.",
    limitation: "Mismo volumen y mismo 10 % que el caso 2 con la mitad de personas; pero depende de que cada uno mantenga 2 sobres.",
    work: "Mantener la recompra de 2 sobres; si alguien baja a 1, el volumen cae en proporción.",
    input: quickIn({ personal: [{ productId: "sobre", qty: 2 }], sponsored: [{ count: 10, productId: "sobre", qty: 2 }], distribution: { lines: 10, largestPct: 10, secondPct: 10, leftPct: 50 } }),
    expect: { rank: "m1" },
  },
  {
    id: "mixta",
    title: "4 · Organización mixta",
    situation: "8 clientes preferentes (la mitad compra 1 sobre y la otra mitad 2) y 12 patrocinados (8 compran 1 sobre y 4 compran 2).",
    assumptions: "Clientes y socios se combinan: el volumen de clientes cuenta para tu PV y para el Bono para el cliente.",
    limitation: "Los clientes suman 600 de volumen y alcanzan el tramo del 10 %; el 10 % Personal Team viene de los socios.",
    work: "Sumar clientes hasta 1 200 de volumen para el tramo del 20 % y seguir activando socios.",
    input: quickIn({
      personal: [{ productId: "sobre", qty: 2 }],
      customers: [{ count: 4, productId: "sobre", qty: 1, kind: "cliente_preferente" }, { count: 4, productId: "sobre", qty: 2, kind: "cliente_preferente" }],
      sponsored: [{ count: 8, productId: "sobre", qty: 1 }, { count: 4, productId: "sobre", qty: 2 }],
      distribution: { lines: 12, largestPct: 100 / 12, secondPct: 100 / 12, leftPct: 50 },
    }),
    expect: { rank: "m1" },
  },
  {
    id: "equilibrada",
    title: "5 · Organización equilibrada",
    situation: "4 líneas de 7 personas (líder + 6), todas compran 2 sobres; 2 líneas en cada pierna del binario.",
    assumptions: "Modo detallado: patrocinio y colocación definidos persona por persona.",
    limitation: "Cada línea aporta 700 de volumen; ninguna supera el 50 % del QDV y las piernas quedan iguales.",
    work: "Para 1★ Director: llevar el QDV a 5 000 con ninguna línea por encima de 2 500 y 1 000 en la pierna menor.",
    input: detIn(balancedPeople(2)),
    expect: { rank: "m3" },
  },
  {
    id: "concentrada",
    title: "6 · Mucho volumen en una sola rama",
    situation: "Las mismas 28 personas del equipo y las mismas compras que el caso 5, pero 22 están en la línea de Ana.",
    assumptions: "Modo detallado; mismo volumen total que el caso 5.",
    limitation: "Regla del 50 %, que se aplica al requisito de cada rango: para 2★ Manager (1 500) la línea de Ana solo cuenta 750 de sus 2 200, y el QDV contable es 1 350. Con el mismo volumen que el caso 5 te quedas en 1★ Manager.",
    work: "Desarrollar las otras líneas: con 150 de volumen más fuera de la línea de Ana llegarías a 2★ Manager, y con 650 más, a 3★ Manager.",
    input: detIn(concentratedPeople()),
    expect: { rank: "m1" },
  },
  {
    id: "incompleta",
    title: "7 · Volumen suficiente, requisitos incompletos",
    situation: "La organización del caso 5, pero tú solo compras 1 sobre y no tienes clientes propios.",
    assumptions: "Igual que el caso 5 salvo tu compra personal.",
    limitation: "Tu PV (50) no llega a los 55 de BP Activo: sin rango pagado, el 10 % Personal Team y el bono por subir de rango no se pagan, aunque el equipo tenga volumen.",
    work: "Subir tu PV a 55 o más (comprar 2 sobres o sumar un cliente) recupera el rango de 3★ Manager.",
    input: detIn(balancedPeople(1).filter((p) => p.id !== "k1")),
    expect: { rank: null },
  },
  {
    id: "pierde",
    title: "8 · La organización pierde compradores",
    situation: "Antes: 20 patrocinados compraban 2 sobres. Después: 5 dejan de comprar y 5 bajan a 1 sobre.",
    assumptions: "Mismas líneas; solo cambia la actividad.",
    limitation: "El volumen cae de 2 000 a 1 250: pierdes el 2★ Manager y el 10 % Personal Team baja en la misma proporción.",
    work: "Recuperar 5 compradores o volver a 2 sobres: los requisitos se miden en cada periodo, no se conservan.",
    input: quickIn({ personal: [{ productId: "sobre", qty: 2 }], sponsored: [{ count: 20, productId: "sobre", qty: 2 }], distribution: { lines: 20, largestPct: 5, secondPct: 5, leftPct: 50 } }),
    compare: {
      label: "Después", baseLabel: "Antes",
      input: quickIn({ personal: [{ productId: "sobre", qty: 2 }], sponsored: [{ count: 10, productId: "sobre", qty: 2 }, { count: 5, productId: "sobre", qty: 1 }], sponsoredInactive: 5, distribution: { lines: 15, largestPct: 100 / 15, secondPct: 100 / 15, leftPct: 50 } }),
    },
    expect: { rank: "m2", compareRank: "m1" },
  },
  {
    id: "comparacion",
    title: "Comparación · Mismas personas, distinta distribución",
    situation: "Dos organizaciones de 30 personas (tú, 1 cliente y 28 Brand Partners) que compran lo mismo (casos 5 y 6).",
    assumptions: "Modo detallado; mismo volumen total.",
    limitation: "La equilibrada llega a 3★ Manager; la concentrada se queda en 1★ Manager por la regla del 50 %.",
    work: "Equilibrar las líneas vale tanto como sumar volumen: el mismo trabajo rinde distinto según dónde se construye.",
    input: detIn(balancedPeople(2)),
    compare: { label: "Concentrada", baseLabel: "Equilibrada", input: detIn(concentratedPeople()) },
    expect: { rank: "m3", compareRank: "m1" },
  },
];
