// Plan 10·10·20 — reglas versionadas.
// Fuente principal (OFICIAL): «Plan de Compensación LifeWave 10-10-20 (EE. UU.)»,
//   2 páginas (tabla oficial, PDF modificado el 16-oct-2026). Citado como «Oficial p.1/p.2».
// Fuentes secundarias, solo para lo que la tabla oficial no detalla:
//   PDF: presentación «10-10-20 This Is It» (13 págs., Canva, 08-oct-2026).
//   WEB: vivralux.com/nuevo-plan-compensacion-lifewave («Ten · Ten · Twenty»).
// No se usan reglas de planes anteriores ni cifras genéricas del sector.
// Ver docs/MATRIZ_REGLAS.md (generado desde este archivo).
import type { PlanRules, RankRule } from "./types";

const O = (where: string, quote?: string) => ({ doc: "oficial" as const, where, quote });
const P = (where: string, quote?: string) => ({ doc: "pdf" as const, where, quote });
const W = (where: string, quote?: string) => ({ doc: "web" as const, where, quote });

const R = (r: Omit<RankRule, "rankReward" | "quarterlyShares"> & Partial<Pick<RankRule, "rankReward" | "quarterlyShares">>): RankRule => ({ rankReward: null, quarterlyShares: null, ...r });

// Todas las cifras de esta tabla: Oficial p.1 (requisitos y Bono de Nivel
// Comprimido) y p.2 (binario, Mentor Match y bonos por avance de rango).
const ranks: RankRule[] = [
  R({ id: "abp", name: "Socio Activo", short: "Socio Activo", pv: 55, qdv: null, mvr: null, ol2l: null, binaryBalance: null, levelPct: 0, binaryPct: null, binaryWeeklyCap: null, mentorGens: [], mentorCapPerBp: null, rankBonus: null }),
  R({ id: "m1", name: "Gerente 1 Estrella", short: "1★ Gerente", pv: 75, qdv: 750, mvr: null, ol2l: null, binaryBalance: null, levelPct: 10, binaryPct: 10, binaryWeeklyCap: 100, mentorGens: [], mentorCapPerBp: null, rankBonus: null }),
  R({ id: "m2", name: "Gerente 2 Estrellas", short: "2★ Gerente", pv: 75, qdv: 1500, mvr: null, ol2l: null, binaryBalance: null, levelPct: 10, binaryPct: 10, binaryWeeklyCap: 500, mentorGens: [], mentorCapPerBp: null, rankBonus: 100 }),
  R({ id: "m3", name: "Gerente 3 Estrellas", short: "3★ Gerente", pv: 75, qdv: 2500, mvr: null, ol2l: null, binaryBalance: null, levelPct: 10, binaryPct: 10, binaryWeeklyCap: 1500, mentorGens: [], mentorCapPerBp: null, rankBonus: 250 }),
  R({ id: "d1", name: "Director 1 Estrella", short: "1★ Director", pv: 110, qdv: 5000, mvr: 2500, ol2l: null, binaryBalance: 1000, levelPct: 10, binaryPct: 11, binaryWeeklyCap: 2500, mentorGens: [20], mentorCapPerBp: 250, rankBonus: 500 }),
  R({ id: "d2", name: "Director 2 Estrellas", short: "2★ Director", pv: 110, qdv: 10000, mvr: 5000, ol2l: null, binaryBalance: 2000, levelPct: 10, binaryPct: 11, binaryWeeklyCap: 3500, mentorGens: [20, 15], mentorCapPerBp: 500, rankBonus: 1000 }),
  R({ id: "d3", name: "Director 3 Estrellas", short: "3★ Director", pv: 110, qdv: 20000, mvr: 10000, ol2l: null, binaryBalance: 3000, levelPct: 10, binaryPct: 11, binaryWeeklyCap: 5000, mentorGens: [20, 15, 10], mentorCapPerBp: 1000, rankBonus: 2000 }),
  R({ id: "e1", name: "Ejecutivo 1 Estrella", short: "1★ Ejecutivo", pv: 200, qdv: 40000, mvr: 20000, ol2l: 5000, binaryBalance: 5000, levelPct: 10, binaryPct: 12, binaryWeeklyCap: 7500, mentorGens: [20, 15, 10, 7], mentorCapPerBp: 2000, rankBonus: 5000 }),
  R({ id: "e2", name: "Ejecutivo 2 Estrellas", short: "2★ Ejecutivo", pv: 200, qdv: 100000, mvr: 50000, ol2l: 10000, binaryBalance: 10000, levelPct: 10, binaryPct: 12, binaryWeeklyCap: 10000, mentorGens: [20, 15, 10, 7, 7], mentorCapPerBp: 3000, rankBonus: null, rankReward: "¡Viaje Ejecutivo!" }),
  R({ id: "e3", name: "Ejecutivo 3 Estrellas", short: "3★ Ejecutivo", pv: 200, qdv: 200000, mvr: 100000, ol2l: 15000, binaryBalance: 15000, levelPct: 10, binaryPct: 12, binaryWeeklyCap: 15000, mentorGens: [20, 15, 10, 7, 7, 5], mentorCapPerBp: 4000, rankBonus: null, rankReward: "¡Viaje Ejecutivo!" }),
  R({ id: "p1", name: "Presidencial 1 Estrella", short: "1★ Presidencial", pv: 200, qdv: 400000, mvr: 200000, ol2l: 50000, binaryBalance: 20000, levelPct: null, binaryPct: 13, binaryWeeklyCap: 20000, mentorGens: [20, 15, 10, 7, 7, 5], mentorCapPerBp: 5000, rankBonus: null, rankReward: "Viajes Presidenciales y Fondo Global Presidencial", quarterlyShares: 1 }),
  R({ id: "p2", name: "Presidencial 2 Estrellas", short: "2★ Presidencial", pv: 200, qdv: 1000000, mvr: 500000, ol2l: 100000, binaryBalance: 25000, levelPct: null, binaryPct: 13, binaryWeeklyCap: 25000, mentorGens: [20, 15, 10, 7, 7, 7], mentorCapPerBp: 5000, rankBonus: null, rankReward: "Viajes Presidenciales y Fondo Global Presidencial", quarterlyShares: 5 }),
  R({ id: "p3", name: "Presidencial 3 Estrellas", short: "3★ Presidencial", pv: 200, qdv: 2500000, mvr: 1250000, ol2l: 200000, binaryBalance: 30000, levelPct: null, binaryPct: 13, binaryWeeklyCap: 25000, mentorGens: [20, 15, 10, 7, 7, 7], mentorCapPerBp: 5000, rankBonus: null, rankReward: "Viajes Presidenciales y Fondo Global Presidencial", quarterlyShares: 15 }),
];

export const PLAN: PlanRules = {
  version: "10-10-20 EE. UU. · tabla oficial (oct-2026)",
  name: "Plan de Compensación LifeWave 10·10·20",
  effectiveDate: null,
  market: "EE. UU. (USD). La tabla oficial es la de EE. UU.; la regla de máx. 110 PV personales excluye la región APAC (presentación p.4).",
  currency: "USD",
  sourcesNote:
    "Fuente principal: la tabla oficial «Plan de Compensación LifeWave 10-10-20 (EE. UU.)» (2 páginas). Para lo que no detalla se citan la presentación «This Is It» (Canva, 08-oct-2026) y la web de VIVRALUX. Las notas al pie de la tabla oficial (*, **, ***) no aparecen en el documento; la fecha de entrada en vigor tampoco.",
  ranks,
  maxVolumeRule: 0.5,
  personalPvCapForPv200: 110,
  personalTeamPct: 10,
  customerBonusTiers: [
    { minQv: 300, maxQv: 599, pct: 5 },
    { minQv: 600, maxQv: 1199, pct: 10 },
    { minQv: 1200, maxQv: null, pct: 20 },
  ],
  customerBonusWindowDays: 31,
  pib: [
    { id: "starter", name: "Starter", bonus: 0, price: 25, qv: 0, sleeves: "0" },
    { id: "basico", name: "Básico", altName: "Core", bonus: 35, price: 295, qv: 180, sleeves: "3 o 6" },
    { id: "avanzado", name: "Avanzado", altName: "Advanced", bonus: 75, price: 535, qv: 300, sleeves: "6 o 12" },
    { id: "avanzado-plus", name: "Avanzado Plus", altName: "Advanced Plus", bonus: 165, price: 975, qv: 500, sleeves: "11 o 22" },
    { id: "premium", name: "Premium", bonus: 405, price: 1750, qv: 775, sleeves: "20 o 40" },
  ],
  pibMinPv: 55,
  rankBonusDoubling: { ranks: ["m2", "m3", "d1"], part1Weeks: 8, part2RequalWeeks: 4, part2WithinWeeks: 16 },
  rules: [
    {
      id: "ranks", concept: "Requisitos de rango",
      rule: "13 rangos, de Socio Activo a 3★ Presidencial, con PV, QDV, regla de volumen máximo (MVR), OL2L y balance binario.",
      formula: "Rango = el más alto cuyos requisitos se cumplen todos en el periodo de calificación.",
      requirements: "PV · QDV · MVR desde 1★ Director · OL2L desde 1★ Ejecutivo · balance binario desde 1★ Director.",
      period: "No indicado (pendiente).", limits: "Ver MVR y PV personal.",
      sources: [O("p.1 · Requisitos de rango"), P("p.4 · Camino al éxito")], status: "oficial",
      note: "Coincide con la presentación. La tabla oficial añade la fila MVR con cifras por rango.",
    },
    {
      id: "pv", concept: "Volumen Personal (PV)",
      rule: "Socio Activo 55 · Gerentes 75 · Directores 110 · Ejecutivos y Presidenciales 200**.",
      formula: "PV = compras personales + compras de tus clientes (ver nota de la regla de 110).",
      requirements: "—", period: "Pendiente.", limits: "200**: según la presentación, máx. 110 de compras personales, salvo APAC.",
      sources: [O("p.1 · Volumen Personal (PV)"), P("p.4", "**Máximo de 110 pueden provenir de compras personales – excluyendo la región APAC")], status: "oficial",
      note: "La tabla oficial marca 200** pero no incluye el texto de la nota; la regla de 110 sale de la presentación.",
    },
    {
      id: "mvr", concept: "Regla de Volumen Máximo (MVR)",
      rule: "Desde 1★ Director, lo máximo que cuenta de una sola línea: 2 500 · 5 000 · 10 000 · 20 000 · 50 000 · 100 000 · 200 000 · 500 000 · 1 250 000 (el 50 % del QDV). Los Gerentes no tienen MVR.",
      formula: "QDV contable = Σ por línea de mín(volumen de la línea; MVR del rango).",
      requirements: "Desde 1★ Director.", period: "Igual que la calificación.", limits: "MVR del rango.",
      sources: [O("p.1 · Regla de Vol. Máx. (MVR)"), P("p.4", "Un máximo del 50% del volumen requerido puede provenir de una sola línea de negocio.")], status: "oficial",
      note: "La presentación no decía que la MVR empieza en 1★ Director; la tabla oficial deja «-» para los Gerentes. «Línea» no se define (patrocinio o colocación): el simulador permite elegir.",
    },
    {
      id: "ol2l", concept: "OL2L (fuera de las 2 piernas mayores)",
      rule: "Desde 1★ Ejecutivo: 5 000 · 10 000 · 15 000 · 50 000 · 100 000 · 200 000.",
      formula: "OL2L = QDV total − volumen de las 2 piernas mayores.",
      requirements: "Desde 1★ Ejecutivo.", period: "Pendiente.", limits: "—",
      sources: [O("p.1 · OL2L** Fuera de las 2 piernas mayores")], status: "oficial",
      note: "La nota ** no está en el documento.",
    },
    {
      id: "balance", concept: "Balance binario (requisito de rango)",
      rule: "Desde 1★ Director: 1 000 · 2 000 · 3 000 · 5 000 · 10 000 · 15 000 · 20 000 · 25 000 · 30 000.",
      formula: "Lectura literal: volumen de la pierna menor del binario ≥ requisito.",
      requirements: "Desde 1★ Director.", period: "Pendiente.", limits: "—",
      sources: [O("p.1 · Balance Binario***")], status: "interpretacion",
      note: "La nota *** que debería explicar cómo se mide no aparece en el documento.",
    },
    {
      id: "pib", concept: "Bono por Introducción de Producto (PIB)",
      rule: "Al inscribir un nuevo Socio de Marca: Starter $0 · Básico $35 · Avanzado $75 · Avanzado Plus $165 · Premium $405.",
      formula: "PIB = Σ monto del paquete de cada Socio de Marca que presentas.",
      requirements: "Estar Activo (mín. 55 PV).", period: "Por inscripción.", limits: "Por paquete.",
      sources: [O("p.1 · 3. Bono por Introducción de Producto", "Debes estar Activo (mín. 55 PV*) para ganarlo.")], status: "oficial",
      note: "Puntual. Paquetes: Starter $25 · 0 QV; Básico 3 o 6 sobres · $295 · 180 QV; Avanzado 6 o 12 · $535 · 300 QV; Avanzado Plus 11 o 22 · $975 · 500 QV; Premium 20 o 40 · $1 750 · 775 QV.",
    },
    {
      id: "personal-team", concept: "Bono de Nivel Comprimido (10 % Personal Team)",
      rule: "10 % de 1★ Gerente a 3★ Ejecutivo; 0 % para el Socio Activo. Las celdas de los Presidenciales están vacías en la tabla.",
      formula: "10 % × volumen de tus Socios de Marca patrocinados personalmente (1 nivel, «comprimido»).",
      requirements: "Rango pagado desde 1★ Gerente.", period: "No indicado.", limits: "Sin tope publicado.",
      sources: [O("p.1 · Bono de Nivel Comprimido", "0% 10% 10% 10% 10% 10% 10% 10% 10% 10%"), P("p.8", "10% en todos los rangos")], status: "interpretacion",
      note: "La tabla no dice sobre qué volumen se calcula ni cómo funciona la compresión (probablemente salta a socios inactivos). Presidenciales: celda vacía en la tabla oficial; la presentación dice «en todos los rangos». El simulador aplica 10 % y lo indica.",
    },
    {
      id: "binary", concept: "Bono Binario",
      rule: "Tasa semanal: Gerentes 10 % · Directores 11 % · Ejecutivos 12 % · Presidenciales 13 %. Máximo semanal de $100 (1★ Gerente) a $25 000 (2★ y 3★ Presidencial).",
      formula: "PENDIENTE: la tabla no dice sobre qué volumen se aplica la tasa (pierna menor u otra), ni si hay arrastre.",
      requirements: "Rango pagado desde 1★ Gerente.", period: "Semanal.", limits: "Máximo semanal por rango.",
      sources: [O("p.2 · Bono Binario"), P("p.9")], status: "pendiente",
      note: "Tasas y topes oficiales. El simulador lo calcula solo como estimado (pierna menor, sin arrastre).",
    },
    {
      id: "mentor", concept: "Bono de Igualación de Mentor (Mentor Match)",
      rule: "1★D G1 20 % · 2★D G1–2 (20/15) · 3★D G1–3 (20/15/10) · 1★E +G4 7 % · 2★E +G5 7 % · 3★E y 1★P +G6 5 % · 2★P y 3★P G6 7 %. Igualación máxima por socio $250 a $5 000.",
      formula: "PENDIENTE: no se indica qué ganancias se igualan ni cómo se cuentan las generaciones.",
      requirements: "Desde 1★ Director.", period: "No indicado.", limits: "Igualación máxima por socio.",
      sources: [O("p.2 · Bono de Igualación de Mentor"), P("p.10")], status: "pendiente",
      note: "Porcentajes y topes oficiales. Solo se calcula como estimado (sobre el binario de tus generaciones).",
    },
    {
      id: "customer", concept: "Bono por Cliente (Customer Premium)",
      rule: "Sobre cada compra de un Cliente inscrito personalmente al alcanzar un mínimo de volumen de clientes: 300–599 → 5 % · 600–1 199 → 10 % · 1 200+ → 20 %.",
      formula: "Tramo según el volumen calificable de tus clientes; el % se aplica a sus compras (aquí, a su volumen).",
      requirements: "Clientes inscritos personalmente (Minorista, Preferente o Preferente Plus).", period: "31 días (web); la tabla no lo indica.", limits: "Máximo 20 %.",
      sources: [O("p.1 · 2. Bono por Cliente"), W("09", "según QV de clientes en 31 días")], status: "oficial",
      note: "La nota * de «Vol. Calificable de Clientes*» no aparece en el documento. La ventana de 31 días sale de la web.",
    },
    {
      id: "retail", concept: "Ganancia Minorista",
      rule: "Una comisión por cada compra de un Cliente inscrito personalmente (Minorista, Preferente o Preferente Plus).",
      formula: "Importe por compra no publicado: lo introduces tú (ganancia por sobre).",
      requirements: "Clientes inscritos personalmente.", period: "Por compra.", limits: "—",
      sources: [O("p.1 · 1. Ganancia Minorista")], status: "pendiente",
      note: "La tabla no da el importe ni el porcentaje.",
    },
    {
      id: "rank-bonus", concept: "Bonos por Avance de Rango",
      rule: "2★ Gerente $100 · 3★ Gerente $250 · 1★ Director $500 · 2★ Director $1 000 · 3★ Director $2 000 · 1★ Ejecutivo $5 000. 2★ y 3★ Ejecutivo: ¡Viaje Ejecutivo! Presidenciales: viajes y Fondo Global Presidencial.",
      formula: "Se paga en dos partes: Parte 1 al alcanzar el rango y Parte 2 tras las 4 semanas de recalificación requeridas. Acumulativo.",
      requirements: "Alcanzar el rango por primera vez.", period: "Puntual.", limits: "Una vez por rango.",
      sources: [O("p.2 · ¡Bonos por Avance de Rango!"), W("07", "Se sigue pagando en dos mitades")], status: "oficial",
    },
    {
      id: "rank-double", concept: "Bono de rango duplicado (nuevos Socios de Marca)",
      rule: "2★ Gerente $100 → $200 · 3★ Gerente $250 → $500 · 1★ Director $500 → $1 000.",
      formula: "Parte 1 se duplica si el rango se alcanza en las primeras 8 semanas; Parte 2 se duplica si las 4 semanas de recalificación se completan dentro de las 16 semanas del logro del rango.",
      requirements: "Socio de Marca nuevo.", period: "8 y 16 semanas.", limits: "Solo esos tres rangos.",
      sources: [O("p.2", "Parte 1: se duplica cuando el rango elegible se alcanza dentro de las primeras ocho semanas. Parte 2: se duplica cuando las cuatro semanas de recalificación requeridas se completan dentro de las 16 semanas del Logro del Título de Carrera.")], status: "oficial",
      note: "Resuelve la contradicción anterior: la presentación (total ×2) y la web (Parte 1 completa en 8 semanas) describían cada una una parte.",
    },
    {
      id: "quarterly", concept: "Viajes y Fondo Global Presidencial",
      rule: "Los Presidenciales acceden a viajes y al Fondo Global Presidencial. La presentación detalla participaciones (1★P 1 · 2★P 5 · 3★P 15).",
      formula: "PENDIENTE: no se publica el tamaño del fondo ni el valor por participación.",
      requirements: "Presidenciales.", period: "No indicado.", limits: "—",
      sources: [O("p.2", "¡Viajes Presidenciales y Fondo Global Presidencial!"), P("p.11 · Grupo de Liderazgo Trimestral")], status: "pendiente",
      note: "El simulador cuenta participaciones según la presentación, nunca dinero.",
    },
    {
      id: "active", concept: "Socio Activo",
      rule: "Socio Activo = 55 PV. Es requisito para cobrar el PIB.",
      formula: "Activo en el simulador = PV ≥ 55 en el periodo de calificación.",
      requirements: "—", period: "Pendiente.", limits: "—",
      sources: [O("p.1 · Socio Activo 55; PIB «Debes estar Activo (mín. 55 PV*)»"), P("p.2", "La divulgación de ganancias usa otra definición de activo (haber comprado, patrocinado o cobrado en el año).")], status: "oficial",
    },
    {
      id: "fees", concept: "Inscripción y renovación",
      rule: "Inscripción $25 y renovación anual $25; no es necesario comprar productos para ser o seguir siendo Socio de Marca. No se gana por solo patrocinar.",
      formula: "—", requirements: "—", period: "Anual.", limits: "—",
      sources: [P("p.2", "La cuota de inscripción es de 25 dólares, con una cuota de renovación anual de 25 dólares.")], status: "pdf",
      note: "La tabla oficial incluye la opción Starter a $25 sin producto.",
    },
  ],
};

export const RANK_ORDER = PLAN.ranks.map((r) => r.id);
export const rankById = Object.fromEntries(PLAN.ranks.map((r) => [r.id, r])) as Record<RankRule["id"], RankRule>;
export const rankIndex = (id: RankRule["id"]) => RANK_ORDER.indexOf(id);
