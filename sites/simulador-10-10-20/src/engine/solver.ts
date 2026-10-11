// Calculadora de meta: «¿qué tendría que construir?».
// Para cada estructura y patrón de compra busca el menor número de
// compradores N que alcanza la meta, y vuelve a pasar la solución por el
// motor directo para comprobarla.
//
// Por qué la búsqueda es exacta dentro de cada estructura: con proporciones
// fijas, al pasar de N a N+1 ningún grupo pierde personas (los redondeos solo
// suman 0 o 1 a cada grupo), así que todos los volúmenes crecen o se
// mantienen. Todos los requisitos de rango son umbrales de volumen y todos
// los bonos crecen con el volumen (los topes también suben con el rango).
// Por tanto el ingreso es no decreciente en N y la búsqueda binaria encuentra
// el mínimo. Aun así, el resultado se verifica: N cumple y N−1 no.
import { cents, d, type D, ZERO } from "./decimal";
import type { Assumptions, Product, QuickOrg } from "./model";
import { simulate, type SimulationResult } from "./simulate";
import type { RankId } from "../plan/types";

export type Structure = "clientes" | "socios" | "mixta" | "profundidad";

export const STRUCTURE_LABEL: Record<Structure, string> = {
  clientes: "Solo clientes personales",
  socios: "Solo Brand Partners patrocinados personalmente",
  mixta: "Mixta: clientes y patrocinados",
  profundidad: "Organización con profundidad (binario)",
};

export interface GoalInput {
  /** Meta de ingreso recurrente mensual en USD. */
  target: number;
  /** Qué medida mensual se compara con la meta. */
  measure: "promedio" | "4semanas";
  productId: string;
  /** Tus propias unidades al mes. */
  personalQty: number;
  /** % de compradores que compran 1 unidad (el resto compra 2). */
  pctOne: number;
  /** % de clientes en la estructura mixta. */
  customerPct: number;
  customerKind: "cliente" | "cliente_preferente";
  /** % de compradores patrocinados personalmente en la estructura con profundidad. */
  sponsoredPct: number;
  /** % del volumen del equipo en la pierna izquierda (50 = equilibrado). */
  leftPct: number;
  /** Si se cuentan los componentes que solo existen con supuestos (binario). */
  includeAssumptions: boolean;
  maxBuyers: number;
}

export const DEFAULT_GOAL: GoalInput = {
  target: 500, measure: "promedio", productId: "sobre", personalQty: 2, pctOne: 50, customerPct: 50,
  customerKind: "cliente_preferente", sponsoredPct: 30, leftPct: 50, includeAssumptions: false, maxBuyers: 20000,
};

export interface Solution {
  structure: Structure;
  pattern: string;
  pctOne: number;
  buyers: number;
  org: QuickOrg;
  result: SimulationResult;
  income: D;
  verified: boolean;
  /** true si N−1 compradores no alcanzan la meta (mínimo demostrado en esta estructura). */
  provenMinimal: boolean;
  units: number;
  volume: D;
  sponsored: number;
  customers: number;
  team: number;
  rank: RankId | null;
  sensitivity: { label: string; income: D }[];
}

export interface Unreachable {
  structure: Structure;
  pattern: string;
  pctOne: number;
  reason: string;
  incomeAtMax: D | null;
}

export interface GoalResult {
  solutions: Solution[];
  unreachable: Unreachable[];
  blocked: string[];
  evaluated: string;
}

const split = (n: number, pctOne: number) => {
  const one = Math.round((n * pctOne) / 100);
  return { one, two: n - one };
};

export function buildOrg(s: Structure, n: number, g: GoalInput): QuickOrg {
  const groups = (k: number) => {
    const { one, two } = split(k, g.pctOne);
    return [
      ...(one ? [{ count: one, productId: g.productId, qty: 1 }] : []),
      ...(two ? [{ count: two, productId: g.productId, qty: 2 }] : []),
    ];
  };
  let customers = 0, sponsored = 0, team = 0;
  if (s === "clientes") customers = n;
  else if (s === "socios") sponsored = n;
  else if (s === "mixta") { customers = Math.round((n * g.customerPct) / 100); sponsored = n - customers; }
  else { sponsored = Math.max(1, Math.round((n * g.sponsoredPct) / 100)); sponsored = Math.min(sponsored, n); team = n - sponsored; }
  const lines = sponsored;
  const even = lines ? 100 / lines : 0;
  return {
    personal: g.personalQty > 0 ? [{ productId: g.productId, qty: g.personalQty }] : [],
    customers: groups(customers).map((x) => ({ ...x, kind: g.customerKind })),
    sponsored: groups(sponsored),
    sponsoredInactive: 0,
    team: groups(team),
    teamInactive: 0,
    distribution: { lines, largestPct: lines === 1 ? 100 : even, secondPct: lines === 1 ? 0 : lines === 2 ? 100 - even : even, leftPct: s === "profundidad" ? g.leftPct : 50 },
    enrollments: [],
  };
}

const incomeOf = (r: SimulationResult, g: GoalInput): D => {
  if (!r.ok) return ZERO;
  const rec = r.components.filter((c) => c.classification === "potencialmente_recurrente" && (c.status === "calculado" || (g.includeAssumptions && c.status === "hipotetico")));
  return cents(rec.reduce((a, c) => a.plus(g.measure === "4semanas" ? c.monthly4w ?? c.monthly ?? ZERO : c.monthly ?? ZERO), ZERO));
};

export function solve(g: GoalInput, products: Product[], base: Assumptions): GoalResult {
  const blocked: string[] = [];
  const p = products.find((x) => x.id === g.productId);
  if (!p) blocked.push("Elige un producto del catálogo.");
  else if (p.qv == null || p.cv == null) blocked.push(`Falta el volumen de «${p.name}». Introdúcelo en Catálogo: las fuentes no lo indican.`);
  if (!(g.target > 0)) blocked.push("La meta debe ser mayor que 0.");
  if (!(g.maxBuyers >= 1)) blocked.push("El límite de búsqueda debe ser al menos 1.");
  const out: GoalResult = { solutions: [], unreachable: [], blocked, evaluated: "" };
  if (blocked.length) return out;

  const a: Assumptions = { ...base, assumeBinary: g.includeAssumptions ? true : base.assumeBinary };
  const structures: Structure[] = ["socios", "clientes", "mixta", ...(g.includeAssumptions ? (["profundidad"] as Structure[]) : [])];
  const patterns = [
    { label: "Todos compran 1 unidad", pctOne: 100 },
    { label: "Todos compran 2 unidades", pctOne: 0 },
    ...(g.pctOne !== 100 && g.pctOne !== 0 ? [{ label: `Mixta: ${g.pctOne} % compra 1 y ${100 - g.pctOne} % compra 2`, pctOne: g.pctOne }] : []),
  ];
  const target = d(g.target);
  for (const s of structures) {
    for (const pat of patterns) {
      const gg = { ...g, pctOne: pat.pctOne };
      const run = (n: number) => simulate({ mode: "rapido", products, quick: buildOrg(s, n, gg), assumptions: a });
      const meets = (n: number) => incomeOf(run(n), gg).gte(target);
      const atMax = run(g.maxBuyers);
      if (!meets(g.maxBuyers)) {
        out.unreachable.push({ structure: s, pattern: pat.label, pctOne: pat.pctOne, incomeAtMax: atMax.ok ? incomeOf(atMax, gg) : null, reason: unreachableReason(s, atMax, gg) });
        continue;
      }
      let lo = 1, hi = g.maxBuyers;
      while (lo < hi) { const mid = Math.floor((lo + hi) / 2); if (meets(mid)) hi = mid; else lo = mid + 1; }
      const n = lo;
      const org = buildOrg(s, n, gg);
      const result = simulate({ mode: "rapido", products, quick: org, assumptions: a });
      const income = incomeOf(result, gg);
      const units = (result.counts?.totalUnits ?? 0);
      const sens = [
        { label: "10 % menos compradores", n: Math.floor(n * 0.9) },
        { label: "25 % menos compradores", n: Math.floor(n * 0.75) },
      ].map((x) => ({ label: x.label, income: x.n > 0 ? incomeOf(run(x.n), gg) : ZERO }));
      if (pat.pctOne < 100) sens.push({ label: "Quienes compraban 2 pasan a comprar 1", income: incomeOf(simulate({ mode: "rapido", products, quick: buildOrg(s, n, { ...gg, pctOne: 100 }), assumptions: a }), gg) });
      out.solutions.push({
        structure: s, pattern: pat.label, pctOne: pat.pctOne, buyers: n, org, result, income,
        verified: result.ok && income.gte(target),
        provenMinimal: n === 1 || !meets(n - 1),
        units, volume: result.volumes?.totalQv ?? ZERO,
        sponsored: org.sponsored.reduce((x, y) => x + y.count, 0),
        customers: org.customers.reduce((x, y) => x + y.count, 0),
        team: org.team.reduce((x, y) => x + y.count, 0),
        rank: result.paidRank,
        sensitivity: sens,
      });
    }
  }
  out.evaluated = `Estructuras: ${structures.map((x) => STRUCTURE_LABEL[x]).join(", ")}. Patrones de compra: ${patterns.map((x) => x.label).join("; ")}. Compradores de 1 a ${g.maxBuyers.toLocaleString("es-419")} (además de ti).`;
  return out;
}

function unreachableReason(s: Structure, r: SimulationResult, g: GoalInput): string {
  if (!r.ok) return r.errors[0] ?? r.missing.join(", ");
  const get = (id: string) => r.components.find((c) => c.id === id)!;
  if (!r.paidRank) {
    const pv = r.qualificationMonth?.evaluations[0]?.checks.find((c) => c.key === "pv");
    return `No llegas a BP Activo: tu PV es ${pv ? pv.actual.toString() : "0"} y se necesitan 55. Sin rango, el 10 % Personal Team no se paga aunque tengas compradores. Sube tus unidades personales o suma clientes propios.`;
  }
  if (s === "clientes") {
    const retail = get("retail");
    return `Con solo clientes, el ingreso recurrente calculable es el Bono para el cliente (máx. 20 %)${retail.status === "pendiente" ? "; el margen minorista está pendiente porque no has introducido tu margen por unidad" : " y tu margen minorista"}. Con ${g.maxBuyers.toLocaleString("es-419")} compradores no alcanza la meta.`;
  }
  if (s === "profundidad") return `Ni con ${g.maxBuyers.toLocaleString("es-419")} compradores se alcanza: revisa el reparto de piernas (el binario solo paga sobre la pierna menor en este supuesto) y los topes semanales.`;
  return `Con ${g.maxBuyers.toLocaleString("es-419")} compradores no se alcanza la meta en esta estructura.`;
}
