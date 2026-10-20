// Calculadora simple: 10 datos → formas de ganar y total.
// Traduce los datos a una organización del modo rápido con supuestos fijos y
// declarados, y usa el mismo motor (simulate) para todo lo que calcula.
import { PLAN, rankById, rankIndex } from "../plan/plan-10-10-20";
import type { RankId } from "../plan/types";
import { cents, d, pct, sum, WEEKS_PER_MONTH, ZERO, type D } from "./decimal";
import { DEFAULT_ASSUMPTIONS, type Product, type QuickOrg } from "./model";
import { atLeast } from "./simulate";
import { simulate, type SimulationResult } from "./simulate";

export interface SimpleInput {
  /** Socios (Brand Partners) en toda tu organización, incluidos tus directos. */
  partners: number;
  /** Cuántos de ellos inscribiste tú. */
  directs: number;
  /** Clientes minoristas (retail) tuyos. */
  retailCustomers: number;
  /** Clientes preferentes tuyos. */
  preferredCustomers: number;
  /** % de tus directos que compran cada mes (el resto está inactivo). */
  activeDirectsPct: number;
  /** Sobres que compra cada socio y cada cliente al mes. */
  sachets: number;
  /** Sobres que compras tú al mes. */
  ownSachets: number;
  /** PV de un sobre (y volumen comisionable: se usa el mismo). */
  pvPerSachet: number;
  /** Ganancia por sobre que compra un cliente minorista (USD). */
  retailPerSachet: number;
  /** Ganancia por sobre que compra un cliente preferente (USD). */
  preferredPerSachet: number;
  /** 1★ Directores en tus líneas (Mentor Match). null = propuesta automática. */
  directors: number | null;
}

export const DEFAULT_SIMPLE: SimpleInput = {
  partners: 150, directs: 10, activeDirectsPct: 100, retailCustomers: 0, preferredCustomers: 10,
  sachets: 1, ownSachets: 1, pvPerSachet: 77, retailPerSachet: 50, preferredPerSachet: 20, directors: null,
};

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
  /** Directores 1★ en tus líneas: cuántos caben y cuántos se usan. */
  directors: { max: number; used: number };
  assumptions: string[];
  base: SimulationResult | null;
}

const fmt = (n: number) => n.toLocaleString("es-419");

export function validateSimple(s: SimpleInput): string[] {
  const e: string[] = [];
  for (const [v, w] of [[s.partners, "Socios"], [s.directs, "Directos"], [s.retailCustomers, "Clientes minoristas"], [s.preferredCustomers, "Clientes preferentes"]] as const) if (!Number.isInteger(v) || v < 0) e.push(`${w}: escribe un número entero de 0 o más.`);
  for (const [v, w] of [[s.sachets, "Sobres por persona"], [s.ownSachets, "Tus sobres"], [s.pvPerSachet, "PV por sobre"], [s.retailPerSachet, "Ganancia por sobre (minorista)"], [s.preferredPerSachet, "Ganancia por sobre (preferente)"]] as const) if (!(v >= 0) || !Number.isFinite(v)) e.push(`${w}: escribe un número de 0 o más.`);
  if (s.directors != null && (!Number.isInteger(s.directors) || s.directors < 0)) e.push("Directores en tus líneas: escribe un número entero de 0 o más.");
  if (!(s.activeDirectsPct >= 0 && s.activeDirectsPct <= 100)) e.push("Directos activos: escribe un % entre 0 y 100.");
  if (s.directs > s.partners) e.push("Los directos forman parte de tus socios: no pueden ser más que el total de socios.");
  if (s.partners > s.directs && s.directs === 0) e.push("Para tener socios en tu organización necesitas al menos un directo.");
  return e;
}

/** Directos que compran: el % redondeado al entero más cercano. */
export const activeDirects = (s: SimpleInput) => Math.round((s.directs * s.activeDirectsPct) / 100);

const quickOrg = (own: number, retailC: number, preferredC: number, directs: number, inactive: number, team: number, sachets: number): QuickOrg => ({
  personal: own > 0 ? [{ productId: "sobre", qty: own }] : [],
  customers: [
    ...(retailC > 0 ? [{ count: retailC, productId: "sobre", qty: sachets, kind: "cliente" as const }] : []),
    ...(preferredC > 0 ? [{ count: preferredC, productId: "sobre", qty: sachets, kind: "cliente_preferente" as const }] : []),
  ],
  sponsored: directs > 0 ? [{ count: directs, productId: "sobre", qty: sachets }] : [],
  sponsoredInactive: inactive,
  team: team > 0 ? [{ count: team, productId: "sobre", qty: sachets }] : [],
  teamInactive: 0,
  distribution: { lines: directs + inactive, largestPct: directs + inactive ? (directs + inactive === 1 ? 100 : 100 / (directs + inactive)) : 0, secondPct: directs + inactive > 1 ? 100 / (directs + inactive) : 0, leftPct: 50 },
  enrollments: [],
});

/**
 * Organización mínima de un 1★ Director con tus hábitos: busca el menor número
 * de socios con el que el motor lo califica como 1★ Director y devuelve sus
 * ganancias semanales de Nivel y Binario.
 */
function directorModel(s: SimpleInput, products: Product[]) {
  const unitPv = s.sachets * s.pvPerSachet;
  if (!(unitPv > 0)) return null;
  const minRank = rankById[PLAN.mentorGenerationMinRank];
  const own = Math.max(s.sachets, Math.ceil(minRank.pv / (s.pvPerSachet || 1)));
  for (let size = Math.ceil(minRank.qdv! / unitPv); size <= Math.ceil(minRank.qdv! / unitPv) + 50; size++) {
    const dd = Math.max(2, Math.min(s.directs, size));
    const dr = simulate({ mode: "rapido", products, assumptions: DEFAULT_ASSUMPTIONS, quick: quickOrg(own, 0, 0, dd, 0, size - dd, s.sachets) });
    if (!dr.ok || !atLeast(dr.paidRank, minRank.id)) continue;
    const m = (id: string) => dr.components.find((c) => c.id === id)!.monthly ?? ZERO;
    return { size, levelWeekly: m("personal-team").dividedBy(WEEKS_PER_MONTH), binaryWeekly: m("binary").dividedBy(WEEKS_PER_MONTH) };
  }
  return null;
}

export function simpleCalc(s: SimpleInput): SimpleResult {
  const empty: SimpleResult = { errors: validateSimple(s), rank: null, lines: [], confirmed: ZERO, total: ZERO, rankBonusTotal: ZERO, rankBonusRanks: [], next: null, directors: { max: 0, used: 0 }, assumptions: [], base: null };
  if (empty.errors.length) return empty;

  const products: Product[] = [{ id: "sobre", name: "Sobre X39", qv: s.pvPerSachet, cv: s.pvPerSachet, retailMargin: s.retailPerSachet, preferredMargin: s.preferredPerSachet }];
  const a = DEFAULT_ASSUMPTIONS;
  const team = s.partners - s.directs;
  const active = activeDirects(s), inactive = s.directs - active;
  const customers = s.retailCustomers + s.preferredCustomers;
  const r = simulate({ mode: "rapido", products, assumptions: a, quick: quickOrg(s.ownSachets, s.retailCustomers, s.preferredCustomers, active, inactive, team, s.sachets) });
  if (!r.ok) return { ...empty, errors: [...r.errors, ...r.missing] };

  const comp = (id: string) => r.components.find((c) => c.id === id)!;
  const pv = s.pvPerSachet, sx = s.sachets;
  const lines: SimpleLine[] = [];

  const rt = comp("retail");
  lines.push({
    id: "retail", name: "Ganancia por tus clientes", monthly: rt.monthly ?? ZERO, estimated: false,
    how: [
      `Minoristas: ${fmt(s.retailCustomers)} × ${fmt(sx)} sobre(s) × $${fmt(s.retailPerSachet)} = $${fmt(s.retailCustomers * sx * s.retailPerSachet)}`,
      `Preferentes: ${fmt(s.preferredCustomers)} × ${fmt(sx)} sobre(s) × $${fmt(s.preferredPerSachet)} = $${fmt(s.preferredCustomers * sx * s.preferredPerSachet)}`,
    ],
    why: rt.status === "no_elegible" ? rt.reasons[0] : undefined,
  });

  const pt = comp("personal-team");
  lines.push({
    id: "personal-team", name: "10 % de tus directos", monthly: pt.monthly ?? ZERO, estimated: false,
    how: [`${fmt(active)} directos activos (${fmt(s.activeDirectsPct)} % de ${fmt(s.directs)}) × ${fmt(sx)} sobre(s) × ${fmt(pv)} PV = ${fmt(active * sx * pv)} PV${inactive ? ` (${fmt(inactive)} inactivos no suman)` : ""}`, `10 % de ese volumen al mes (Bono de Nivel Comprimido, desde 1★ Gerente).`],
    why: pt.status === "no_elegible" ? pt.reasons[0] : undefined,
  });

  const cu = comp("customer");
  const cqv = customers * sx * pv;
  const tier = [...PLAN.customerBonusTiers].reverse().find((t) => cqv >= t.minQv);
  lines.push({
    id: "customer", name: "Bono por Cliente", monthly: cu.monthly ?? ZERO, estimated: false,
    how: [`${fmt(customers)} clientes (minoristas + preferentes) × ${fmt(sx)} sobre(s) × ${fmt(pv)} PV = ${fmt(cqv)} PV`, tier ? `Tramo del ${tier.pct} % (300+ PV → 5 %, 600+ → 10 %, 1 200+ → 20 %).` : "Por debajo de 300 PV no hay bono (300+ → 5 %, 600+ → 10 %, 1 200+ → 20 %)."],
    why: cu.status === "no_elegible" ? cu.reasons[0] : undefined,
  });

  const bi = comp("binary");
  const leg = ((team + active) * sx * pv) / 2;
  lines.push({
    id: "binary", name: "Bono binario", monthly: bi.monthly ?? ZERO, estimated: false,
    how: [`Tu organización repartida mitad y mitad: pierna débil ≈ ${fmt(leg)} PV al mes (lo de la pierna fuerte se acumula para la semana siguiente).`, r.paidRank && rankById[r.paidRank].binaryPct ? `${rankById[r.paidRank].binaryPct} % por tu rango (${rankById[r.paidRank].short}), con tope semanal de $${fmt(rankById[r.paidRank].binaryWeeklyCap!)}.` : "Requiere al menos 1★ Gerente."],
    why: bi.status === "no_elegible" ? bi.reasons[0] : undefined,
  });

  // Mentor Match estimado. Generación = 1★ Director o superior en tus líneas.
  // Propuesta automática: cuántos 1★ Director caben en tu organización si cada
  // uno tiene lo mínimo para calificar (5 000 de volumen en su organización),
  // con los mismos hábitos de compra y el mismo número de directos que tú, y
  // llegando a sus 110 PV. Todos como Gen 1 (sin Directores anidados debajo).
  const gens = r.paidRank ? rankById[r.paidRank].mentorGens : [];
  const leader = directorModel(s, products);
  const available = team + active;
  const maxDirectors = leader ? Math.floor(available / (leader.size + 1)) : 0;
  const usedDirectors = Math.min(s.directors ?? maxDirectors, maxDirectors);
  let mentorWeekly = ZERO;
  const mHow: string[] = [];
  if (gens.length) {
    const cap = d(rankById[r.paidRank!].mentorCapPerBp!);
    if (!leader) mHow.push("Con estos datos nadie en tu organización puede llegar a 1★ Director.");
    else {
      const each = pct(leader.levelWeekly.plus(leader.binaryWeekly), gens[0]);
      const paid = each.gt(cap) ? cap : each;
      mentorWeekly = paid.times(usedDirectors);
      mHow.push(`Directores 1★ en tus líneas: ${fmt(usedDirectors)}${s.directors == null ? " (propuesta automática)" : ""}. Con tu volumen caben como máximo ${fmt(maxDirectors)}: cada uno necesita ${fmt(leader.size)} socios en su organización (≥ 5 000 de volumen).`);
      if (s.directors != null && s.directors > maxDirectors) mHow.push(`Pusiste ${fmt(s.directors)}, pero solo caben ${fmt(maxDirectors)}: se usan ${fmt(maxDirectors)}.`);
      mHow.push(`Cada Director: Nivel ≈ $${leader.levelWeekly.toFixed(2)} + Binario ≈ $${leader.binaryWeekly.toFixed(2)} por semana → Gen 1: ${gens[0]} % ≈ $${paid.toFixed(2)}/semana${each.gt(cap) ? ` (tope de $${fmt(rankById[r.paidRank!].mentorCapPerBp!)} por socio)` : ""}.`);
      mHow.push("Supone que cada Director tiene lo mínimo para calificar, tus mismos hábitos de compra y tu número de directos, y que llega a sus 110 PV (con compras propias o clientes). No se cuentan Directores anidados (Gen 2+).");
    }
  }
  const mentorMonthly = cents(mentorWeekly.times(WEEKS_PER_MONTH));
  lines.push({
    id: "mentor", name: "Mentor Match", monthly: mentorMonthly, estimated: true,
    how: gens.length ? mHow : [],
    why: !gens.length ? `Empieza en 1★ Director.${maxDirectors ? ` En tus líneas caben ${fmt(maxDirectors)} Director(es) 1★ cuando llegues.` : ""}` : undefined,
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
    errors: [], rank: r.paidRank, lines, confirmed, total, directors: { max: maxDirectors, used: usedDirectors },
    rankBonusTotal: d(reached.reduce((x, y) => x + (y.rankBonus ?? 0), 0)), rankBonusRanks: reached.map((x) => `${x.short} $${fmt(x.rankBonus!)}`),
    next: nextEval ? { rank: nextEval.rank, gaps: nextEval.checks.filter((c) => !c.ok).map((c) => gapText(c.key, c.gap)) } : null,
    assumptions: [
      `Cada sobre suma ${fmt(pv)} PV (los porcentajes se calculan sobre ese mismo volumen) y deja $${fmt(s.retailPerSachet)} si lo compra un cliente minorista o $${fmt(s.preferredPerSachet)} si lo compra un cliente preferente.`,
      `${fmt(s.activeDirectsPct)} % de tus directos activos (${fmt(active)} de ${fmt(s.directs)}): los inactivos cuentan como socios pero no compran ni suman volumen. El resto de tu organización compra cada mes.`,
      "Tu organización está equilibrada: mitad en cada pierna y repartida por igual entre tus directos.",
      "Cálculo mensual.",
      "Binario: % de la pierna débil acumulada, con tope semanal. Mentor Match: % × (Nivel + Binario) semanal de los 1★ Director de tus líneas; es estimado porque supone cuántos hay (propuesta automática: los que caben con tu volumen) y cuánto gana cada uno.",
      "Reglas: tabla oficial «Plan de Compensación LifeWave 10-10-20 (EE. UU.)».",
    ],
    base: r,
  };
}
