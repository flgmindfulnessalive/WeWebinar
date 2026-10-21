// Calculadora simple: 10 datos → formas de ganar y total.
// Traduce los datos a una organización del modo rápido con supuestos fijos y
// declarados, y usa el mismo motor (simulate) para todo lo que calcula.
import { PLAN, rankById, rankIndex } from "../plan/plan-10-10-20";
import type { RankId } from "../plan/types";
import { cents, d, pct, sum, WEEKS_PER_MONTH, ZERO, type D } from "./decimal";
import { DEFAULT_ASSUMPTIONS, type Product, type QuickOrg } from "./model";
import { atLeast } from "./simulate";
import { simulate, type SimulationResult } from "./simulate";
import { texts, type Lang } from "./simple-text";

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
  /** Rango de los líderes de cada generación (Gen 1 a 6). null = automático (según el volumen). */
  genRanks?: (RankId | null)[];
  /** % del volumen en la pierna fuerte del binario (60 = reparto 60/40). */
  strongLegPct: number;
}

export const DEFAULT_SIMPLE: SimpleInput = {
  partners: 150, orgActivePct: 100, directs: 10, activeDirects: 10, buildingDirects: 10, orgCustomers: 0, retailCustomers: 0, preferredCustomers: 10,
  sachets: 1, ownSachets: 1, pvPerSachet: 77, retailPerSachet: 50, preferredPerSachet: 20, genLeaders: [null, null, null, null, null, null], genRanks: [null, null, null, null, null, null], strongLegPct: 60,
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
  /** Rango elegido para esta generación (null = automático). */
  rankChoice: RankId | null;
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
  leaders: { gens: GenInfo[]; tiers: LeaderTier[]; warning?: string };
  assumptions: string[];
  base: SimulationResult | null;
}

const money2 = (x: D) => Number(x.toFixed(2)).toLocaleString("en-US");

export function validateSimple(s: SimpleInput, lang: Lang = "es"): string[] {
  const T = texts(lang), F = T.fields;
  const e: string[] = [];
  for (const [v, w] of [[s.partners, F.partners], [s.directs, F.directs], [s.activeDirects, F.active], [s.buildingDirects, F.building], [s.orgCustomers, F.orgCust], [s.retailCustomers, F.retail], [s.preferredCustomers, F.preferred]] as const) if (!Number.isInteger(v) || v < 0) e.push(T.errInt(w));
  for (const [v, w] of [[s.sachets, F.sachets], [s.ownSachets, F.own], [s.pvPerSachet, F.pv], [s.retailPerSachet, F.retailP], [s.preferredPerSachet, F.prefP]] as const) if (!(v >= 0) || !Number.isFinite(v)) e.push(T.errNum(w));
  (s.genLeaders ?? []).forEach((v, i) => { if (v != null && (!Number.isInteger(v) || v < 0)) e.push(T.errGen(i + 1)); });
  (s.genRanks ?? []).forEach((v, i) => { if (v != null && !(v in rankById && atLeast(v, PLAN.mentorGenerationMinRank))) e.push(T.errGen(i + 1)); });
  if (!(s.strongLegPct >= 50 && s.strongLegPct <= 100)) e.push(T.errLeg);
  if (!(s.orgActivePct >= 0 && s.orgActivePct <= 100)) e.push(T.errAct);
  if (orgShape(s).activeTeam > 0 && Math.min(s.buildingDirects, s.activeDirects) === 0) e.push(T.errBuild);
  if (s.directs > s.partners) e.push(T.errDirects);
  if (s.partners > s.directs && s.directs === 0) e.push(T.errNoDirect);
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

/** Líneas de tamaños distintos agrupadas por tamaño (socios debajo de cada constructor). */
function lineGroups(sizes: number[]) {
  const by = new Map<number, number>();
  for (const x of sizes) by.set(x, (by.get(x) ?? 0) + 1);
  return [...by].sort((a, b) => b[0] - a[0]).map(([size, count]) => ({ label: `Líneas de ${size} socios (cada una)`, count, weight: 1 + size }));
}

/**
 * Organización del modo rápido: tus directos que construyen encabezan las
 * líneas con equipo; los demás directos activos son líneas de una persona.
 * Los clientes de tu organización compran como los socios y su volumen va con
 * el de sus socios (proporcional en cada línea y pierna).
 */
const quickOrg = (o: { own: number; retailC?: number; preferredC?: number; active: number; inactive?: number; building: number; activeTeam: number; inactiveTeam?: number; orgCustomers?: number; sachets: number; strongPct: number; lineSizes?: number[] }): QuickOrg => ({
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
      ...(o.lineSizes ? lineGroups(o.lineSizes) : [{ label: o.building === 1 ? "Línea de tu directo que construye" : `Líneas de tus ${o.building} directos que construyen (cada una)`, count: o.building, weight: 1 + o.activeTeam / Math.max(1, o.building) }]),
      { label: "Directos activos sin equipo (cada uno)", count: o.active - o.building, weight: 1 },
    ],
  },
  enrollments: [],
});

type Leader = { rank: RankId; size: number; levelWeekly: D; binaryWeekly: D };
/** Los líderes solo dependen del tamaño de su organización y de los hábitos: se guardan. */
const LEADERS = new Map<string, Leader | null>();

/**
 * Rango y ganancias semanales (Nivel + Binario) de un socio con `size` socios
 * activos debajo, armado como tú: `lines` líneas iguales que construyen, tus
 * hábitos de compra, tu media de clientes y tu reparto del binario, llegando al
 * PV del rango (para los de 200 PV solo cuentan 110 personales: el resto, con
 * clientes). Devuelve el rango más alto con el que el motor lo califica, desde
 * 1★ Director; si no llega, null.
 */
function leaderAt(s: SimpleInput, products: Product[], size: number, lines: number, cps: number): Leader | null {
  const unitPv = s.sachets * s.pvPerSachet;
  if (!(unitPv > 0) || size < lines) return null;
  const vol = size * unitPv * (1 + cps);
  for (const rank of [...PLAN.ranks].reverse()) {
    if (!atLeast(rank.id, PLAN.mentorGenerationMinRank)) break;
    if (rank.qdv! > vol) continue;
    const ownPv = Math.min(rank.pv, PLAN.personalPvCapForPv200);
    const own = Math.max(s.sachets, Math.ceil(ownPv / (s.pvPerSachet || 1)));
    const counted = Math.min(own * s.pvPerSachet, rank.pv === 200 ? PLAN.personalPvCapForPv200 : Infinity);
    const clients = Math.max(0, Math.ceil((rank.pv - counted) / unitPv));
    const dr = simulate({ mode: "rapido", products, assumptions: DEFAULT_ASSUMPTIONS, quick: quickOrg({ own, preferredC: clients, active: lines, building: lines, activeTeam: size - lines, orgCustomers: Math.round(cps * size), sachets: s.sachets, strongPct: s.strongLegPct }) });
    if (!dr.ok || !atLeast(dr.paidRank, rank.id)) continue;
    const m = (id: string) => dr.components.find((c) => c.id === id)!.monthly ?? ZERO;
    return { rank: dr.paidRank!, size, levelWeekly: m("personal-team").dividedBy(WEEKS_PER_MONTH), binaryWeekly: m("binary").dividedBy(WEEKS_PER_MONTH) };
  }
  return null;
}

/**
 * Organización mínima de un líder del rango elegido (armado como tú): busca el
 * menor número de socios con el que el motor lo califica. Lo que gana es una
 * estimación prudente: un líder real de ese rango puede tener más.
 */
function leaderMin(s: SimpleInput, products: Product[], rank: RankId, lines: number, cps: number): Leader | null {
  const unitPv = s.sachets * s.pvPerSachet, r = rankById[rank];
  if (!(unitPv > 0) || r.qdv == null) return null;
  let size = Math.max(lines, Math.ceil(r.qdv / (unitPv * (1 + cps))));
  for (let i = 0; i < 300; i++, size += Math.max(1, Math.ceil(size * 0.02))) {
    const L = leaderAt(s, products, size, lines, cps);
    if (L && atLeast(L.rank, rank)) return { ...L, rank };
  }
  return null;
}

/** Primer rango que cobra la generación g (1–6). */
const unlockRankOf = (g: number) => PLAN.ranks.find((r) => r.mentorGens.length >= g)!;

export function simpleCalc(s: SimpleInput, lang: Lang = "es"): SimpleResult {
  const T = texts(lang);
  const empty: SimpleResult = { errors: validateSimple(s, lang), rank: null, lines: [], confirmed: ZERO, total: ZERO, rankBonusTotal: ZERO, rankBonusRanks: [], next: null, leaders: { gens: [], tiers: [] }, assumptions: [], base: null };
  if (empty.errors.length) return empty;

  const products: Product[] = [{ id: "sobre", name: "Sobre X39", qv: s.pvPerSachet, cv: s.pvPerSachet, retailMargin: s.retailPerSachet, preferredMargin: s.preferredPerSachet }];
  const a = DEFAULT_ASSUMPTIONS;
  const o = orgShape(s);
  const { active, inactive, activeTeam } = o;
  const customers = s.retailCustomers + s.preferredCustomers;
  const you = (lineSizes?: number[]) => simulate({ mode: "rapido", products, assumptions: a, quick: quickOrg({ own: s.ownSachets, retailC: s.retailCustomers, preferredC: s.preferredCustomers, active, inactive, building: o.building, activeTeam, inactiveTeam: o.inactiveTeam, orgCustomers: o.activeCustomers, sachets: s.sachets, strongPct: s.strongLegPct, lineSizes }) });

  // Líderes del Mentor Match. Cada línea de patrocinio empieza en tu directo que
  // construye y baja sin fin; en cada generación aporta como máximo un líder:
  // el siguiente 1★ Director o más al bajar (compresión dinámica: se salta a
  // quien no es Director). Con un rango elegido por ti, ese líder puede ser de
  // cualquier rango, incluso mayor que el tuyo o que el de arriba, y la búsqueda
  // sigue debajo de él. En cada generación solo siguen las líneas elegidas en la
  // de arriba.
  const m = Math.round(o.customersPerSocio * 100) / 100;
  const leaderLines = Math.max(3, o.building);
  const key = [s.sachets, s.pvPerSachet, s.strongLegPct, m, leaderLines].join("|");
  const at = (size: number) => {
    const k = `${key}|${size}`;
    if (!LEADERS.has(k)) { if (LEADERS.size > 2000) LEADERS.clear(); LEADERS.set(k, leaderAt(s, products, size, leaderLines, m)); }
    return LEADERS.get(k)!;
  };
  const minAt = (rk: RankId) => {
    const k = `${key}|min|${rk}`;
    if (!LEADERS.has(k)) LEADERS.set(k, leaderMin(s, products, rk, leaderLines, m));
    return LEADERS.get(k)!;
  };
  const plan = (rank: RankId | null, sizes: number[]) => {
    const gens = rank ? rankById[rank].mentorGens : [];
    const openGens = Math.max(1, gens.length);
    const limits = gens.length ? s.genLeaders ?? [] : [];
    const chosen = gens.length ? s.genRanks ?? [] : [];
    const head = sizes.slice(), need = sizes.map(() => 0);
    let alive = sizes.map((_, i) => i);
    const alloc: { max: number; used: number; picks: { leader: Leader; count: number }[] }[] = [];
    for (let g = 0; g < openGens; g++) {
      const pick = chosen[g] ?? null;
      const cand = alive.map((i) => ({ i, L: pick ? minAt(pick) : head[i] >= leaderLines ? at(head[i]) : null }))
        .filter((c): c is { i: number; L: Leader } => !!c.L)
        .sort((x, y) => rankIndex(y.L.rank) - rankIndex(x.L.rank) || x.i - y.i);
      const max = cand.length, used = Math.min(limits[g] ?? max, max);
      const take = cand.slice(0, used), picks = new Map<RankId, { leader: Leader; count: number }>();
      for (const c of take) {
        const p = picks.get(c.L.rank);
        if (p) p.count++; else picks.set(c.L.rank, { leader: c.L, count: 1 });
        // En la Gen 1 el líder automático es tu propio constructor (su organización es la línea); más abajo, el líder va dentro de ella.
        need[c.i] = Math.max(need[c.i], c.L.size + (g === 0 && !pick ? 0 : 1));
        head[c.i] = Math.floor(c.L.size / leaderLines) - 1;
      }
      alloc.push({ max, used, picks: [...picks.values()] });
      alive = take.map((c) => c.i);
    }
    return { gens, openGens, limits, chosen, alloc, need };
  };
  // Primero, tus líneas iguales. Si eliges líderes que no caben en una línea
  // igual, esa línea crece y las demás se reparten el resto: tu rango se
  // recalcula con líneas desiguales (en cada línea solo te cuenta hasta la MVR).
  const equal = Array.from({ length: o.building }, () => Math.floor(activeTeam / o.building));
  let r = you();
  if (!r.ok) return { ...empty, errors: [...r.errors, ...r.missing] };
  let P = plan(r.paidRank, equal);
  let warning: string | undefined, rankNote: string | undefined;
  if ((s.genRanks ?? []).some((x) => x) && o.building) {
    const big = equal.map((x, i) => Math.max(x, P.need[i]));
    const bigIdx = big.map((x, i) => (x > equal[i] ? i : -1)).filter((i) => i >= 0);
    const others = o.building - bigIdx.length;
    const rest = activeTeam - bigIdx.reduce((t, i) => t + big[i], 0);
    if (bigIdx.length && (others ? rest >= others : rest >= 0)) {
      const sizes = big.map((x, i) => (bigIdx.includes(i) ? x : Math.floor(rest / others) + (i === big.findIndex((_, j) => !bigIdx.includes(j)) ? rest % others : 0)));
      if (!others) sizes[0] += rest;
      const r2 = you(sizes);
      if (r2.ok) {
        if (r.paidRank && (!r2.paidRank || rankIndex(r2.paidRank) < rankIndex(r.paidRank))) rankNote = T.mentorRankDrop(r.paidRank, r2.paidRank, sizes[bigIdx[0]], sizes.filter((_, i) => !bigIdx.includes(i)));
        r = r2; P = plan(r.paidRank, sizes);
        const lost = (s.genRanks ?? []).map((x, i) => (x && i >= P.gens.length ? i + 1 : 0)).filter(Boolean);
        if (lost.length) rankNote = `${rankNote ?? ""} ${T.mentorLocked(lost, r.paidRank)}`.trim();
      }
    }
    const need = P.need.reduce((t, x) => t + x, 0);
    if (need > activeTeam + o.building) warning = T.mentorVolWarn(need, activeTeam + o.building);
  }
  const comp = (id: string) => r.components.find((c) => c.id === id)!;
  const pv = s.pvPerSachet, sx = s.sachets;
  const lines: SimpleLine[] = [];

  const rt = comp("retail");
  lines.push({
    id: "retail", name: T.retailName, monthly: rt.monthly ?? ZERO, estimated: false,
    how: [T.retailHow(s.retailCustomers, sx, s.retailPerSachet), T.prefHow(s.preferredCustomers, sx, s.preferredPerSachet)],
    why: rt.status === "no_elegible" ? T.retailWhy : undefined,
  });

  const pt = comp("personal-team");
  lines.push({
    id: "personal-team", name: T.levelName, monthly: pt.monthly ?? ZERO, estimated: false,
    how: T.levelHow(active, s.directs, sx, pv, inactive),
    why: pt.status === "no_elegible" ? (atLeast(r.paidRank, "m1") ? T.levelWhyNone : T.levelWhyRank) : undefined,
  });

  const cu = comp("customer");
  const cqv = customers * sx * pv;
  const tier = [...PLAN.customerBonusTiers].reverse().find((t) => cqv >= t.minQv);
  lines.push({
    id: "customer", name: T.custName, monthly: cu.monthly ?? ZERO, estimated: false,
    how: T.custHow(customers, sx, pv, tier ? tier.pct : null),
    why: cu.status === "no_elegible" ? T.custWhy(cqv > 0 ? Math.ceil(PLAN.customerBonusTiers[0].minQv - cqv) : 0) : undefined,
  });

  const bi = comp("binary");
  const leg = ((activeTeam + active + o.activeCustomers) * sx * pv) * (100 - s.strongLegPct) / 100;
  const bWeeks = (bi.weekly ?? []).map((w) => w ?? ZERO);
  const bCap = r.paidRank ? rankById[r.paidRank].binaryWeeklyCap : null;
  const bCapped = bi.capsHit.length > 0;
  const bWeekAvg = bWeeks.length ? sum(bWeeks).dividedBy(bWeeks.length) : ZERO;
  lines.push({
    id: "binary", name: T.binName, monthly: bi.monthly ?? ZERO, estimated: false, tag: bCapped ? T.capTag : undefined,
    how: [
      ...(bWeeks.length && bi.monthly?.gt(0) ? [T.binWeek(money2(bWeekAvg), bCapped, bCap, money2(bi.monthly!))] : []),
      T.binSplit(s.strongLegPct, Math.round(leg)),
      r.paidRank && rankById[r.paidRank].binaryPct ? T.binRate(rankById[r.paidRank].binaryPct!, r.paidRank, rankById[r.paidRank].binaryWeeklyCap!) : T.binNeed],
    why: bi.status === "no_elegible" ? (atLeast(r.paidRank, "m1") ? T.binWhyLeg : T.binWhyRank) : undefined,
  });

  const { gens, limits, chosen, alloc } = P;
  const cap = gens.length ? d(rankById[r.paidRank!].mentorCapPerBp!) : ZERO;
  const tiers: LeaderTier[] = gens.length ? alloc.flatMap((g, i) => g.picks.map((x) => {
    const each = pct(x.leader.levelWeekly.plus(x.leader.binaryWeekly), gens[i]);
    return { gen: i + 1, rank: x.leader.rank, count: x.count, size: x.leader.size, levelWeekly: x.leader.levelWeekly, binaryWeekly: x.leader.binaryWeekly, paidWeekly: each.gt(cap) ? cap : each };
  })) : [];
  const genInfo: GenInfo[] = [1, 2, 3, 4, 5, 6].map((g) => {
    const unlockRank = unlockRankOf(g);
    const unlocked = g <= gens.length;
    const a = unlocked ? alloc[g - 1] : null;
    return { gen: g, pct: unlocked ? gens[g - 1] : unlockRank.mentorGens[g - 1], unlocked, unlockRank: unlockRank.id, max: a?.max ?? 0, used: a?.used ?? 0, auto: limits[g - 1] == null, rankChoice: unlocked ? chosen[g - 1] ?? null : null,
      picks: a ? a.picks.map((x) => ({ rank: x.leader.rank, count: x.count })) : [] };
  });
  const gen1Max = alloc[0]?.max ?? 0;
  const mentorWeekly = sum(tiers.map((x) => x.paidWeekly.times(x.count)));
  const mHow: string[] = [];
  if (gens.length) {
    if (!tiers.length) mHow.push(T.mentorNone);
    else {
      for (const g of genInfo.filter((x) => x.unlocked)) {
        mHow.push(T.mentorGen(g.gen, g.pct, g.used, g.auto, g.max));
        const asked = limits[g.gen - 1];
        if (asked != null && asked > g.max) mHow.push(T.mentorTooMany(g.gen, asked, g.max));
      }
      if (warning) mHow.push(warning);
      if (rankNote) mHow.push(rankNote);
      for (const g of genInfo.filter((x) => x.rankChoice && x.used)) mHow.push(T.mentorChosen(g.gen, g.rankChoice!, alloc[g.gen - 1].picks[0].leader.size));
      for (const x of tiers) mHow.push(T.mentorTier(x.gen, x.count, x.rank, x.levelWeekly.toFixed(2), x.binaryWeekly.toFixed(2), gens[x.gen - 1], x.paidWeekly.toFixed(2), x.paidWeekly.eq(cap)));
      mHow.push(T.mentorRule(o.building, leaderLines));
    }
  }
  const mentorMonthly = cents(mentorWeekly.times(WEEKS_PER_MONTH));
  lines.push({
    id: "mentor", name: "Mentor Match", monthly: mentorMonthly, estimated: true,
    how: gens.length ? mHow : [],
    why: !gens.length ? T.mentorWhy(gen1Max) : undefined,
  });

  const confirmed = cents(sum(lines.filter((l) => !l.estimated).map((l) => l.monthly)));
  const total = cents(sum(lines.map((l) => l.monthly)));

  const reached = r.paidRank ? PLAN.ranks.filter((x) => x.rankBonus && rankIndex(x.id) <= rankIndex(r.paidRank!)) : [];
  const nextEval = r.nextRank ? r.qualificationMonth!.evaluations.find((e) => e.rank === r.nextRank) : null;
  const nextMvr = r.nextRank ? rankById[r.nextRank].mvr : null;
  const gapText = (key: string, gap: D) => {
    const n = Math.ceil(Number(gap.toString()));
    if (key === "pv") return T.gapPv(n);
    if (key === "qdv") return T.gapQdv(n, Math.ceil(n / (sx * pv || 1)), sx, nextMvr);
    if (key === "ol2l") return T.gapOl2l(n);
    return T.gapLeg(n);
  };
  return {
    errors: [], rank: r.paidRank, lines, confirmed, total, leaders: { gens: genInfo, tiers, warning: [warning, rankNote].filter(Boolean).join(" ") || undefined },
    rankBonusTotal: d(reached.reduce((x, y) => x + (y.rankBonus ?? 0), 0)), rankBonusRanks: reached.map((x) => T.bonusItem(x.id, x.rankBonus!)),
    next: nextEval ? { rank: nextEval.rank, gaps: nextEval.checks.filter((c) => !c.ok).map((c) => gapText(c.key, c.gap)) } : null,
    assumptions: T.assumptions({ pv, rp: s.retailPerSachet, pp: s.preferredPerSachet, act: s.orgActivePct, at: activeTeam, team: o.team, a: active, d: s.directs, b: o.building, ac: o.activeCustomers, oc: s.orgCustomers, cps: o.customersPerSocio.toFixed(2), st: s.strongLegPct }),
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
