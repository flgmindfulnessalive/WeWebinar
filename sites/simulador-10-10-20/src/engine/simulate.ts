// Motor directo: entradas → rango pagado → cada forma de ganar.
// Determinista, sin IA. Cada resultado guarda los pasos que lo produjeron.
import { PLAN, RANK_ORDER, rankById, rankIndex } from "../plan/plan-10-10-20";
import type { RankId, RankRule } from "../plan/types";
import { cents, d, max, min, pct, sum, usd, vol, WEEKS_PER_MONTH, ZERO, type D } from "./decimal";
import { buildTree, DetailedVolumes, detailedCounts, detailedMissing, validateDetailed } from "./detailed";
import { ROOT_ID, type Assumptions, type SimulationInput } from "./model";
import { quickCounts, quickMissing, quickSnapshot, validateQuick, type PeopleCounts } from "./quick";
import { productIndex, WEEKS, type ProductIndex, type Snapshot, type WindowId } from "./snapshot";

export type Classification = "puntual" | "temporal" | "potencialmente_recurrente";
/**
 * calculado: importe calculado con reglas de las fuentes.
 * no_elegible: importe 0 con su causa.
 * pendiente: no puede calcularse (faltan datos o reglas): sin importe.
 * hipotetico: calculado solo porque activaste un supuesto no confirmado.
 * contradiccion: las fuentes dan valores distintos; se muestra el rango.
 */
export type ComponentStatus = "calculado" | "no_elegible" | "pendiente" | "hipotetico" | "contradiccion";

export interface ComponentResult {
  id: string;
  name: string;
  ruleId: string;
  classification: Classification;
  status: ComponentStatus;
  /** Importe de referencia mensual (null si pendiente). */
  monthly: D | null;
  /** Mes de 4 semanas (solo componentes semanales). */
  monthly4w: D | null;
  weekly: (D | null)[] | null;
  range: { low: D; high: D; lowLabel: string; highLabel: string } | null;
  steps: string[];
  reasons: string[];
  missing: string[];
  capsHit: string[];
  period: string;
  /** Fuente del dato: confirmada en PDF, solo web o supuesto. */
  basis: "fuentes" | "web" | "supuesto";
}

export interface RequirementCheck {
  key: "pv" | "qdv" | "ol2l" | "balance";
  label: string;
  required: D;
  actual: D;
  ok: boolean;
  gap: D;
  detail: string;
}

export interface RankEvaluation {
  rank: RankId;
  ok: boolean;
  checks: RequirementCheck[];
}

export interface Qualification {
  paidRank: RankId | null;
  evaluations: RankEvaluation[];
  snapshot: Snapshot;
}

export interface VolumeSummary {
  ownQv: D;
  customersQv: D;
  teamQv: D;
  totalQv: D;
  /** QDV contable para el rango pagado (tras la regla del 50 %). */
  qdvCounted: D;
  /** Volumen de líneas que supera el 50 % del requisito del siguiente rango (no cuenta para él). */
  mvrExcessNext: D;
  /** Pierna mayor − pierna menor del mes (no remunerado en el binario; el arrastre no está definido). */
  binaryUnpaid: D;
  legs: { L: D; R: D };
}

export interface SimulationResult {
  ok: boolean;
  errors: string[];
  missing: string[];
  qualificationMonth: Qualification | null;
  paidRankByWeek: (RankId | null)[];
  paidRank: RankId | null;
  nextRank: RankId | null;
  components: ComponentResult[];
  totals: {
    recurring: D;
    recurringWithAssumptions: D;
    oneTime: D;
    oneTimeRange: { low: D; high: D } | null;
    pending: string[];
  };
  volumes: VolumeSummary | null;
  counts: PeopleCounts | null;
  notes: string[];
}

// ---------------------------------------------------------------------------
// Calificación de rango

export function pvForRank(s: Snapshot, r: RankRule, a: Assumptions): { value: D; detail: string } {
  const capApplies = r.pv === 200 && a.region !== "apac";
  if (capApplies && s.ownQv.gt(PLAN.personalPvCapForPv200)) {
    const v = d(PLAN.personalPvCapForPv200).plus(s.customersQv);
    return { value: v, detail: `Compras personales ${vol(s.ownQv)} (cuentan máx. ${PLAN.personalPvCapForPv200}) + clientes ${vol(s.customersQv)} = ${vol(v)}` };
  }
  const v = s.ownQv.plus(s.customersQv);
  return { value: v, detail: `Compras personales ${vol(s.ownQv)} + clientes ${vol(s.customersQv)} = ${vol(v)}` };
}

export function qdvCounted(s: Snapshot, required: D, a: Assumptions): { value: D; capped: string[]; excess: D } {
  const cap = required.times(PLAN.maxVolumeRule);
  const capped: string[] = [];
  let excess = ZERO;
  let total = ZERO;
  for (const l of s.lines) {
    if (l.qv.gt(cap)) {
      capped.push(`${l.label}: ${vol(l.qv)} → cuenta ${vol(cap)}${l.count > 1 ? ` (×${l.count})` : ""}`);
      excess = excess.plus(l.qv.minus(cap).times(l.count)); total = total.plus(cap.times(l.count));
    } else total = total.plus(l.qv.times(l.count));
  }
  if (a.includeOwnPvInQdv) total = total.plus(s.ownQv.plus(s.customersQv));
  return { value: total, capped, excess };
}

export function ol2l(s: Snapshot): D {
  const sorted = [...s.lines].sort((x, y) => (y.qv.gt(x.qv) ? 1 : y.qv.lt(x.qv) ? -1 : 0));
  let skip = 2;
  let total = ZERO;
  for (const l of sorted) {
    const drop = Math.min(skip, l.count);
    skip -= drop;
    total = total.plus(l.qv.times(l.count - drop));
  }
  return total;
}
const linesCount = (s: Snapshot) => s.lines.reduce((a, l) => a + l.count, 0);

export function evaluateRank(s: Snapshot, r: RankRule, a: Assumptions): RankEvaluation {
  const checks: RequirementCheck[] = [];
  const pv = pvForRank(s, r, a);
  const req = (key: RequirementCheck["key"], label: string, required: number, actual: D, detail: string) => {
    const rq = d(required);
    checks.push({ key, label, required: rq, actual, ok: actual.gte(rq), gap: max(ZERO, rq.minus(actual)), detail });
  };
  req("pv", "PV", r.pv, pv.value, pv.detail);
  if (r.qdv != null) {
    const q = qdvCounted(s, d(r.qdv), a);
    req("qdv", "QDV (máx. 50 % por línea)", r.qdv, q.value,
      `${linesCount(s)} línea(s); tope por línea ${vol(d(r.qdv).times(PLAN.maxVolumeRule))}` + (q.capped.length ? `. Recortadas: ${q.capped.join("; ")}` : "") + (a.includeOwnPvInQdv ? ". Incluye tu PV." : ""));
  }
  if (r.ol2l != null) req("ol2l", "OL2L", r.ol2l, ol2l(s), "Volumen fuera de tus 2 líneas más grandes.");
  if (r.binaryBalance != null) {
    const lesser = min(s.legs.L, s.legs.R);
    req("balance", "Equilibrio binario", r.binaryBalance, lesser, `Pierna izq. ${vol(s.legs.L)} · der. ${vol(s.legs.R)} · menor ${vol(lesser)} (lectura literal del requisito).`);
  }
  return { rank: r.id, ok: checks.every((c) => c.ok), checks };
}

export function qualify(s: Snapshot, a: Assumptions): Qualification {
  const evaluations = PLAN.ranks.map((r) => evaluateRank(s, r, a));
  let paidRank: RankId | null = null;
  for (const e of evaluations) if (e.ok) paidRank = e.rank;
  return { paidRank, evaluations, snapshot: s };
}

const atLeast = (r: RankId | null, target: RankId) => r != null && rankIndex(r) >= rankIndex(target);

// ---------------------------------------------------------------------------
// Conversión de semanas a mes

function monthlyFromWeeks(weeks: D[], a: Assumptions): { monthly: D; monthly4w: D; note: string } {
  const four = sum(weeks);
  if (a.orderTiming === "uniforme") {
    const avg = four.dividedBy(4).times(WEEKS_PER_MONTH);
    return { monthly: cents(avg), monthly4w: cents(four), note: "Semanal → mensual: promedio semanal × 52/12 (≈4,33). Un mes contado como 4 semanas da menos." };
  }
  return { monthly: cents(four), monthly4w: cents(four), note: "Las compras caen en semanas concretas una vez al mes: el mes es la suma de sus 4 semanas (52/12 no aplica porque no hay compras en la semana extra)." };
}

// ---------------------------------------------------------------------------

interface Ctx {
  a: Assumptions;
  idx: ProductIndex;
  snap: (w: WindowId) => Snapshot;
  /** Solo en modo detallado. */
  vols?: DetailedVolumes;
  mode: "rapido" | "detallado";
  enrollments: { packageId: string; count: number }[];
}

const base = (id: string, name: string, ruleId: string, classification: Classification, period: string, basis: ComponentResult["basis"] = "fuentes"): ComponentResult => ({
  id, name, ruleId, classification, status: "calculado", monthly: ZERO, monthly4w: null, weekly: null, range: null,
  steps: [], reasons: [], missing: [], capsHit: [], period, basis,
});

function paidRanks(ctx: Ctx, qMonth: Qualification): (RankId | null)[] {
  if (ctx.a.qualificationPeriod === "mensual") return WEEKS.map(() => qMonth.paidRank);
  return WEEKS.map((w) => qualify(ctx.snap(w), ctx.a).paidRank);
}

function personalTeam(ctx: Ctx, ranks: (RankId | null)[]): ComponentResult {
  const c = base("personal-team", "Bono por nivel alcanzado · 10 % Personal Team", "personal-team", "potencialmente_recurrente", "Calculado por semana (periodo de pago no indicado).");
  const weekly: D[] = [];
  let ineligibleWeeks = 0;
  for (const w of WEEKS) {
    const s = ctx.snap(w as WindowId);
    const baseCv = s.sponsoredCv.plus(ctx.a.personalTeamIncludesCustomers ? s.sponsoredCustomersCv : ZERO);
    const ok = atLeast(ranks[w as number], "abp");
    if (!ok && baseCv.gt(0)) ineligibleWeeks++;
    weekly.push(ok ? cents(pct(baseCv, PLAN.personalTeamPct)) : ZERO);
  }
  const m = monthlyFromWeeks(weekly, ctx.a);
  const monthCv = ctx.snap("m").sponsoredCv.plus(ctx.a.personalTeamIncludesCustomers ? ctx.snap("m").sponsoredCustomersCv : ZERO);
  c.weekly = weekly; c.monthly = m.monthly; c.monthly4w = m.monthly4w;
  c.steps.push(`Volumen comisionable de tus Brand Partners patrocinados personalmente en el mes: ${vol(monthCv)}` + (ctx.a.personalTeamIncludesCustomers ? " (incluye a sus clientes)" : " (sin sus clientes)") + ".");
  c.steps.push(`Por semana: 10 % × volumen de la semana, solo si esa semana tienes al menos rango BP Activo (55 PV).`);
  c.steps.push(`Semanas: ${weekly.map((x) => usd(x)).join(" · ")}.`);
  c.steps.push(m.note);
  if (monthCv.isZero()) { c.status = "no_elegible"; c.reasons.push("No tienes Brand Partners patrocinados personalmente con compras en el periodo."); }
  else if (ineligibleWeeks === 4) { c.status = "no_elegible"; c.reasons.push(`No alcanzas BP Activo (${PLAN.ranks[0].pv} PV) en ninguna semana pagada.`); c.missing.push(`PV de BP Activo: ${PLAN.ranks[0].pv}`); }
  else if (ineligibleWeeks > 0) c.reasons.push(`En ${ineligibleWeeks} de 4 semanas no tienes BP Activo y ese 10 % no se paga.`);
  return c;
}

function customerBonus(ctx: Ctx): ComponentResult {
  const c = base("customer", "Bono para el cliente (Customer Premium)", "customer", "potencialmente_recurrente", "Ventana de 31 días (≈ el mes).", "web");
  const s = ctx.snap("m");
  const tier = [...PLAN.customerBonusTiers].reverse().find((t) => s.customersQv.gte(t.minQv));
  c.monthly4w = null;
  c.steps.push(`Volumen de calificación de tus clientes personales en 31 días: ${vol(s.customersQv)}.`);
  c.steps.push(`Tramos (fuente: web): ${PLAN.customerBonusTiers.map((t) => `${vol(t.minQv)}${t.maxQv ? `–${vol(t.maxQv)}` : "+"} → ${t.pct} %`).join(" · ")}.`);
  if (s.customersQv.isZero()) { c.status = "no_elegible"; c.monthly = ZERO; c.reasons.push("No tienes compras de clientes personales en el periodo."); return c; }
  if (!tier) {
    c.status = "no_elegible"; c.monthly = ZERO;
    const gap = d(PLAN.customerBonusTiers[0].minQv).minus(s.customersQv);
    c.reasons.push(`No llegas al primer tramo: faltan ${vol(gap)} de volumen de clientes para el 5 %.`);
    c.missing.push(`${vol(gap)} de volumen de clientes`);
    return c;
  }
  c.monthly = cents(pct(s.customersCv, tier.pct));
  c.steps.push(`Tramo alcanzado: ${tier.pct} %. Supuesto: el % se aplica al volumen comisionable de esas compras (${vol(s.customersCv)}) → ${usd(c.monthly)}.`);
  const nextTier = PLAN.customerBonusTiers.find((t) => t.minQv > s.customersQv.toNumber());
  if (nextTier) c.reasons.push(`Para el ${nextTier.pct} % faltan ${vol(d(nextTier.minQv).minus(s.customersQv))} de volumen de clientes.`);
  return c;
}

function retail(ctx: Ctx): ComponentResult {
  const c = base("retail", "Margen de venta minorista", "retail", "potencialmente_recurrente", "Por venta (mensual).", "supuesto");
  const s = ctx.snap("m");
  const units = s.customerUnits.filter((u) => u.qty.gt(0));
  if (!units.length) { c.status = "no_elegible"; c.monthly = ZERO; c.reasons.push("Sin ventas a clientes personales."); return c; }
  const noMargin = units.filter((u) => ctx.idx[u.productId]?.retailMargin == null);
  if (noMargin.length) {
    c.status = "pendiente"; c.monthly = null;
    c.missing.push(...new Set(noMargin.map((u) => `margen por unidad de «${ctx.idx[u.productId]?.name ?? u.productId}»`)));
    c.reasons.push("Las fuentes no incluyen precios: introduce tu margen por unidad para calcularlo.");
    return c;
  }
  c.monthly = cents(units.reduce((a, u) => a.plus(u.qty.times(d(ctx.idx[u.productId]!.retailMargin!))), ZERO));
  c.steps.push(...units.map((u) => `${vol(u.qty)} × ${ctx.idx[u.productId]!.name} × margen ${usd(ctx.idx[u.productId]!.retailMargin!)}`));
  return c;
}

/** Bono binario de un BP en una semana (solo con el supuesto activado). */
function binaryWeek(s: Snapshot, rank: RankId | null): { amount: D; capped: boolean; base: D } {
  if (!atLeast(rank, "m1")) return { amount: ZERO, capped: false, base: ZERO };
  const r = rankById[rank!];
  const b = min(s.legs.Lcv, s.legs.Rcv);
  const raw = cents(pct(b, r.binaryPct!));
  const capped = raw.gt(r.binaryWeeklyCap!);
  return { amount: capped ? d(r.binaryWeeklyCap!) : raw, capped, base: b };
}

function binary(ctx: Ctx, ranks: (RankId | null)[]): ComponentResult {
  const c = base("binary", "Bono Binario", "binary", "potencialmente_recurrente", "Semanal (PDF p.9).", "supuesto");
  if (!ctx.a.assumeBinary) {
    c.status = "pendiente"; c.monthly = null;
    c.reasons.push("Las fuentes dan el % y el tope semanal por rango, pero no sobre qué volumen se aplica, ni si hay arrastre o mínimo por pierna.");
    c.missing.push("Base de cálculo del binario (p. ej. pierna menor)", "Regla de arrastre de volumen");
    c.steps.push("Activa el supuesto «Binario sobre la pierna menor» para ver una estimación hipotética.");
    return c;
  }
  const weekly: D[] = [];
  for (const w of WEEKS) {
    const s = ctx.snap(w as WindowId);
    const r = binaryWeek(s, ranks[w as number]);
    weekly.push(r.amount);
    if (r.capped) c.capsHit.push(`Semana ${(w as number) + 1}: tope de ${usd(rankById[ranks[w as number]!].binaryWeeklyCap!)} alcanzado.`);
  }
  const m = monthlyFromWeeks(weekly, ctx.a);
  c.status = "hipotetico"; c.weekly = weekly; c.monthly = m.monthly; c.monthly4w = m.monthly4w;
  c.steps.push("SUPUESTO no confirmado: % del rango pagado × volumen comisionable de la pierna menor de cada semana, sin arrastre, con el tope semanal del PDF.");
  c.steps.push(...WEEKS.map((w) => {
    const s = ctx.snap(w as WindowId); const r = ranks[w as number];
    return `Semana ${(w as number) + 1}: piernas ${vol(s.legs.Lcv)} / ${vol(s.legs.Rcv)} · rango ${r ? rankById[r].short : "sin rango"}${atLeast(r, "m1") ? ` · ${rankById[r!].binaryPct} % → ${usd(weekly[w as number])}` : " · no califica (requiere 1★ Manager)"}`;
  }));
  c.steps.push(m.note);
  if (weekly.every((x) => x.isZero())) {
    c.status = "no_elegible";
    if (!ranks.some((r) => atLeast(r, "m1"))) { c.reasons.push("Requiere rango pagado 1★ Manager o superior."); c.missing.push("Rango 1★ Manager"); }
    else c.reasons.push("Una de tus piernas no tiene volumen: la pierna menor es 0.");
  }
  return c;
}

function mentor(ctx: Ctx, ranks: (RankId | null)[]): ComponentResult {
  const c = base("mentor", "Bono de Igualación de Mentores (Mentor Match)", "mentor", "potencialmente_recurrente", "Calculado por semana (supuesto).", "supuesto");
  if (ctx.mode === "rapido") {
    c.status = "pendiente"; c.monthly = null;
    c.reasons.push("Información insuficiente: depende de las generaciones y del bono de cada persona. Usa el modo detallado.");
    c.missing.push("Genealogía (modo detallado)");
    return c;
  }
  if (!ctx.a.assumeMentor || !ctx.a.assumeBinary) {
    c.status = "pendiente"; c.monthly = null;
    c.reasons.push("Las fuentes dan % por generación y tope por BP, pero no qué ganancias se igualan ni cómo se cuentan las generaciones.");
    c.missing.push("Base del Mentor Match", "Definición de generación");
    c.steps.push("Requiere activar los supuestos «Binario sobre la pierna menor» y «Mentor Match sobre el binario de tus generaciones».");
    return c;
  }
  const v = ctx.vols!;
  const weekly: D[] = [];
  const detailLines: string[] = [];
  for (const w of WEEKS) {
    const r = ranks[w as number];
    if (!atLeast(r, "d1")) { weekly.push(ZERO); continue; }
    const gens = rankById[r!].mentorGens;
    const cap = d(rankById[r!].mentorCapPerBp!);
    const generations = v.generations(ROOT_ID, gens.length);
    let total = ZERO;
    generations.forEach((people, gi) => {
      for (const p of people) {
        const ps = v.snapshot(p.id, w as WindowId);
        const pRank = ctx.a.qualificationPeriod === "mensual" ? qualify(v.snapshot(p.id, "m"), ctx.a).paidRank : qualify(ps, ctx.a).paidRank;
        const b = binaryWeek(ps, pRank).amount;
        if (b.isZero()) continue;
        const raw = cents(pct(b, gens[gi]));
        const amt = raw.gt(cap) ? cap : raw;
        if (raw.gt(cap)) c.capsHit.push(`Semana ${(w as number) + 1}: ${p.label} topado en ${usd(cap)}.`);
        total = total.plus(amt);
        if (w === 0 || ctx.a.orderTiming !== "uniforme") detailLines.push(`Sem. ${(w as number) + 1} · Gen ${gi + 1} · ${p.label}: ${gens[gi]} % × binario ${usd(b)} = ${usd(amt)}`);
      }
    });
    weekly.push(cents(total));
  }
  const m = monthlyFromWeeks(weekly, ctx.a);
  c.status = "hipotetico"; c.weekly = weekly; c.monthly = m.monthly; c.monthly4w = m.monthly4w;
  c.steps.push("SUPUESTO no confirmado: % de la generación × bono binario semanal de cada Brand Partner de esa generación de patrocinio; tope por BP y semana.");
  c.steps.push(...(detailLines.length ? detailLines.slice(0, 40) : ["Ninguna persona de tus generaciones cobra binario con estos datos."]));
  c.steps.push(m.note);
  if (weekly.every((x) => x.isZero())) {
    c.status = "no_elegible";
    if (!ranks.some((r) => atLeast(r, "d1"))) { c.reasons.push("Requiere rango pagado 1★ Director o superior."); c.missing.push("Rango 1★ Director"); }
    else c.reasons.push("Nadie en tus generaciones cobra binario con estos datos.");
  }
  return c;
}

function pib(ctx: Ctx): ComponentResult {
  const c = base("pib", "Bono de Introducción de Producto (PIB)", "pib", "puntual", "Por inscripción.");
  const lines = ctx.enrollments.filter((e) => e.count > 0);
  if (!lines.length) { c.status = "no_elegible"; c.reasons.push("Sin inscripciones con paquete en el periodo."); return c; }
  let total = ZERO;
  for (const e of lines) {
    const p = PLAN.pib.find((x) => x.id === e.packageId);
    if (!p) { c.missing.push(`paquete «${e.packageId}»`); continue; }
    total = total.plus(d(p.bonus).times(e.count));
    c.steps.push(`${e.count} × ${p.name} × ${usd(p.bonus)} = ${usd(d(p.bonus).times(e.count))}`);
  }
  c.monthly = cents(total);
  c.reasons.push("Puntual: se genera con cada nueva inscripción, no se repite cada mes por sí solo. Requisitos de elegibilidad no indicados en las fuentes.");
  return c;
}

function rankBonus(ctx: Ctx, highest: RankId | null): ComponentResult {
  const c = base("rank-bonus", "Bono por subir de rango", "rank-bonus", "puntual", "Puntual: 1.ª y 4.ª calificación.");
  const prev = ctx.a.previousHighestRank ? rankIndex(ctx.a.previousHighestRank) : -1;
  const newly = highest ? PLAN.ranks.filter((r) => rankIndex(r.id) > prev && rankIndex(r.id) <= rankIndex(highest) && r.rankBonus != null) : [];
  if (!newly.length) {
    c.status = "no_elegible";
    c.reasons.push(highest ? "No alcanzas en este periodo un rango con bono que no hubieras alcanzado antes." : "Sin rango pagado en el periodo.");
    const next = PLAN.ranks.find((r) => r.rankBonus != null && rankIndex(r.id) > Math.max(prev, highest ? rankIndex(highest) : -1));
    if (next) c.missing.push(`Alcanzar ${next.short} (bono ${usd(next.rankBonus)})`);
    return c;
  }
  const total = sum(newly.map((r) => d(r.rankBonus!)));
  const half = cents(total.dividedBy(2));
  c.steps.push(...newly.map((r) => `${r.short}: ${usd(r.rankBonus)} (acumulativo)`));
  c.steps.push(`Total ${usd(total)}. Según la web se paga en dos mitades: ${usd(half)} al calificar por 1.ª vez y ${usd(half)} al calificar por 4.ª vez.`);
  c.monthly = half;
  const days = ctx.a.daysSinceEnrollment;
  if (days != null && days <= PLAN.rankBonusDoubling.pdf.days) {
    const dbl = newly.filter((r) => PLAN.rankBonusDoubling.pdf.ranks.includes(r.id));
    if (dbl.length) {
      const pdfTotal = total.plus(sum(dbl.map((r) => d(r.rankBonus!))));
      const inWebWindow = days <= PLAN.rankBonusDoubling.web.weeks * 7;
      c.status = "contradiccion";
      c.monthly = null;
      c.range = { low: half, high: cents(pdfTotal), lowLabel: "Sin duplicar: ½ en la 1.ª calificación", highLabel: `Lectura PDF p.7: total duplicado en ${dbl.map((r) => r.short).join(", ")}` };
      c.steps.push(`Nuevo Brand Partner (${days} días): PDF p.7 duplica el bono de ${dbl.map((r) => r.short).join(", ")} si se alcanza en los primeros 60 días → total ${usd(pdfTotal)}.`);
      c.steps.push(inWebWindow
        ? `Web (arranque rápido): en las primeras 8 semanas se cobra el bono completo en la 1.ª calificación en lugar de la mitad → ${usd(total)} ahora; la segunda mitad, por confirmar.`
        : `Web: el doble aplica en las primeras 8 semanas (56 días); con ${days} días quedaría fuera.`);
      c.reasons.push("Las fuentes se contradicen sobre en qué consiste el «doble»: se muestra el rango, sin elegir una lectura.");
    }
  }
  return c;
}

function quarterly(highest: RankId | null): ComponentResult {
  const c = base("quarterly", "Grupo de Liderazgo Trimestral", "quarterly", "temporal", "Trimestral.");
  const r = highest ? rankById[highest] : null;
  if (!r || r.quarterlyShares == null) {
    c.status = "no_elegible"; c.reasons.push("Solo para rangos Presidenciales (1★, 2★ o 3★ Presidencial)."); return c;
  }
  c.status = "pendiente"; c.monthly = null;
  c.steps.push(`${r.short}: ${r.quarterlyShares} participación(es) según el PDF p.11 (la web habla de participaciones por semana pagada).`);
  c.reasons.push("Las fuentes no publican el tamaño del fondo ni el valor por participación: no se calcula dinero.");
  c.missing.push("Valor de la participación");
  return c;
}

// ---------------------------------------------------------------------------

export function simulate(input: SimulationInput): SimulationResult {
  const a = input.assumptions;
  const idx = productIndex(input.products);
  const empty = (errors: string[], missing: string[] = []): SimulationResult => ({
    ok: false, errors, missing, qualificationMonth: null, paidRankByWeek: [], paidRank: null, nextRank: null, components: [],
    totals: { recurring: ZERO, recurringWithAssumptions: ZERO, oneTime: ZERO, oneTimeRange: null, pending: [] }, volumes: null, counts: null, notes: [],
  });

  for (const p of input.products) {
    for (const [k, v] of [["volumen de calificación", p.qv], ["volumen comisionable", p.cv], ["margen", p.retailMargin]] as const) {
      if (v != null && !(Number.isFinite(v) && v >= 0)) return empty([`${p.name}: el ${k} debe ser un número ≥ 0.`]);
    }
  }

  let ctx: Ctx;
  let counts: PeopleCounts;
  let missing: string[];
  if (input.mode === "rapido") {
    if (!input.quick) return empty(["Falta la organización del modo rápido."]);
    const errs = validateQuick(input.quick);
    if (errs.length) return empty(errs);
    missing = quickMissing(input.quick, idx);
    const q = input.quick;
    const memo = new Map<WindowId, Snapshot>();
    ctx = { a, idx, mode: "rapido", enrollments: q.enrollments, snap: (w) => memo.get(w) ?? (memo.set(w, quickSnapshot(q, w, a, idx)), memo.get(w)!) };
    counts = quickCounts(q, idx);
  } else {
    if (!input.detailed) return empty(["Falta la organización del modo detallado."]);
    const errs = validateDetailed(input.detailed);
    if (errs.length) return empty(errs);
    missing = detailedMissing(input.detailed, idx);
    const t = buildTree(input.detailed);
    const vols = new DetailedVolumes(t, idx, a);
    const enrollMap = new Map<string, number>();
    for (const p of input.detailed.people) if (p.sponsorId === ROOT_ID && p.enrollmentPackage) enrollMap.set(p.enrollmentPackage, (enrollMap.get(p.enrollmentPackage) ?? 0) + 1);
    ctx = { a, idx, mode: "detallado", vols, enrollments: [...enrollMap].map(([packageId, count]) => ({ packageId, count })), snap: (w) => vols.snapshot(ROOT_ID, w) };
    counts = detailedCounts(input.detailed, vols);
  }
  if (missing.length) {
    const r = empty([], missing);
    r.counts = counts;
    return r;
  }

  const qMonth = qualify(ctx.snap("m"), a);
  const ranks = paidRanks(ctx, qMonth);
  const highest = ranks.reduce<RankId | null>((h, r) => (r && (!h || rankIndex(r) > rankIndex(h)) ? r : h), null);
  const ref = a.qualificationPeriod === "mensual" ? qMonth.paidRank : highest;
  const nextRank = RANK_ORDER[(ref ? rankIndex(ref) : -1) + 1] ?? null;

  const components = [
    personalTeam(ctx, ranks),
    customerBonus(ctx),
    retail(ctx),
    binary(ctx, ranks),
    mentor(ctx, ranks),
    pib(ctx),
    rankBonus(ctx, highest),
    quarterly(highest),
  ];

  const isRec = (c: ComponentResult) => c.classification === "potencialmente_recurrente";
  const recurring = sum(components.filter((c) => isRec(c) && c.status === "calculado" && c.monthly).map((c) => c.monthly!));
  const hypo = sum(components.filter((c) => isRec(c) && c.status === "hipotetico" && c.monthly).map((c) => c.monthly!));
  const oneTimeFixed = sum(components.filter((c) => c.classification === "puntual" && c.monthly).map((c) => c.monthly!));
  const rangeC = components.find((c) => c.classification === "puntual" && c.range);
  const s = ctx.snap("m");
  const teamQv = s.legs.L.plus(s.legs.R);
  const nextQdv = nextRank && rankById[nextRank].qdv != null ? qdvCounted(s, d(rankById[nextRank].qdv!), a) : null;
  const paidQdv = qMonth.paidRank && rankById[qMonth.paidRank].qdv != null ? qdvCounted(s, d(rankById[qMonth.paidRank].qdv!), a).value : sum(s.lines.map((l) => l.qv.times(l.count)));

  return {
    ok: true, errors: [], missing: [],
    qualificationMonth: qMonth, paidRankByWeek: ranks, paidRank: ref, nextRank,
    components,
    totals: {
      recurring: cents(recurring),
      recurringWithAssumptions: cents(recurring.plus(hypo)),
      oneTime: cents(oneTimeFixed),
      oneTimeRange: rangeC ? { low: cents(oneTimeFixed.plus(rangeC.range!.low)), high: cents(oneTimeFixed.plus(rangeC.range!.high)) } : null,
      pending: components.filter((c) => c.status === "pendiente").map((c) => c.name),
    },
    volumes: {
      ownQv: s.ownQv, customersQv: s.customersQv, teamQv, totalQv: s.ownQv.plus(s.customersQv).plus(teamQv),
      qdvCounted: paidQdv, mvrExcessNext: nextQdv?.excess ?? ZERO,
      binaryUnpaid: max(s.legs.L, s.legs.R).minus(min(s.legs.L, s.legs.R)), legs: { L: s.legs.L, R: s.legs.R },
    },
    counts,
    notes: [
      a.qualificationPeriod === "mensual" ? "Calificación de rango con el volumen del mes (supuesto: el periodo no está en las fuentes)." : "Calificación de rango semana a semana (supuesto).",
      "Importes redondeados a centavos al final de cada componente y semana (el punto de redondeo oficial no está publicado).",
    ],
  };
}
