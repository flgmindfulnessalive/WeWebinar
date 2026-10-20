// Calculadora simple: 7 datos → formas de ganar y total.
// Traduce los datos a una organización del modo rápido con supuestos fijos y
// declarados, y usa el mismo motor (simulate) para todo lo que calcula.
import { PLAN, rankById, rankIndex } from "../plan/plan-10-10-20";
import type { RankId } from "../plan/types";
import { cents, d, pct, sum, WEEKS_PER_MONTH, ZERO, type D } from "./decimal";
import { DEFAULT_ASSUMPTIONS, type Product, type QuickOrg } from "./model";
import { simulate, type SimulationResult } from "./simulate";

export interface SimpleInput {
  /** Socios (Brand Partners) en toda tu organización, incluidos tus directos. */
  partners: number;
  /** Cuántos de ellos inscribiste tú. */
  directs: number;
  /** Clientes preferentes tuyos. */
  customers: number;
  /** Sobres que compra cada socio y cada cliente al mes. */
  sachets: number;
  /** Sobres que compras tú al mes. */
  ownSachets: number;
  /** PV de un sobre (y volumen comisionable: se usa el mismo). */
  pvPerSachet: number;
  /** Ganancia minorista por sobre que compra un cliente (USD). */
  retailPerSachet: number;
}

export const DEFAULT_SIMPLE: SimpleInput = { partners: 150, directs: 10, customers: 10, sachets: 1, ownSachets: 1, pvPerSachet: 77, retailPerSachet: 50 };

export interface SimpleLine {
  id: "retail" | "personal-team" | "customer" | "binary" | "mentor";
  name: string;
  monthly: D;
  estimated: boolean;
  how: string[];
  why?: string;
}

export interface SimpleResult {
  errors: string[];
  rank: RankId | null;
  lines: SimpleLine[];
  confirmed: D;
  total: D;
  /** Bono por subir de rango (pago único), si alcanzas el rango por primera vez. */
  rankBonusTotal: D;
  rankBonusRanks: string[];
  next: { rank: RankId; gaps: string[] } | null;
  assumptions: string[];
  base: SimulationResult | null;
}

const fmt = (n: number) => n.toLocaleString("es-419");

export function validateSimple(s: SimpleInput): string[] {
  const e: string[] = [];
  for (const [v, w] of [[s.partners, "Socios"], [s.directs, "Directos"], [s.customers, "Clientes"]] as const) if (!Number.isInteger(v) || v < 0) e.push(`${w}: escribe un número entero de 0 o más.`);
  for (const [v, w] of [[s.sachets, "Sobres por persona"], [s.ownSachets, "Tus sobres"], [s.pvPerSachet, "PV por sobre"], [s.retailPerSachet ?? 0, "Ganancia por sobre"]] as const) if (!(v >= 0) || !Number.isFinite(v)) e.push(`${w}: escribe un número de 0 o más.`);
  if (s.directs > s.partners) e.push("Los directos forman parte de tus socios: no pueden ser más que el total de socios.");
  if (s.partners > s.directs && s.directs === 0) e.push("Para tener socios en tu organización necesitas al menos un directo.");
  return e;
}

/** Reparte N personas entre k directos lo más igual posible: [{count, size}]. */
function splitTeams(members: number, directs: number) {
  const base = Math.floor(members / directs), extra = members % directs;
  return [{ count: directs - extra, size: base }, { count: extra, size: base + 1 }].filter((g) => g.count > 0);
}

const quickOrg = (own: number, customers: number, directs: number, team: number, sachets: number): QuickOrg => ({
  personal: own > 0 ? [{ productId: "sobre", qty: own }] : [],
  customers: customers > 0 ? [{ count: customers, productId: "sobre", qty: sachets, kind: "cliente_preferente" }] : [],
  sponsored: directs > 0 ? [{ count: directs, productId: "sobre", qty: sachets }] : [],
  sponsoredInactive: 0,
  team: team > 0 ? [{ count: team, productId: "sobre", qty: sachets }] : [],
  teamInactive: 0,
  distribution: { lines: directs, largestPct: directs ? (directs === 1 ? 100 : 100 / directs) : 0, secondPct: directs > 1 ? 100 / directs : 0, leftPct: 50 },
  enrollments: [],
});

export function simpleCalc(s: SimpleInput): SimpleResult {
  const empty: SimpleResult = { errors: validateSimple(s), rank: null, lines: [], confirmed: ZERO, total: ZERO, rankBonusTotal: ZERO, rankBonusRanks: [], next: null, assumptions: [], base: null };
  if (empty.errors.length) return empty;

  const products: Product[] = [{ id: "sobre", name: "Sobre X39", qv: s.pvPerSachet, cv: s.pvPerSachet, retailMargin: s.retailPerSachet ?? 0 }];
  const a = DEFAULT_ASSUMPTIONS;
  const team = s.partners - s.directs;
  const r = simulate({ mode: "rapido", products, assumptions: a, quick: quickOrg(s.ownSachets, s.customers, s.directs, team, s.sachets) });
  if (!r.ok) return { ...empty, errors: [...r.errors, ...r.missing] };

  const comp = (id: string) => r.components.find((c) => c.id === id)!;
  const pv = s.pvPerSachet, sx = s.sachets;
  const lines: SimpleLine[] = [];

  const rt = comp("retail");
  lines.push({
    id: "retail", name: "Ganancia minorista", monthly: rt.monthly ?? ZERO, estimated: false,
    how: [`${fmt(s.customers)} clientes × ${fmt(sx)} sobre(s) × $${fmt(s.retailPerSachet ?? 0)} por sobre.`],
    why: rt.status === "no_elegible" ? rt.reasons[0] : undefined,
  });

  const pt = comp("personal-team");
  lines.push({
    id: "personal-team", name: "10 % de tus directos", monthly: pt.monthly ?? ZERO, estimated: false,
    how: [`${fmt(s.directs)} directos × ${fmt(sx)} sobre(s) × ${fmt(pv)} PV = ${fmt(s.directs * sx * pv)} PV`, `10 % de ese volumen al mes (Bono de Nivel Comprimido, desde 1★ Gerente).`],
    why: pt.status === "no_elegible" ? pt.reasons[0] : undefined,
  });

  const cu = comp("customer");
  const cqv = s.customers * sx * pv;
  const tier = [...PLAN.customerBonusTiers].reverse().find((t) => cqv >= t.minQv);
  lines.push({
    id: "customer", name: "Bono por Cliente", monthly: cu.monthly ?? ZERO, estimated: false,
    how: [`${fmt(s.customers)} clientes × ${fmt(sx)} sobre(s) × ${fmt(pv)} PV = ${fmt(cqv)} PV`, tier ? `Tramo del ${tier.pct} % (300+ PV → 5 %, 600+ → 10 %, 1 200+ → 20 %).` : "Por debajo de 300 PV no hay bono (300+ → 5 %, 600+ → 10 %, 1 200+ → 20 %)."],
    why: cu.status === "no_elegible" ? cu.reasons[0] : undefined,
  });

  const bi = comp("binary");
  const leg = ((team + s.directs) * sx * pv) / 2;
  lines.push({
    id: "binary", name: "Bono binario", monthly: bi.monthly ?? ZERO, estimated: false,
    how: [`Tu organización repartida mitad y mitad: pierna débil ≈ ${fmt(leg)} PV al mes (lo de la pierna fuerte se acumula para la semana siguiente).`, r.paidRank && rankById[r.paidRank].binaryPct ? `${rankById[r.paidRank].binaryPct} % por tu rango (${rankById[r.paidRank].short}), con tope semanal de $${fmt(rankById[r.paidRank].binaryWeeklyCap!)}.` : "Requiere al menos 1★ Gerente."],
    why: bi.status === "no_elegible" ? bi.reasons[0] : undefined,
  });

  // Mentor Match estimado: % de la Gen 1 × (Bono por Nivel + Binario) semanal de
  // cada directo, suponiendo que cada directo patrocinó a su propio equipo,
  // repartido por igual y en equilibrio. Generaciones 2+: sin equipo propio.
  const gens = r.paidRank ? rankById[r.paidRank].mentorGens : [];
  let mentorWeekly = ZERO;
  const mHow: string[] = [];
  if (gens.length && s.directs > 0) {
    const cap = d(rankById[r.paidRank!].mentorCapPerBp!);
    for (const g of splitTeams(team, s.directs)) {
      const dr = simulate({ mode: "rapido", products, assumptions: a, quick: quickOrg(s.sachets, 0, g.size, 0, s.sachets) });
      const m = (id: string) => (dr.ok ? dr.components.find((c) => c.id === id)!.monthly ?? ZERO : ZERO);
      const lw = m("personal-team").dividedBy(WEEKS_PER_MONTH), bw = m("binary").dividedBy(WEEKS_PER_MONTH);
      const each = pct(lw.plus(bw), gens[0]);
      const paid = each.gt(cap) ? cap : each;
      mentorWeekly = mentorWeekly.plus(paid.times(g.count));
      mHow.push(`${fmt(g.count)} directo(s) con equipo de ${fmt(g.size)}: rango ${dr.paidRank ? rankById[dr.paidRank].short : "sin rango"}, Nivel ≈ $${lw.toFixed(2)} + Binario ≈ $${bw.toFixed(2)} por semana → ${gens[0]} % ≈ $${paid.toFixed(2)}/semana cada uno.`);
    }
    mHow.push("Se supone que cada directo patrocinó a su propio equipo y que ese equipo aún no tiene equipo propio (Generaciones 2+ = 0).");
  }
  const mentorMonthly = cents(mentorWeekly.times(WEEKS_PER_MONTH));
  lines.push({
    id: "mentor", name: "Mentor Match", monthly: mentorMonthly, estimated: true,
    how: gens.length ? mHow : [],
    why: !gens.length ? "Empieza en 1★ Director." : undefined,
  });

  const confirmed = cents(sum(lines.filter((l) => !l.estimated).map((l) => l.monthly)));
  const total = cents(sum(lines.map((l) => l.monthly)));

  const reached = r.paidRank ? PLAN.ranks.filter((x) => x.rankBonus && rankIndex(x.id) <= rankIndex(r.paidRank!)) : [];
  const nextEval = r.nextRank ? r.qualificationMonth!.evaluations.find((e) => e.rank === r.nextRank) : null;
  const nextMvr = r.nextRank ? rankById[r.nextRank].mvr : null;
  const gapText = (key: string, gap: D) => {
    const n = Math.ceil(Number(gap.toString()));
    if (key === "pv") return `${fmt(n)} PV más de compra propia o de tus clientes`;
    if (key === "qdv") return `${fmt(n)} PV más en tu organización (≈ ${fmt(Math.ceil(n / (sx * pv || 1)))} socios más comprando ${fmt(sx)} sobre(s)${nextMvr ? `; ninguna línea cuenta más de ${fmt(nextMvr)}` : ""})`;
    if (key === "ol2l") return `${fmt(n)} PV más fuera de tus 2 líneas más grandes`;
    return `${fmt(n)} PV más en tu pierna débil`;
  };
  return {
    errors: [], rank: r.paidRank, lines, confirmed, total,
    rankBonusTotal: d(reached.reduce((x, y) => x + (y.rankBonus ?? 0), 0)), rankBonusRanks: reached.map((x) => `${x.short} $${fmt(x.rankBonus!)}`),
    next: nextEval ? { rank: nextEval.rank, gaps: nextEval.checks.filter((c) => !c.ok).map((c) => gapText(c.key, c.gap)) } : null,
    assumptions: [
      `Cada sobre suma ${fmt(pv)} PV (los porcentajes se calculan sobre ese mismo volumen) y deja $${fmt(s.retailPerSachet ?? 0)} de ganancia minorista cuando lo compra un cliente.`,
      "Tu organización está equilibrada: mitad en cada pierna y repartida por igual entre tus directos.",
      "Todos compran cada mes; cálculo mensual.",
      "Binario: % de la pierna débil acumulada, con tope semanal. Mentor Match: % × (Nivel + Binario) semanal de tus directos; es estimado porque supone cómo están armados sus equipos.",
      "Reglas: tabla oficial «Plan de Compensación LifeWave 10-10-20 (EE. UU.)».",
    ],
    base: r,
  };
}
