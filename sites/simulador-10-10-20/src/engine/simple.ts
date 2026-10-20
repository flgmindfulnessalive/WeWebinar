// Calculadora simple: 10 datos → formas de ganar y total.
// Traduce los datos a una organización del modo rápido con supuestos fijos y
// declarados, y usa el mismo motor (simulate) para todo lo que calcula.
import { PLAN, rankById, rankIndex } from "../plan/plan-10-10-20";
import type { RankId, RankRule } from "../plan/types";
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
  /** Líderes (1★ Director o más) en tu Gen 1 para el Mentor Match. null = propuesta automática. */
  directors: number | null;
  /** % del volumen en la pierna fuerte del binario (60 = reparto 60/40). */
  strongLegPct: number;
}

export const DEFAULT_SIMPLE: SimpleInput = {
  partners: 150, directs: 10, activeDirectsPct: 100, retailCustomers: 0, preferredCustomers: 10,
  sachets: 1, ownSachets: 1, pvPerSachet: 77, retailPerSachet: 50, preferredPerSachet: 20, directors: null, strongLegPct: 60,
};

export interface SimpleLine {
  id: "retail" | "personal-team" | "customer" | "binary" | "mentor";
  name: string;
  monthly: D;
  estimated: boolean;
  /** Etiqueta corta junto al nombre (p. ej., «tope semanal»). */
  tag?: string;
  how: string[];
  why?: string;
}

export interface LeaderTier { gen: number; rank: RankId; count: number; size: number; levelWeekly: D; binaryWeekly: D; paidWeekly: D }

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
  /** Líderes del Mentor Match: cuántos caben en tu Gen 1, cuántos se usan y todos por generación. */
  directors: { max: number; used: number; tiers: LeaderTier[] };
  assumptions: string[];
  base: SimulationResult | null;
}

const fmt = (n: number) => n.toLocaleString("es-419");

export function validateSimple(s: SimpleInput): string[] {
  const e: string[] = [];
  for (const [v, w] of [[s.partners, "Socios"], [s.directs, "Directos"], [s.retailCustomers, "Clientes minoristas"], [s.preferredCustomers, "Clientes preferentes"]] as const) if (!Number.isInteger(v) || v < 0) e.push(`${w}: escribe un número entero de 0 o más.`);
  for (const [v, w] of [[s.sachets, "Sobres por persona"], [s.ownSachets, "Tus sobres"], [s.pvPerSachet, "PV por sobre"], [s.retailPerSachet, "Ganancia por sobre (minorista)"], [s.preferredPerSachet, "Ganancia por sobre (preferente)"]] as const) if (!(v >= 0) || !Number.isFinite(v)) e.push(`${w}: escribe un número de 0 o más.`);
  if (s.directors != null && (!Number.isInteger(s.directors) || s.directors < 0)) e.push("Líderes en tu Gen 1: escribe un número entero de 0 o más.");
  if (!(s.strongLegPct >= 50 && s.strongLegPct <= 100)) e.push("Pierna fuerte del binario: escribe un % entre 50 y 100.");
  if (!(s.activeDirectsPct >= 0 && s.activeDirectsPct <= 100)) e.push("Directos activos: escribe un % entre 0 y 100.");
  if (s.directs > s.partners) e.push("Los directos forman parte de tus socios: no pueden ser más que el total de socios.");
  if (s.partners > s.directs && s.directs === 0) e.push("Para tener socios en tu organización necesitas al menos un directo.");
  return e;
}

/** Directos que compran: el % redondeado al entero más cercano. */
export const activeDirects = (s: SimpleInput) => Math.round((s.directs * s.activeDirectsPct) / 100);

const quickOrg = (own: number, retailC: number, preferredC: number, directs: number, inactive: number, team: number, sachets: number, strongPct = 50): QuickOrg => ({
  personal: own > 0 ? [{ productId: "sobre", qty: own }] : [],
  customers: [
    ...(retailC > 0 ? [{ count: retailC, productId: "sobre", qty: sachets, kind: "cliente" as const }] : []),
    ...(preferredC > 0 ? [{ count: preferredC, productId: "sobre", qty: sachets, kind: "cliente_preferente" as const }] : []),
  ],
  sponsored: directs > 0 ? [{ count: directs, productId: "sobre", qty: sachets }] : [],
  sponsoredInactive: inactive,
  team: team > 0 ? [{ count: team, productId: "sobre", qty: sachets }] : [],
  teamInactive: 0,
  distribution: { lines: directs + inactive, largestPct: directs + inactive ? (directs + inactive === 1 ? 100 : 100 / (directs + inactive)) : 0, secondPct: directs + inactive > 1 ? 100 / (directs + inactive) : 0, leftPct: strongPct },
  enrollments: [],
});

type Leader = { rank: RankId; size: number; levelWeekly: D; binaryWeekly: D };
/** Los líderes solo dependen de los hábitos (no del tamaño de tu organización): se guardan. */
const LEADERS = new Map<string, Leader | null>();

/**
 * Organización mínima de un líder del rango indicado con tus hábitos (mismo
 * consumo, tus directos —al menos 4— y tu reparto del binario), llegando al PV
 * de su rango. Busca el menor número de socios con el que el motor lo califica
 * y devuelve sus ganancias semanales de Nivel y Binario.
 */
function leaderModel(s: SimpleInput, products: Product[], rank: RankRule): Leader | null {
  const unitPv = s.sachets * s.pvPerSachet;
  if (!(unitPv > 0) || rank.qdv == null) return null;
  // Para los rangos de 200 PV solo cuentan 110 personales: el resto, con clientes.
  const ownPv = Math.min(rank.pv, PLAN.personalPvCapForPv200);
  const own = Math.max(s.sachets, Math.ceil(ownPv / (s.pvPerSachet || 1)));
  const counted = Math.min(own * s.pvPerSachet, rank.pv === 200 ? PLAN.personalPvCapForPv200 : Infinity);
  const clients = Math.max(0, Math.ceil((rank.pv - counted) / unitPv));
  let size = Math.ceil(rank.qdv / unitPv);
  for (let i = 0; i < 200; i++, size += Math.max(1, Math.ceil(size * 0.02))) {
    const dd = Math.max(4, Math.min(s.directs, size));
    if (dd > size) continue;
    const dr = simulate({ mode: "rapido", products, assumptions: DEFAULT_ASSUMPTIONS, quick: quickOrg(own, 0, clients, dd, 0, size - dd, s.sachets, s.strongLegPct) });
    if (!dr.ok || !atLeast(dr.paidRank, rank.id)) continue;
    const m = (id: string) => dr.components.find((c) => c.id === id)!.monthly ?? ZERO;
    return { rank: dr.paidRank!, size, levelWeekly: m("personal-team").dividedBy(WEEKS_PER_MONTH), binaryWeekly: m("binary").dividedBy(WEEKS_PER_MONTH) };
  }
  return null;
}

/**
 * Estructura de líderes que cabe en una organización. En cada línea cuenta como
 * máximo la MVR del rango de arriba, así que el líder más alto que cabe en una
 * línea es el que tiene un QDV ≤ esa MVR (p. ej., bajo un 1★ Presidencial,
 * 3★ Ejecutivos). Se colocan tantos como quepan, el resto con rangos menores
 * hasta 1★ Director, y dentro de cada líder se repite lo mismo para la
 * generación siguiente, hasta las generaciones que paga tu rango.
 */
function planLeaders(people: number, parent: RankId, maxGen: number, gen1Limit: number | null, get: (r: RankRule) => Leader | null) {
  const out: { gen: number; leader: Leader; count: number }[] = [];
  const fill = (avail: number, top: RankId, gen: number, mult: number) => {
    const cap = rankById[top].mvr;
    if (gen > maxGen || cap == null) return;
    let rest = avail, allow = gen === 1 && gen1Limit != null ? gen1Limit : Infinity;
    const fits = PLAN.ranks.filter((r) => atLeast(r.id, PLAN.mentorGenerationMinRank) && r.qdv! <= cap).reverse();
    for (const r of fits) {
      const L = get(r);
      if (!L) continue;
      const fit = Math.floor(rest / (L.size + 1));
      const n = Math.min(fit, allow);
      if (!n) continue;
      out.push({ gen, leader: L, count: n * mult });
      fill(L.size, L.rank, gen + 1, n * mult);
      rest -= n * (L.size + 1); allow -= n;
    }
  };
  fill(people, parent, 1, 1);
  return { tiers: out };
}

export function simpleCalc(s: SimpleInput): SimpleResult {
  const empty: SimpleResult = { errors: validateSimple(s), rank: null, lines: [], confirmed: ZERO, total: ZERO, rankBonusTotal: ZERO, rankBonusRanks: [], next: null, directors: { max: 0, used: 0, tiers: [] }, assumptions: [], base: null };
  if (empty.errors.length) return empty;

  const products: Product[] = [{ id: "sobre", name: "Sobre X39", qv: s.pvPerSachet, cv: s.pvPerSachet, retailMargin: s.retailPerSachet, preferredMargin: s.preferredPerSachet }];
  const a = DEFAULT_ASSUMPTIONS;
  const team = s.partners - s.directs;
  const active = activeDirects(s), inactive = s.directs - active;
  const customers = s.retailCustomers + s.preferredCustomers;
  const r = simulate({ mode: "rapido", products, assumptions: a, quick: quickOrg(s.ownSachets, s.retailCustomers, s.preferredCustomers, active, inactive, team, s.sachets, s.strongLegPct) });
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
  const leg = ((team + active) * sx * pv) * (100 - s.strongLegPct) / 100;
  const bWeeks = (bi.weekly ?? []).map((w) => w ?? ZERO);
  const bCap = r.paidRank ? rankById[r.paidRank].binaryWeeklyCap : null;
  const bCapped = bi.capsHit.length > 0;
  const bWeekAvg = bWeeks.length ? sum(bWeeks).dividedBy(bWeeks.length) : ZERO;
  lines.push({
    id: "binary", name: "Bono binario", monthly: bi.monthly ?? ZERO, estimated: false, tag: bCapped ? "tope semanal" : undefined,
    how: [
      ...(bWeeks.length && bi.monthly?.gt(0) ? [`Por semana: $${fmt(Number(bWeekAvg.toFixed(2)))}${bCapped ? ` — es el tope semanal de tu rango ($${fmt(bCap!)})` : ""}. Al mes: × 52 semanas / 12 meses = $${fmt(Number(bi.monthly!.toFixed(2)))}.`] : []),`Tu organización repartida ${fmt(s.strongLegPct)}/${fmt(100 - s.strongLegPct)} entre tus piernas: pierna débil ≈ ${fmt(Math.round(leg))} PV al mes (lo que sobra en la pierna fuerte se acumula).`, r.paidRank && rankById[r.paidRank].binaryPct ? `${rankById[r.paidRank].binaryPct} % por tu rango (${rankById[r.paidRank].short}), con tope semanal de $${fmt(rankById[r.paidRank].binaryWeeklyCap!)}.` : "Requiere al menos 1★ Gerente."],
    why: bi.status === "no_elegible" ? bi.reasons[0] : undefined,
  });

  // Mentor Match estimado: líderes (1★ Director o más) que caben en tus líneas,
  // de todos los rangos y en todas las generaciones que paga tu rango.
  const gens = r.paidRank ? rankById[r.paidRank].mentorGens : [];
  const key = [s.sachets, s.pvPerSachet, s.directs, s.strongLegPct].join("|");
  const get = (rk: RankRule) => {
    const k = `${key}|${rk.id}`;
    if (!LEADERS.has(k)) { if (LEADERS.size > 500) LEADERS.clear(); LEADERS.set(k, leaderModel(s, products, rk)); }
    return LEADERS.get(k)!;
  };
  const available = team + active;
  const parent: RankId = gens.length ? r.paidRank! : PLAN.mentorGenerationMinRank;
  const full = planLeaders(available, parent, Math.max(1, gens.length), null, get);
  const lp = s.directors == null ? full : planLeaders(available, parent, Math.max(1, gens.length), s.directors, get);
  const maxDirectors = full.tiers.filter((x) => x.gen === 1).reduce((a, x) => a + x.count, 0);
  const usedDirectors = lp.tiers.filter((x) => x.gen === 1).reduce((a, x) => a + x.count, 0);
  const cap = gens.length ? d(rankById[r.paidRank!].mentorCapPerBp!) : ZERO;
  // Agrupado por generación y rango (mismo rango = mismo líder modelo).
  const byKey = new Map<string, LeaderTier>();
  if (gens.length) for (const x of lp.tiers) {
    const k = `${x.gen}|${x.leader.rank}`, prev = byKey.get(k);
    if (prev) { prev.count += x.count; continue; }
    const each = pct(x.leader.levelWeekly.plus(x.leader.binaryWeekly), gens[x.gen - 1]);
    byKey.set(k, { gen: x.gen, rank: x.leader.rank, count: x.count, size: x.leader.size, levelWeekly: x.leader.levelWeekly, binaryWeekly: x.leader.binaryWeekly, paidWeekly: each.gt(cap) ? cap : each });
  }
  const tiers = [...byKey.values()].sort((x, y) => x.gen - y.gen || rankIndex(y.rank) - rankIndex(x.rank));
  const mentorWeekly = sum(tiers.map((x) => x.paidWeekly.times(x.count)));
  const mHow: string[] = [];
  if (gens.length) {
    if (!tiers.length) mHow.push("Con estos datos nadie en tu organización llega a 1★ Director.");
    else {
      mHow.push(`Líderes en tu Gen 1: ${fmt(usedDirectors)}${s.directors == null ? " (propuesta automática: los que caben)" : ""}; caben ${fmt(maxDirectors)}.`);
      if (s.directors != null && s.directors > maxDirectors) mHow.push(`Pusiste ${fmt(s.directors)}, pero solo caben ${fmt(maxDirectors)}: se usan ${fmt(maxDirectors)}.`);
      for (const x of tiers) mHow.push(`Gen ${x.gen} · ${fmt(x.count)} × ${rankById[x.rank].short}: Nivel ≈ $${x.levelWeekly.toFixed(2)} + Binario ≈ $${x.binaryWeekly.toFixed(2)} por semana → ${gens[x.gen - 1]} % ≈ $${x.paidWeekly.toFixed(2)}/semana cada uno${x.paidWeekly.eq(cap) ? " (tope por socio)" : ""}.`);
      mHow.push(`Cada línea cuenta como máximo la MVR del rango de arriba, así que bajo cada líder cabe, como mucho, el rango siguiente hacia abajo. Supone que cada líder tiene lo mínimo para calificar, tus hábitos de compra, tu número de directos (al menos 4) y el PV de su rango.`);
    }
  }
  const mentorMonthly = cents(mentorWeekly.times(WEEKS_PER_MONTH));
  lines.push({
    id: "mentor", name: "Mentor Match", monthly: mentorMonthly, estimated: true,
    how: gens.length ? mHow : [],
    why: !gens.length ? `Empieza en 1★ Director.${maxDirectors ? ` En tus líneas caben ${fmt(maxDirectors)} líder(es) 1★ Director cuando llegues.` : ""}` : undefined,
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
    errors: [], rank: r.paidRank, lines, confirmed, total, directors: { max: maxDirectors, used: usedDirectors, tiers },
    rankBonusTotal: d(reached.reduce((x, y) => x + (y.rankBonus ?? 0), 0)), rankBonusRanks: reached.map((x) => `${x.short} $${fmt(x.rankBonus!)}`),
    next: nextEval ? { rank: nextEval.rank, gaps: nextEval.checks.filter((c) => !c.ok).map((c) => gapText(c.key, c.gap)) } : null,
    assumptions: [
      `Cada sobre suma ${fmt(pv)} PV (los porcentajes se calculan sobre ese mismo volumen) y deja $${fmt(s.retailPerSachet)} si lo compra un cliente minorista o $${fmt(s.preferredPerSachet)} si lo compra un cliente preferente.`,
      `${fmt(s.activeDirectsPct)} % de tus directos activos (${fmt(active)} de ${fmt(s.directs)}): los inactivos cuentan como socios pero no compran ni suman volumen. El resto de tu organización compra cada mes.`,
      `Binario: ${fmt(s.strongLegPct)} % de tu volumen en la pierna fuerte y ${fmt(100 - s.strongLegPct)} % en la débil; tus líneas de patrocinio, repartidas por igual entre tus directos.`,
      "Cálculo mensual.",
      "Binario: % de la pierna débil acumulada, con tope semanal. Mentor Match: % × (Nivel + Binario) semanal de los líderes (1★ Director o más) de tus generaciones; es estimado porque supone cuántos hay y de qué rango (propuesta automática: los que caben con tu volumen) y cuánto gana cada uno.",
      "Reglas: tabla oficial «Plan de Compensación LifeWave 10-10-20 (EE. UU.)».",
    ],
    base: r,
  };
}

export type Period = "mes" | "semana";
/** Formas de ganar que el plan paga cada semana; las demás se generan por compra. */
const WEEKLY_NATIVE = new Set<SimpleLine["id"]>(["personal-team", "binary", "mentor"]);

/**
 * Importes de la calculadora en el periodo elegido. Por semana: importe
 * mensual × 12 / 52 (cada importe redondeado a centavos; los totales son la
 * suma de lo mostrado). Lo que no se paga por semana se marca como promedio.
 */
export function inPeriod(r: SimpleResult, period: Period) {
  const conv = (m: D) => (period === "mes" ? m : cents(m.dividedBy(WEEKS_PER_MONTH)));
  const lines = r.lines.map((l) => ({ id: l.id, amount: conv(l.monthly), average: period === "semana" && !WEEKLY_NATIVE.has(l.id) }));
  const total = period === "mes" ? r.total : sum(lines.map((x) => x.amount));
  const confirmed = period === "mes" ? r.confirmed : sum(lines.filter((x) => !r.lines.find((l) => l.id === x.id)!.estimated).map((x) => x.amount));
  return { lines, total, confirmed };
}
