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
 * - oficial: dato explícito en la tabla oficial del plan (EE. UU.).
 * - confirmada: dato explícito en el PDF y coherente con la web.
 * - pdf: dato explícito solo en el PDF (la web no lo detalla o lo deja «por confirmar»).
 * - web: dato que solo aparece en la web (fuente secundaria).
 * - interpretacion: la fuente da el dato pero no su mecánica exacta; el simulador
 *   aplica una lectura literal que se explica y se puede cambiar.
 * - contradiccion: las fuentes dicen cosas distintas; se muestran ambas.
 * - pendiente: falta un dato crítico; no se calcula importe.
 */
export type RuleStatus = "oficial" | "confirmada" | "pdf" | "web" | "interpretacion" | "contradiccion" | "pendiente";

export interface SourceRef {
  /**
   * "oficial" = «Plan de Compensación LifeWave 10-10-20 (EE. UU.)», 2 págs. (fuente principal).
   * "pdf" = presentación «10-10-20 This Is It» (13 págs.); "web" = vivralux.com/nuevo-plan-compensacion-lifewave.
   */
  doc: "oficial" | "pdf" | "web";
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
  /** Volumen de calificación de la organización (QDV). */
  qdv: number | null;
  /** Regla de volumen máximo: lo máximo que cuenta de una sola línea (null = no aplica). */
  mvr: number | null;
  /** Volumen fuera de las dos líneas más grandes (OL2L). */
  ol2l: number | null;
  /** Equilibrio binario: volumen mínimo en cada pierna (lectura literal; ver regla). */
  binaryBalance: number | null;
  /** Bono de Nivel Comprimido (10 % Personal Team) por rango; null = celda vacía en la tabla oficial. */
  levelPct: number | null;
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
  /** Premio no monetario por rango (viajes, fondo global). */
  rankReward: string | null;
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
  /** Fracción del QDV que representa la MVR (las cifras exactas están en cada rango). */
  maxVolumeRule: number;
  /** En rangos con PV 200, máximo que puede venir de compras personales (no aplica en APAC). */
  personalPvCapForPv200: number;
  personalTeamPct: number;
  customerBonusTiers: { minQv: number; maxQv: number | null; pct: number }[];
  customerBonusWindowDays: number;
  pib: { id: string; name: string; altName?: string; bonus: number; price: number | null; qv: number | null; sleeves: string | null }[];
  /** PV mínimo para cobrar el PIB (estar Activo). */
  pibMinPv: number;
  rankBonusDoubling: {
    ranks: RankId[];
    /** Parte 1 se duplica si el rango se alcanza dentro de estas semanas desde la inscripción. */
    part1Weeks: number;
    /** Parte 2 se duplica si las semanas de recalificación se completan dentro de este plazo. */
    part2RequalWeeks: number;
    part2WithinWeeks: number;
  };
  rules: Rule[];
}
