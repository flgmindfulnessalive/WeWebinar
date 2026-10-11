// Utilidades de prueba. Los volúmenes de producto son de PRUEBA (no del plan).
import { DEFAULT_ASSUMPTIONS, type Assumptions, type DetailedOrg, type Person, type Product, type QuickOrg, type SimulationInput } from "../src/engine/model";

export const SOBRE: Product = { id: "sobre", name: "Sobre de prueba", qv: 50, cv: 40, retailMargin: 10 };
export const products = [SOBRE];

export const quick = (o: Partial<QuickOrg> = {}): QuickOrg => ({
  personal: [], customers: [], sponsored: [], sponsoredInactive: 0, team: [], teamInactive: 0,
  distribution: { lines: 0, largestPct: 0, secondPct: 0, leftPct: 50 }, enrollments: [], ...o,
});

export const qin = (q: QuickOrg, a: Partial<Assumptions> = {}, p: Product[] = products): SimulationInput => ({
  mode: "rapido", products: p, quick: q, assumptions: { ...DEFAULT_ASSUMPTIONS, ...a },
});

export const din = (people: Person[], a: Partial<Assumptions> = {}, p: Product[] = products): SimulationInput => ({
  mode: "detallado", products: p, detailed: { people } as DetailedOrg, assumptions: { ...DEFAULT_ASSUMPTIONS, ...a },
});

export const bp = (id: string, sponsorId: string | null, place: [string, "L" | "R"] | null, qty = 0, extra: Partial<Person> = {}): Person => ({
  id, label: id, kind: "bp", sponsorId, placement: place ? { parentId: place[0], side: place[1] } : null, orders: qty ? [{ productId: "sobre", qty }] : [], ...extra,
});
export const cust = (id: string, sponsorId: string, qty: number, kind: "cliente" | "cliente_preferente" = "cliente"): Person => ({
  id, label: id, kind, sponsorId, placement: null, orders: [{ productId: "sobre", qty }],
});
