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
  /** Socios (Brand Partners) en toda tu organización, incluidos tus directos (recuento total del back office). */
  partners: number;
  /** % de tu organización (sin contar a tus directos) que compra cada mes. */
  orgActivePct: number;
  /** Cuántos de ellos inscribiste tú. */
  directs: number;
  /** Clientes minoristas (retail) tuyos. */
  retailCustomers: number;
  /** Clientes preferentes tuyos. */
  preferredCustomers: number;
  /** Cuántos de tus directos compran cada mes. */
  activeDirects: number;
  /** Cuántos de tus directos activos están construyendo (tienen equipo debajo). */
  buildingDirects: number;
  /** Clientes de los socios de toda tu organización (no los tuyos). */
  orgCustomers: number;
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
  /** Líderes (1★ Director o más) por generación, de la Gen 1 a la 6, para el Mentor Match. null = propuesta automática. */
  genLeaders: (number | null)[];
  /** % del volumen en la pierna fuerte del binario (60 = reparto 60/40). */
  strongLegPct: number;
}

export const DEFAULT_SIMPLE: SimpleInput = {
  partners: 150, orgActivePct: 100, directs: 10, activeDirects: 10, buildingDirects: 10, orgCustomers: 0, retailCustomers: 0, preferredCustomers: 10,
  sachets: 1, ownSachets: 1, pvPerSachet: 77, retailPerSachet: 50, preferredPerSachet: 20, genLeaders: [null, null, null, null, null, null], strongLegPct: 60,
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

export interface GenInfo {
  gen: number;
  /** % que paga esta generación (con tu rango, o con el rango que la abre). */
  pct: number;
  unlocked: boolean;
  /** Primer rango que cobra esta generación. */
  unlockRank: RankId;
  /** Cuántos líderes caben (dados los de las generaciones de arriba) y cuántos se usan. */
  max: number;
  used: number;
  auto: boolean;
  picks: { rank: RankId; count: number }[];
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
  /** Líderes del Mentor Match: las 6 generaciones (abiertas o no según tu rango) y el detalle por rango. */
  leaders: { gens: GenInfo[]; tiers: LeaderTier[] };
  assumptions: string[];
  base: SimulationResult | null;
}

const fmt = (n: number) => n.toLocaleString("es-419");

export function validateSimple(s: SimpleInput): string[] {
  const e: string[] = [];
  for (const [v, w] of [[s.partners, "Socios"], [s.directs, "Directos"], [s.activeDirects, "Directos activos"], [s.buildingDirects, "Directos construyendo"], [s.orgCustomers, "Clientes de tu organización"], [s.retailCustomers, "Clientes minoristas"], [s.preferredCustomers, "Clientes preferentes"]] as const) if (!Number.isInteger(v) || v < 0) e.push(`${w}: escribe un número entero de 0 o más.`);
  for (const [v, w] of [[s.sachets, "Sobres por persona"], [s.ownSachets, "Tus sobres"], [s.pvPerSachet, "PV por sobre"], [s.retailPerSachet, "Ganancia por sobre (minorista)"], [s.preferredPerSachet, "Ganancia por sobre (preferente)"]] as const) if (!(v >= 0) || !Number.isFinite(v)) e.push(`${w}: escribe un número de 0 o más.`);
  (s.genLeaders ?? []).forEach((v, i) => { if (v != null && (!Number.isInteger(v) || v < 0)) e.push(`Líderes de la Gen ${i + 1}: escribe un número entero de 0 o más.`); });
  if (!(s.strongLegPct >= 50 && s.strongLegPct <= 100)) e.push("Pierna fuerte del binario: escribe un % entre 50 y 100.");
  if (!(s.orgActivePct >= 0 && s.orgActivePct <= 100)) e.push("Actividad de tu organización: escribe un % entre 0 y 100.");
  if (orgShape(s).activeTeam > 0 && Math.min(s.buildingDirects, s.activeDirects) === 0) e.push("Tienes socios activos debajo de tus directos: indica cuántos de tus directos activos están construyendo (al menos 1).");
  if (s.directs > s.partners) e.push("Los directos forman parte de tus socios: no pueden ser más que el total de socios.");
  if (s.partners > s.directs && s.directs === 0) e.push("Para tener socios en tu organización necesitas al menos un directo.");
  return e;
}

/** Cómo queda tu organización: activos, inactivos y media de clientes por socio activo. */
export function orgShape(s: SimpleInput) {
  const team = Math.max(0, s.partners - s.directs);
  const activeTeam = Math.round((team * s.orgActivePct) / 100);
  const active = Math.min(s.activeDirects, s.directs);
  const building = Math.min(s.buildingDirects, active);
  const activeSocios = activeTeam + active;
  // Los clientes del recuento también pueden estar inactivos: se aplica el mismo % de actividad.
  const activeCustomers = Math.round((s.orgCustomers * s.orgActivePct) / 100);
  return { team, activeTeam, inactiveTeam: team - activeTeam, active, inactive: s.directs - active, building, activeSocios, activeCustomers,
    customersPerSocio: activeSocios ? activeCustomers / activeSocios : 0 };
}

/**
 * Organización del modo rápido: tus directos que construyen encabezan las
 * líneas con equipo; los demás directos activos son líneas de una persona.
 * Los clientes de tu organización compran como los socios y su volumen va con
 * el de sus socios (proporcional en cada línea y pierna).
 */
const quickOrg = (o: { own: number; retailC?: number; preferredC?: number; active: number; inactive?: number; building: number; activeTeam: number; inactiveTeam?: number; orgCustomers?: number; sachets: number; strongPct: number }): QuickOrg => ({
  personal: o.own > 0 ? [{ productId: "sobre", qty: o.own }] : [],
  customers: [
    ...((o.retailC ?? 0) > 0 ? [{ count: o.retailC!, productId: "sobre", qty: o.sachets, kind: "cliente" as const }] : []),
    ...((o.preferredC ?? 0) > 0 ? [{ count: o.preferredC!, productId: "sobre", qty: o.sachets, kind: "cliente_preferente" as const }] : []),
  ],
  sponsored: o.active > 0 ? [{ count: o.active, productId: "sobre", qty: o.sachets }] : [],
  sponsoredInactive: o.inactive ?? 0,
  team: o.activeTeam + (o.orgCustomers ?? 0) > 0 ? [{ count: o.activeTeam + (o.orgCustomers ?? 0), productId: "sobre", qty: o.sachets }] : [],
  teamInactive: o.inactiveTeam ?? 0,
  distribution: {
    lines: o.active, largestPct: 0, secondPct: 0, leftPct: o.strongPct,
    groups: [
      { label: o.building === 1 ? "Línea de tu directo que construye" : `Líneas de tus ${o.building} directos que construyen (cada una)`, count: o.building, weight: 1 + o.activeTeam / Math.max(1, o.building) },
      { label: "Directos activos sin equipo (cada uno)", count: o.active - o.building, weight: 1 },
    ],
  },
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
function leaderModel(s: SimpleInput, products: Product[], rank: RankRule, cps: number): Leader | null {
  const unitPv = s.sachets * s.pvPerSachet;
  if (!(unitPv > 0) || rank.qdv == null) return null;
  // Para los rangos de 200 PV solo cuentan 110 personales: el resto, con clientes.
  const ownPv = Math.min(rank.pv, PLAN.personalPvCapForPv200);
  const own = Math.max(s.sachets, Math.ceil(ownPv / (s.pvPerSachet || 1)));
  const counted = Math.min(own * s.pvPerSachet, rank.pv === 200 ? PLAN.personalPvCapForPv200 : Infinity);
  const clients = Math.max(0, Math.ceil((rank.pv - counted) / unitPv));
  let size = Math.ceil(rank.qdv / (unitPv * (1 + cps)));
  for (let i = 0; i < 200; i++, size += Math.max(1, Math.ceil(size * 0.02))) {
    const dd = Math.max(4, Math.min(s.directs, size));
    if (dd > size) continue;
    const dr = simulate({ mode: "rapido", products, assumptions: DEFAULT_ASSUMPTIONS, quick: quickOrg({ own, preferredC: clients, active: dd, building: dd, activeTeam: size - dd, orgCustomers: Math.round(cps * size), sachets: s.sachets, strongPct: s.strongLegPct }) });
    if (!dr.ok || !atLeast(dr.paidRank, rank.id)) continue;
    const m = (id: string) => dr.components.find((c) => c.id === id)!.monthly ?? ZERO;
    return { rank: dr.paidRank!, size, levelWeekly: m("personal-team").dividedBy(WEEKS_PER_MONTH), binaryWeekly: m("binary").dividedBy(WEEKS_PER_MONTH) };
  }
  return null;
}

type LeaderNode = { leader: Leader; n: number; children: LeaderNode[] };

/**
 * Estructura de líderes que cabe en una organización. En cada línea cuenta como
 * máximo la MVR del rango de arriba, así que el líder más alto que cabe en una
 * línea es el que tiene un QDV ≤ esa MVR (p. ej., bajo un 1★ Presidencial,
 * 3★ Ejecutivos). Se colocan tantos como quepan, el resto con rangos menores
 * hasta 1★ Director, y dentro de cada líder se repite lo mismo para la
 * generación siguiente. Devuelve el árbol (hijos por cada líder).
 */
function leaderTree(people: number, parent: RankId, maxGen: number, get: (r: RankRule) => Leader | null): LeaderNode[] {
  const memo = new Map<string, LeaderNode[]>();
  const fill = (avail: number, top: RankId, gen: number): LeaderNode[] => {
    const cap = rankById[top].mvr;
    if (gen > maxGen || cap == null) return [];
    const k = `${avail}|${top}|${gen}`;
    if (memo.has(k)) return memo.get(k)!;
    const out: LeaderNode[] = [];
    let rest = avail;
    for (const r of PLAN.ranks.filter((x) => atLeast(x.id, PLAN.mentorGenerationMinRank) && x.qdv! <= cap).reverse()) {
      const L = get(r);
      if (!L) continue;
      const n = Math.floor(rest / (L.size + 1));
      if (!n) continue;
      out.push({ leader: L, n, children: fill(L.size, L.rank, gen + 1) });
      rest -= n * (L.size + 1);
    }
    memo.set(k, out);
    return out;
  };
  return fill(people, parent, 1);
}

/**
 * Reparte los líderes generación a generación con los límites elegidos. Se
 * quedan primero los de rango más alto; los de la generación siguiente solo
 * existen debajo de los líderes elegidos arriba.
 */
function allocateLeaders(roots: LeaderNode[], limits: (number | null)[], maxGen: number) {
  const out: { max: number; used: number; picks: { leader: Leader; count: number }[] }[] = [];
  let level = roots.map((node) => ({ node, avail: node.n }));
  for (let g = 0; g < maxGen; g++) {
    const sorted = [...level].sort((x, y) => rankIndex(y.node.leader.rank) - rankIndex(x.node.leader.rank));
    const max = sorted.reduce((a, c) => a + c.avail, 0);
    let left = Math.min(limits[g] ?? max, max);
    const picks = new Map<RankId, { leader: Leader; count: number }>();
    const next: typeof level = [];
    for (const c of sorted) {
      const k = Math.min(c.avail, left);
      if (!k) continue;
      left -= k;
      const p = picks.get(c.node.leader.rank);
      if (p) p.count += k; else picks.set(c.node.leader.rank, { leader: c.node.leader, count: k });
      for (const ch of c.node.children) next.push({ node: ch, avail: ch.n * k });
    }
    out.push({ max, used: [...picks.values()].reduce((a, x) => a + x.count, 0), picks: [...picks.values()] });
    level = next;
  }
  return out;
}

/** Primer rango que cobra la generación g (1–6). */
const unlockRankOf = (g: number) => PLAN.ranks.find((r) => r.mentorGens.length >= g)!;

export function simpleCalc(s: SimpleInput): SimpleResult {
  const empty: SimpleResult = { errors: validateSimple(s), rank: null, lines: [], confirmed: ZERO, total: ZERO, rankBonusTotal: ZERO, rankBonusRanks: [], next: null, leaders: { gens: [], tiers: [] }, assumptions: [], base: null };
  if (empty.errors.length) return empty;

  const products: Product[] = [{ id: "sobre", name: "Sobre X39", qv: s.pvPerSachet, cv: s.pvPerSachet, retailMargin: s.retailPerSachet, preferredMargin: s.preferredPerSachet }];
  const a = DEFAULT_ASSUMPTIONS;
  const o = orgShape(s);
  const { active, inactive, activeTeam } = o;
  const customers = s.retailCustomers + s.preferredCustomers;
  const r = simulate({ mode: "rapido", products, assumptions: a, quick: quickOrg({ own: s.ownSachets, retailC: s.retailCustomers, preferredC: s.preferredCustomers, active, inactive, building: o.building, activeTeam, inactiveTeam: o.inactiveTeam, orgCustomers: o.activeCustomers, sachets: s.sachets, strongPct: s.strongLegPct }) });
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
    how: [`${fmt(active)} directos activos (de ${fmt(s.directs)}) × ${fmt(sx)} sobre(s) × ${fmt(pv)} PV = ${fmt(active * sx * pv)} PV${inactive ? ` (${fmt(inactive)} inactivos no suman)` : ""}`, `10 % de ese volumen al mes (Bono de Nivel Comprimido, desde 1★ Gerente).`],
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
  const leg = ((activeTeam + active + o.activeCustomers) * sx * pv) * (100 - s.strongLegPct) / 100;
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
  const m = Math.round(o.customersPerSocio * 100) / 100;
  const key = [s.sachets, s.pvPerSachet, s.directs, s.strongLegPct, m].join("|");
  const get = (rk: RankRule) => {
    const k = `${key}|${rk.id}`;
    if (!LEADERS.has(k)) { if (LEADERS.size > 500) LEADERS.clear(); LEADERS.set(k, leaderModel(s, products, rk, m)); }
    return LEADERS.get(k)!;
  };
  const available = o.activeSocios;
  const parent: RankId = gens.length ? r.paidRank! : PLAN.mentorGenerationMinRank;
  const openGens = Math.max(1, gens.length);
  const limits = s.genLeaders ?? [];
  const alloc = allocateLeaders(leaderTree(available, parent, openGens, get), gens.length ? limits : [], openGens);
  const cap = gens.length ? d(rankById[r.paidRank!].mentorCapPerBp!) : ZERO;
  const tiers: LeaderTier[] = gens.length ? alloc.flatMap((g, i) => g.picks.map((x) => {
    const each = pct(x.leader.levelWeekly.plus(x.leader.binaryWeekly), gens[i]);
    return { gen: i + 1, rank: x.leader.rank, count: x.count, size: x.leader.size, levelWeekly: x.leader.levelWeekly, binaryWeekly: x.leader.binaryWeekly, paidWeekly: each.gt(cap) ? cap : each };
  })) : [];
  const genInfo: GenInfo[] = [1, 2, 3, 4, 5, 6].map((g) => {
    const unlockRank = unlockRankOf(g);
    const unlocked = g <= gens.length;
    const a = unlocked ? alloc[g - 1] : null;
    return { gen: g, pct: unlocked ? gens[g - 1] : unlockRank.mentorGens[g - 1], unlocked, unlockRank: unlockRank.id, max: a?.max ?? 0, used: a?.used ?? 0, auto: limits[g - 1] == null,
      picks: a ? a.picks.map((x) => ({ rank: x.leader.rank, count: x.count })) : [] };
  });
  const gen1Max = alloc[0]?.max ?? 0;
  const mentorWeekly = sum(tiers.map((x) => x.paidWeekly.times(x.count)));
  const mHow: string[] = [];
  if (gens.length) {
    if (!tiers.length) mHow.push("Con estos datos nadie en tu organización llega a 1★ Director.");
    else {
      for (const g of genInfo.filter((x) => x.unlocked)) {
        mHow.push(`Gen ${g.gen} (${g.pct} %): ${fmt(g.used)} líder(es)${g.auto ? " (propuesta automática)" : ""}; caben ${fmt(g.max)}.`);
        const asked = limits[g.gen - 1];
        if (asked != null && asked > g.max) mHow.push(`En la Gen ${g.gen} pusiste ${fmt(asked)}, pero solo caben ${fmt(g.max)}: se usan ${fmt(g.max)}.`);
      }
      for (const x of tiers) mHow.push(`Gen ${x.gen} · ${fmt(x.count)} × ${rankById[x.rank].short}: Nivel ≈ $${x.levelWeekly.toFixed(2)} + Binario ≈ $${x.binaryWeekly.toFixed(2)} por semana → ${gens[x.gen - 1]} % ≈ $${x.paidWeekly.toFixed(2)}/semana cada uno${x.paidWeekly.eq(cap) ? " (tope por socio)" : ""}.`);
      mHow.push(`Cada línea cuenta como máximo la MVR del rango de arriba, así que bajo cada líder cabe, como mucho, el rango siguiente hacia abajo; los líderes de una generación están dentro de las organizaciones de la generación de arriba. Supone que cada líder tiene lo mínimo para calificar, tus hábitos de compra, tu número de directos (al menos 4) y el PV de su rango.`);
    }
  }
  const mentorMonthly = cents(mentorWeekly.times(WEEKS_PER_MONTH));
  lines.push({
    id: "mentor", name: "Mentor Match", monthly: mentorMonthly, estimated: true,
    how: gens.length ? mHow : [],
    why: !gens.length ? `Empieza en 1★ Director.${gen1Max ? ` En tus líneas caben ${fmt(gen1Max)} líder(es) 1★ Director cuando llegues.` : ""}` : undefined,
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
    errors: [], rank: r.paidRank, lines, confirmed, total, leaders: { gens: genInfo, tiers },
    rankBonusTotal: d(reached.reduce((x, y) => x + (y.rankBonus ?? 0), 0)), rankBonusRanks: reached.map((x) => `${x.short} $${fmt(x.rankBonus!)}`),
    next: nextEval ? { rank: nextEval.rank, gaps: nextEval.checks.filter((c) => !c.ok).map((c) => gapText(c.key, c.gap)) } : null,
    assumptions: [
      `Cada sobre suma ${fmt(pv)} PV (los porcentajes se calculan sobre ese mismo volumen) y deja $${fmt(s.retailPerSachet)} si lo compra un cliente minorista o $${fmt(s.preferredPerSachet)} si lo compra un cliente preferente.`,
      `Organización: ${fmt(s.orgActivePct)} % activa (${fmt(activeTeam)} de ${fmt(o.team)} socios, sin contar a tus directos) y ${fmt(active)} de ${fmt(s.directs)} directos activos. Los inactivos cuentan como socios pero no compran ni suman volumen.`,
      `Tu equipo está debajo de tus ${fmt(o.building)} directo(s) que construyen, repartido por igual entre ellos; tus otros directos activos son líneas de una sola persona.`,
      `Clientes de tu organización: ${fmt(o.activeCustomers)} activos de ${fmt(s.orgCustomers)} (mismo % de actividad; ≈ ${o.customersPerSocio.toFixed(2)} por socio activo). Compran como los socios y su volumen suma a tus piernas y a tu organización, pero su ganancia y su Bono por Cliente son de sus socios. Los líderes del Mentor Match tienen esa misma media.`,
      `Binario: ${fmt(s.strongLegPct)} % de tu volumen en la pierna fuerte y ${fmt(100 - s.strongLegPct)} % en la débil.`,
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
