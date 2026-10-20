// Modelo de datos de entrada del motor. Todo lo que el plan no define se
// declara aquí como un supuesto con nombre, visible y editable en la interfaz.
import type { RankId } from "../plan/types";

/** Producto del catálogo. Los volúmenes NO están en las fuentes: los introduce el usuario. */
export interface Product {
  id: string;
  name: string;
  /** Volumen de calificación por unidad (cuenta para PV, QDV, OL2L y piernas). */
  qv: number | null;
  /** Volumen comisionable por unidad (base de los bonos en %). */
  cv: number | null;
  /** Margen minorista por unidad vendida a un cliente (precio de venta − tu costo). */
  retailMargin: number | null;
  /** Margen por unidad cuando compra un cliente preferente (si falta, se usa retailMargin). */
  preferredMargin?: number | null;
}

export interface OrderLine {
  productId: string;
  /** Unidades por mes. */
  qty: number;
}

export type PersonKind = "bp" | "cliente" | "cliente_preferente";

export interface Person {
  id: string;
  label: string;
  kind: PersonKind;
  /** Patrocinador (árbol de inscripción). null solo para la raíz. */
  sponsorId: string | null;
  /** Colocación en el binario (solo Brand Partners). */
  placement: { parentId: string; side: "L" | "R" } | null;
  orders: OrderLine[];
  /** Paquete de inscripción comprado en el periodo (genera PIB a su patrocinador). */
  enrollmentPackage?: string | null;
}

export type QualificationPeriod = "mensual" | "semanal";
export type OrderTiming = "uniforme" | "semana1" | "escalonado";

export interface Assumptions {
  /** Periodo de calificación de rangos (no indicado en las fuentes). */
  qualificationPeriod: QualificationPeriod;
  /** Cómo caen las compras mensuales en las semanas de pago. */
  orderTiming: OrderTiming;
  /** Región: la regla de 110 PV personales no aplica en APAC (PDF p.4). */
  region: "general" | "apac";
  /** Árbol en el que se cuentan las «líneas de negocio» para MVR y OL2L. */
  linesTree: "patrocinio" | "colocacion";
  /** Si tu propio PV suma a tu QDV. */
  includeOwnPvInQdv: boolean;
  /** Si el 10 % Personal Team incluye las compras de los clientes de tus patrocinados. */
  personalTeamIncludesCustomers: boolean;
  /** Supuesto: binario = % × volumen comisionable de la pierna menor de la semana, sin arrastre. */
  assumeBinary: boolean;
  /** Supuesto: Mentor Match = % × bono binario de cada BP por generación de patrocinio. */
  assumeMentor: boolean;
  /** Rango más alto alcanzado antes del periodo simulado (para el bono por subir de rango). */
  previousHighestRank: RankId | null;
  /** Días desde tu inscripción (para el bono duplicado de nuevos Brand Partners). */
  daysSinceEnrollment: number | null;
}

export const DEFAULT_ASSUMPTIONS: Assumptions = {
  qualificationPeriod: "mensual",
  orderTiming: "uniforme",
  region: "general",
  linesTree: "patrocinio",
  includeOwnPvInQdv: false,
  personalTeamIncludesCustomers: false,
  assumeBinary: false,
  assumeMentor: false,
  previousHighestRank: null,
  daysSinceEnrollment: null,
};

/** Grupo homogéneo de personas en el modo rápido. */
export interface Group {
  count: number;
  productId: string;
  /** Unidades por persona y mes. */
  qty: number;
}

export interface QuickOrg {
  personal: OrderLine[];
  /** Clientes personales que compran (minoristas o preferentes). */
  customers: (Group & { kind: "cliente" | "cliente_preferente" })[];
  /** Brand Partners patrocinados personalmente que compran. */
  sponsored: Group[];
  /** Brand Partners patrocinados personalmente que no compran en el periodo. */
  sponsoredInactive: number;
  /** Resto de la organización (generaciones 2 y siguientes) que compra. */
  team: Group[];
  /** Integrantes registrados del resto de la organización que no compran. */
  teamInactive: number;
  /** Reparto del volumen del equipo (patrocinados + resto). */
  distribution: {
    /** Número de líneas (personas patrocinadas que encabezan una línea). */
    lines: number;
    /** % del volumen del equipo en la línea más grande. */
    largestPct: number;
    /** % en la segunda línea más grande. */
    secondPct: number;
    /** % del volumen del equipo colocado en la pierna izquierda del binario. */
    leftPct: number;
    /**
     * Opcional: reparto exacto por grupos de líneas iguales (p. ej., 5 líneas
     * con equipo y 3 de una sola persona). `weight` es el peso relativo de cada
     * línea del grupo. Si está, sustituye a largestPct y secondPct.
     */
    groups?: { label: string; count: number; weight: number }[];
  };
  /** Inscripciones del periodo por paquete (PIB). */
  enrollments: { packageId: string; count: number }[];
}

export interface DetailedOrg {
  people: Person[];
}

export interface SimulationInput {
  mode: "rapido" | "detallado";
  products: Product[];
  quick?: QuickOrg;
  detailed?: DetailedOrg;
  assumptions: Assumptions;
}

export const ROOT_ID = "tu";
