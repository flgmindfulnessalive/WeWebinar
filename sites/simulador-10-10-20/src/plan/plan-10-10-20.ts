// Plan 10·10·20 — reglas extraídas de las dos fuentes entregadas:
//   PDF: «10-10-20 This Is It» (13 págs., Canva, creado el 08-oct-2026).
//   WEB: vivralux.com/nuevo-plan-compensacion-lifewave («Ten · Ten · Twenty»).
// No se usan reglas de planes anteriores ni cifras genéricas del sector.
// Cada cifra cita su página o sección. Ver docs/MATRIZ_REGLAS.md.
import type { PlanRules, RankRule } from "./types";

const P = (where: string, quote?: string) => ({ doc: "pdf" as const, where, quote });
const W = (where: string, quote?: string) => ({ doc: "web" as const, where, quote });

const ranks: RankRule[] = [
  { id: "abp", name: "Brand Partner Activo", short: "BP Activo", pv: 55, qdv: null, ol2l: null, binaryBalance: null, binaryPct: null, binaryWeeklyCap: null, mentorGens: [], mentorCapPerBp: null, rankBonus: null, quarterlyShares: null },
  { id: "m1", name: "Manager 1 Estrella", short: "1★ Manager", pv: 75, qdv: 750, ol2l: null, binaryBalance: null, binaryPct: 10, binaryWeeklyCap: 100, mentorGens: [], mentorCapPerBp: null, rankBonus: null, quarterlyShares: null },
  { id: "m2", name: "Manager 2 Estrellas", short: "2★ Manager", pv: 75, qdv: 1500, ol2l: null, binaryBalance: null, binaryPct: 10, binaryWeeklyCap: 500, mentorGens: [], mentorCapPerBp: null, rankBonus: 100, quarterlyShares: null },
  { id: "m3", name: "Manager 3 Estrellas", short: "3★ Manager", pv: 75, qdv: 2500, ol2l: null, binaryBalance: null, binaryPct: 10, binaryWeeklyCap: 1500, mentorGens: [], mentorCapPerBp: null, rankBonus: 250, quarterlyShares: null },
  { id: "d1", name: "Director 1 Estrella", short: "1★ Director", pv: 110, qdv: 5000, ol2l: null, binaryBalance: 1000, binaryPct: 11, binaryWeeklyCap: 2500, mentorGens: [20], mentorCapPerBp: 250, rankBonus: 500, quarterlyShares: null },
  { id: "d2", name: "Director 2 Estrellas", short: "2★ Director", pv: 110, qdv: 10000, ol2l: null, binaryBalance: 2000, binaryPct: 11, binaryWeeklyCap: 3500, mentorGens: [20, 15], mentorCapPerBp: 500, rankBonus: 1000, quarterlyShares: null },
  { id: "d3", name: "Director 3 Estrellas", short: "3★ Director", pv: 110, qdv: 20000, ol2l: null, binaryBalance: 3000, binaryPct: 11, binaryWeeklyCap: 5000, mentorGens: [20, 15, 10], mentorCapPerBp: 1000, rankBonus: 2000, quarterlyShares: null },
  { id: "e1", name: "Ejecutivo 1 Estrella", short: "1★ Ejecutivo", pv: 200, qdv: 40000, ol2l: 5000, binaryBalance: 5000, binaryPct: 12, binaryWeeklyCap: 7500, mentorGens: [20, 15, 10, 7], mentorCapPerBp: 2000, rankBonus: 5000, quarterlyShares: null },
  { id: "e2", name: "Ejecutivo 2 Estrellas", short: "2★ Ejecutivo", pv: 200, qdv: 100000, ol2l: 10000, binaryBalance: 10000, binaryPct: 12, binaryWeeklyCap: 10000, mentorGens: [20, 15, 10, 7, 7], mentorCapPerBp: 3000, rankBonus: null, quarterlyShares: null },
  { id: "e3", name: "Ejecutivo 3 Estrellas", short: "3★ Ejecutivo", pv: 200, qdv: 200000, ol2l: 15000, binaryBalance: 15000, binaryPct: 12, binaryWeeklyCap: 15000, mentorGens: [20, 15, 10, 7, 7, 5], mentorCapPerBp: 4000, rankBonus: null, quarterlyShares: null },
  { id: "p1", name: "Presidencial 1 Estrella", short: "1★ Presidencial", pv: 200, qdv: 400000, ol2l: 50000, binaryBalance: 20000, binaryPct: 13, binaryWeeklyCap: 20000, mentorGens: [20, 15, 10, 7, 7, 5], mentorCapPerBp: 5000, rankBonus: null, quarterlyShares: 1 },
  { id: "p2", name: "Presidencial 2 Estrellas", short: "2★ Presidencial", pv: 200, qdv: 1000000, ol2l: 100000, binaryBalance: 25000, binaryPct: 13, binaryWeeklyCap: 25000, mentorGens: [20, 15, 10, 7, 7, 7], mentorCapPerBp: 5000, rankBonus: null, quarterlyShares: 5 },
  { id: "p3", name: "Presidencial 3 Estrellas", short: "3★ Presidencial", pv: 200, qdv: 2500000, ol2l: 200000, binaryBalance: 30000, binaryPct: 13, binaryWeeklyCap: 25000, mentorGens: [20, 15, 10, 7, 7, 7], mentorCapPerBp: 5000, rankBonus: null, quarterlyShares: 15 },
];

export const PLAN: PlanRules = {
  version: "10-10-20 · fuentes de oct-2026",
  name: "Plan de Compensación 10·10·20 (LifeWave)",
  effectiveDate: null,
  market: "No indicado. Importes en USD; la regla de PV 200 excluye la región APAC (PDF p.4). La divulgación de ganancias es de EE. UU. 2024 (PDF p.2).",
  currency: "USD",
  sourcesNote:
    "El PDF es una presentación («This Is It», Canva, 08-oct-2026), no la guía oficial. La web es material educativo independiente (VIVRALUX) que compara el Plan 2.0 con lo anunciado en el webinar de líderes. Ninguna de las dos publica fecha de entrada en vigor; la web indica que LifeWave publicará la guía oficial al lanzamiento.",
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
    { id: "basico", name: "Paquete Básico", altName: "Core", bonus: 35, price: 295 },
    { id: "avanzado", name: "Paquete Avanzado", altName: "Advanced", bonus: 75, price: 535 },
    { id: "avanzado-plus", name: "Paquete Avanzado Plus", altName: "Advanced Plus", bonus: 165, price: 975 },
    { id: "premium", name: "Paquete Premium", altName: "Premium", bonus: 405, price: 1750 },
  ],
  rankBonusDoubling: {
    pdf: { ranks: ["m2", "m3", "d1"], days: 60, factor: 2 },
    web: { weeks: 8, extraWeeksForFourth: 8 },
  },
  rules: [
    {
      id: "ranks", concept: "Camino al éxito (rangos)",
      rule: "13 rangos, de BP Activo a 3★ Presidencial, con requisitos de PV, QDV, OL2L y equilibrio binario.",
      formula: "Rango = el más alto cuyos requisitos se cumplen todos en el periodo de calificación.",
      requirements: "PV · QDV (con regla del 50 %) · OL2L desde 1★ Ejecutivo · equilibrio binario desde 1★ Director.",
      period: "No indicado en las fuentes (pendiente).", limits: "Ver reglas de volumen máximo y PV personal.",
      sources: [P("p.4 · Camino al éxito"), W("05 · Success Path y 06 · Menos barreras")], status: "pdf",
      note: "La web solo confirma 3★ Ejecutivo (OL2L 15 000 y equilibrio 15 000) y deja el resto «por confirmar»; el PDF da la tabla completa. Las líneas de volumen quedan eliminadas (web 06).",
    },
    {
      id: "pv", concept: "PV (volumen personal)",
      rule: "BP Activo 55 · Managers 75 · Directores 110 · Ejecutivos y Presidenciales 200.",
      formula: "PV = compras personales + compras de tus clientes (ver nota de la regla de 110).",
      requirements: "—", period: "Pendiente.", limits: "En rangos de PV 200, máximo 110 de compras personales, salvo APAC.",
      sources: [P("p.4", "**Máximo de 110 pueden provenir de compras personales – excluyendo la región APAC")], status: "pdf",
      note: "La web muestra los valores del plan anterior (110 para Managers) y dice «Ver back office». La composición exacta del PV (qué compras de clientes cuentan) no está definida.",
    },
    {
      id: "mvr", concept: "Regla de volumen máximo (MVR)",
      rule: "Máximo el 50 % del volumen requerido puede provenir de una sola línea de negocio.",
      formula: "QDV contable = Σ por línea de mín(volumen de la línea; 50 % × QDV requerido).",
      requirements: "—", period: "Igual que la calificación.", limits: "50 % por línea.",
      sources: [P("p.4", "*Regla de volumen máximo: un máximo del 50% del volumen requerido puede provenir de una sola línea de negocio."), W("05 · MVR", "La regla sigue igual")], status: "confirmada",
      note: "«Línea de negocio» no se define (árbol de patrocinio o de colocación). El simulador permite elegir y por defecto usa patrocinio.",
    },
    {
      id: "ol2l", concept: "OL2L",
      rule: "Volumen fuera de las dos líneas más grandes, desde 1★ Ejecutivo: 5 000 · 10 000 · 15 000 · 50 000 · 100 000 · 200 000.",
      formula: "OL2L = QDV total − volumen de las 2 líneas más grandes.",
      requirements: "Desde 1★ Ejecutivo.", period: "Pendiente.", limits: "—",
      sources: [P("p.4"), W("06 · OL2L 3★ Ejecutivo 15,000")], status: "pdf",
      note: "La definición (fuera de las 2 líneas más grandes) se deduce del nombre; las fuentes no la detallan.",
    },
    {
      id: "balance", concept: "Equilibrio binario (requisito de rango)",
      rule: "Desde 1★ Director: 1 000 · 2 000 · 3 000 · 5 000 · 10 000 · 15 000 · 20 000 · 25 000 · 30 000.",
      formula: "Lectura literal: volumen de la pierna menor del binario ≥ requisito.",
      requirements: "Desde 1★ Director.", period: "Pendiente.", limits: "—",
      sources: [P("p.4"), W("06 · Equilibrio binario 3★ Ejecutivo 15,000")], status: "interpretacion",
      note: "Ninguna fuente define cómo se mide el equilibrio. Para 3★ Ejecutivo la web cita «de 30,000 a 15,000» en el webinar frente a 40,000 en el PDF del Plan 2.0; el nuevo valor (15 000) coincide en ambas fuentes.",
    },
    {
      id: "pib", concept: "Bono de Introducción de Producto (PIB)",
      rule: "Al inscribir Brand Partners: Básico $35 · Avanzado $75 · Avanzado Plus $165 · Premium $405, por paquete.",
      formula: "PIB = Σ bono del paquete de cada Brand Partner inscrito.",
      requirements: "No indicados (quién lo cobra exactamente y si exige estar activo).", period: "Por inscripción.", limits: "Por paquete.",
      sources: [P("p.5"), W("09 · Lo que no cambió", "$35 Core · $75 Advanced · $165 Advanced Plus · $405 Premium")], status: "confirmada",
      note: "Puntual: depende de nuevas inscripciones, no de compras repetidas. El PDF llama «Básico» al paquete que la web llama «Core»; los precios de los paquetes solo figuran en la web (plan anterior) y son orientativos.",
    },
    {
      id: "personal-team", concept: "Bono por nivel alcanzado / Personal Team (10 %)",
      rule: "10 % «patrocinado personalmente», en todos los rangos; genera ingresos sin completar ciclos; diseñado para nuevos inscritos.",
      formula: "10 % × volumen comisionable de tus Brand Partners patrocinados personalmente (1 generación).",
      requirements: "«En todos los rangos» (PDF p.8): el simulador exige al menos BP Activo.", period: "No indicado.", limits: "Sin tope publicado.",
      sources: [P("p.3", "Gana PIB + Gana un 10% Patrocinado personalmente"), P("p.8", "Bono por nivel alcanzado: 10% en todos los rangos"), W("04 · 10% Personal Team (1 generación)")], status: "interpretacion",
      note: "Las fuentes no dicen sobre qué tipo de volumen se calcula ni si incluye a los clientes de tus patrocinados. Mínimo de rango: la web dice «se confirmará con la guía».",
    },
    {
      id: "binary", concept: "Bono Binario",
      rule: "Porcentaje por rango pagado: Managers 10 % · Directores 11 % · Ejecutivos 12 % · Presidenciales 13 %, con tope semanal de $100 a $25 000.",
      formula: "PENDIENTE: las fuentes no dicen sobre qué volumen se aplica el porcentaje (p. ej. pierna menor), ni si hay arrastre o mínimo por pierna.",
      requirements: "Rango pagado desde 1★ Manager.", period: "Semanal (PDF p.9).", limits: "Tope semanal por rango (PDF p.9).",
      sources: [P("p.3", "Gana un 10% en el equipo binario (hasta $25,000 por semana)"), P("p.9 · tabla de rango pagado"), W("04 · Binario por rango", "Los topes semanales y el mínimo de 300 BV no se detallaron")], status: "pendiente",
      note: "La web dice que los topes semanales no se detallaron; el PDF sí los da. El simulador solo calcula el binario si activas un supuesto explícito (pierna menor, sin arrastre) y lo marca como hipotético.",
    },
    {
      id: "mentor", concept: "Bono de Igualación de Mentores (Mentor Match)",
      rule: "Gen 1 20 % desde 1★ Director; hasta 6 generaciones; tope por BP de $250 a $5 000.",
      formula: "PENDIENTE: las fuentes no dicen qué ganancias se igualan ni cómo se cuentan las generaciones.",
      requirements: "Desde 1★ Director.", period: "No indicado.", limits: "Tope por Brand Partner igualado (PDF p.10).",
      sources: [P("p.10 · tabla Gen 1–6"), P("p.3", "Gana un 20% Programa de mentoría (hasta $5,000 por persona)"), W("04 · Mentor Match por rango", "Los porcentajes de Gen 2 en adelante… quedan por confirmar")], status: "pendiente",
      note: "El PDF da Gen 2–6 y topes; la web los deja «por confirmar». Solo se calcula con supuestos explícitos activados y en modo detallado.",
    },
    {
      id: "customer", concept: "Bono para el cliente (Customer Premium)",
      rule: "Hasta 20 % con tus clientes. Tramos (web): 300–599 QV 5 % · 600–1 199 QV 10 % · 1 200+ QV 20 %, en 31 días.",
      formula: "Tramo según el volumen de tus clientes personales en 31 días; el simulador aplica el % a ese mismo volumen comisionable (supuesto).",
      requirements: "No indicados.", period: "31 días (web).", limits: "Máximo 20 %.",
      sources: [P("p.3", "Gana hasta un 20% con tus clientes."), W("09 · Lo que no cambió", "Customer Bonus 5% · 10% · 20% según QV de clientes en 31 días")], status: "web",
      note: "Los tramos solo están en la web, que los toma del Plan 2.0 e indica que se mantienen según el webinar. La base exacta del porcentaje no está definida.",
    },
    {
      id: "rank-bonus", concept: "Bono por subir de rango",
      rule: "2★ Manager $100 · 3★ Manager $250 · 1★ Director $500 · 2★ Director $1 000 · 3★ Director $2 000 · 1★ Ejecutivo $5 000.",
      formula: "Acumulativo por cada rango nuevo alcanzado. Se paga en dos mitades: la 1.ª vez que calificas y la 4.ª vez (web).",
      requirements: "Alcanzar el rango por primera vez.", period: "Puntual.", limits: "Una vez por rango.",
      sources: [P("p.6"), W("07 · Rank Advancement", "Se sigue pagando en dos mitades: la primera vez que calificas y la cuarta vez")], status: "confirmada",
      note: "La web asigna $1 000/$2 000/$5 000 «por el orden en que se dijeron»; el PDF los confirma por rango. El pago en dos mitades solo figura en la web. Los bonos Presidenciales se eliminan (web 08).",
    },
    {
      id: "rank-double", concept: "Bono por subir de rango duplicado (nuevos BP)",
      rule: "PDF: se duplica al alcanzar un nuevo rango en los primeros 60 días (2★M $200 · 3★M $500 · 1★D $1 000). Web: en las primeras 8 semanas se cobra el bono completo en la 1.ª calificación en lugar de la mitad, más 8 semanas extra para la 4.ª.",
      formula: "Se muestran ambas lecturas; no se suma ninguna como definitiva.",
      requirements: "Brand Partner nuevo.", period: "60 días (PDF) / 8 + 8 semanas (web).", limits: "2★ Manager, 3★ Manager y 1★ Director (PDF).",
      sources: [P("p.7", "La oportunidad de bonificación se duplica al alcanzar un nuevo rango en los primeros 60 días"), W("07 · Arranque rápido", "cobras $100 completos en lugar de $50")], status: "contradiccion",
      note: "Contradicción: el PDF muestra $100 → $200; la web describe $50 → $100 (adelantar la segunda mitad). También difiere el plazo: 60 días frente a 8 semanas (56 días).",
    },
    {
      id: "quarterly", concept: "Grupo de Liderazgo Trimestral",
      rule: "1 participación por cada 20 000 de volumen por encima de tu base de referencia; 5 por cada 100 000 en tu equipo de inscripción (el primer equipo no califica). 1★P 1 · 2★P 5 · 3★P 15 acciones.",
      formula: "PENDIENTE: no se publica el tamaño del fondo ni el valor de cada participación.",
      requirements: "Presidenciales.", period: "Trimestral.", limits: "—",
      sources: [P("p.11"), W("08 · Presidential", "3★ Presidential: 15 shares por semana. Las cifras de 1★P y 2★P se confirmarán")], status: "contradiccion",
      note: "La web describe participaciones «cada semana pagada como Presidencial» y presenta el criterio de 20 000 / 100 000 como del plan anterior; el PDF lo mantiene. El simulador cuenta participaciones, nunca dinero.",
    },
    {
      id: "retail", concept: "Margen de venta minorista",
      rule: "Aplicar un margen de beneficio minorista a los productos que vendes a tus clientes.",
      formula: "Margen = (precio de venta − tu costo) × unidades. Los precios no están en las fuentes: los introduces tú.",
      requirements: "—", period: "Por venta.", limits: "—",
      sources: [P("p.2 · Divulgación de ganancias", "Aplicar un margen de beneficio minorista a los productos LifeWave que venda a sus clientes."), W("09", "Ganancia por ventas directas: según lista de precios")], status: "pendiente",
      note: "Sin lista de precios en las fuentes. Solo se calcula si introduces el margen por sobre.",
    },
    {
      id: "active", concept: "Brand Partner activo",
      rule: "BP Activo = 55 PV (tabla de rangos). La divulgación de ganancias usa otra definición: haber comprado, patrocinado o cobrado comisiones durante el año.",
      formula: "Activo en el simulador = PV ≥ 55 en el periodo de calificación.",
      requirements: "—", period: "Pendiente.", limits: "—",
      sources: [P("p.4 · BP Active 55"), P("p.2", "Un «Socio de Marca LifeWave activo» es un Socio de Marca LifeWave que ha comprado productos, patrocinado a otro Socio de Marca LifeWave o ganado comisiones durante 2024.")], status: "interpretacion",
    },
    {
      id: "fees", concept: "Inscripción y renovación",
      rule: "Inscripción $25 y renovación anual $25; no es necesario comprar productos para ser o seguir siendo Brand Partner. No se gana por solo patrocinar.",
      formula: "—", requirements: "—", period: "Anual.", limits: "—",
      sources: [P("p.2", "La cuota de inscripción es de 25 dólares, con una cuota de renovación anual de 25 dólares."), P("p.2", "no puedes ganar comisiones simplemente patrocinando o reclutando a otras personas.")], status: "pdf",
    },
  ],
};

export const RANK_ORDER = PLAN.ranks.map((r) => r.id);
export const rankById = Object.fromEntries(PLAN.ranks.map((r) => [r.id, r])) as Record<RankRule["id"], RankRule>;
export const rankIndex = (id: RankRule["id"]) => RANK_ORDER.indexOf(id);
