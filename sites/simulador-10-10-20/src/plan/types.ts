// Tipos de las reglas versionadas del plan. Ninguna regla se escribe en el
// motor: el motor solo lee estos datos, así un cambio del plan es un cambio
// de datos (ver docs/ACTUALIZAR_PLAN.md).

export type RankId =
  | "abp"
  | "m1" | "m2" | "m3"
  | "d1" | "d2" | "d3"
  | "e1" | "e2" | "e3"
  | "p1" | "p2" | "p3";

/**
 * Estado de validación de una regla.
 * - confirmada: dato explícito en el PDF y coherente con la web.
 * - pdf: dato explícito solo en el PDF (la web no lo detalla o lo deja «por confirmar»).
 * - web: dato que solo aparece en la web (fuente secundaria).
 * - interpretacion: la fuente da el dato pero no su mecánica exacta; el simulador
 *   aplica una lectura literal que se explica y se puede cambiar.
 * - contradiccion: las fuentes dicen cosas distintas; se muestran ambas.
 * - pendiente: falta un dato crítico; no se calcula importe.
 */
export type RuleStatus = "confirmada" | "pdf" | "web" | "interpretacion" | "contradiccion" | "pendiente";

export interface SourceRef {
  /** "pdf" = «10-10-20 This Is It» (13 págs.); "web" = vivralux.com/nuevo-plan-compensacion-lifewave */
  doc: "pdf" | "web";
  /** Página del PDF o sección de la web. */
  where: string;
  /** Texto o dato tal como aparece. */
  quote?: string;
}

export interface Rule {
  id: string;
  concept: string;
  rule: string;
  formula: string;
  requirements: string;
  period: string;
  limits: string;
  sources: SourceRef[];
  status: RuleStatus;
  /** Diferencias entre fuentes o vacíos que afectan a la regla. */
  note?: string;
}

export interface RankRule {
  id: RankId;
  name: string;
  short: string;
  /** Volumen personal requerido (PV). */
  pv: number;
  /** Volumen de calificación de la organización (QDV), con la regla del 50 % por línea. */
  qdv: number | null;
  /** Volumen fuera de las dos líneas más grandes (OL2L). */
  ol2l: number | null;
  /** Equilibrio binario: volumen mínimo en cada pierna (lectura literal; ver regla). */
  binaryBalance: number | null;
  /** Porcentaje del bono binario por rango pagado. */
  binaryPct: number | null;
  /** Tope semanal del bono binario en USD. */
  binaryWeeklyCap: number | null;
  /** Porcentajes de Mentor Match por generación (Gen 1, Gen 2…). */
  mentorGens: number[];
  /** Tope de Mentor Match por Brand Partner (USD). */
  mentorCapPerBp: number | null;
  /** Bono por subir de rango (USD). */
  rankBonus: number | null;
  /** Participaciones del Grupo de Liderazgo Trimestral. */
  quarterlyShares: number | null;
}

export interface PlanRules {
  version: string;
  name: string;
  /** Fecha de vigencia publicada (null = no anunciada). */
  effectiveDate: string | null;
  market: string;
  currency: "USD";
  sourcesNote: string;
  ranks: RankRule[];
  /** Máximo del volumen requerido de QDV que puede venir de una sola línea. */
  maxVolumeRule: number;
  /** En rangos con PV 200, máximo que puede venir de compras personales (no aplica en APAC). */
  personalPvCapForPv200: number;
  personalTeamPct: number;
  customerBonusTiers: { minQv: number; maxQv: number | null; pct: number }[];
  customerBonusWindowDays: number;
  pib: { id: string; name: string; altName?: string; bonus: number; price: number | null }[];
  rankBonusDoubling: {
    pdf: { ranks: RankId[]; days: number; factor: number };
    web: { weeks: number; extraWeeksForFourth: number };
  };
  rules: Rule[];
}
