// Volúmenes de un Brand Partner en una ventana de tiempo. Los dos modos
// (rápido y detallado) producen esta misma estructura y el resto del motor
// solo trabaja con ella.
import { d, type D, ZERO } from "./decimal";
import type { OrderTiming, Product, OrderLine } from "./model";

/** Ventana: "m" = el mes completo; 0..3 = semanas de pago del mes de referencia. */
export type WindowId = "m" | 0 | 1 | 2 | 3;
export const WEEKS: WindowId[] = [0, 1, 2, 3];

export interface Snapshot {
  /** Volumen de calificación de tus compras personales. */
  ownQv: D;
  /** Volumen de calificación de tus clientes personales. */
  customersQv: D;
  /** Volumen comisionable de tus clientes personales. */
  customersCv: D;
  /** Unidades compradas por tus clientes personales (para el margen minorista). */
  customerUnits: { productId: string; qty: D }[];
  /** Volumen de calificación de cada línea (para MVR y OL2L). `count` agrupa líneas idénticas. */
  lines: { label: string; qv: D; count: number }[];
  /** Piernas del binario: volumen de calificación y comisionable. */
  legs: { L: D; R: D; Lcv: D; Rcv: D };
  /** Volumen comisionable de tus Brand Partners patrocinados personalmente (base del 10 %). */
  sponsoredCv: D;
  /** Volumen comisionable de los clientes de tus patrocinados (opcional en el 10 %). */
  sponsoredCustomersCv: D;
}

export const emptySnapshot = (): Snapshot => ({
  ownQv: ZERO, customersQv: ZERO, customersCv: ZERO, customerUnits: [], lines: [],
  legs: { L: ZERO, R: ZERO, Lcv: ZERO, Rcv: ZERO }, sponsoredCv: ZERO, sponsoredCustomersCv: ZERO,
});

/**
 * Reparte una cantidad mensual en la ventana pedida.
 * - "m": el total del mes.
 * - uniforme: promedio anual por semana = mensual × 12 / 52 (cada semana igual).
 * - semana1: todo en la semana 1 del mes.
 * - escalonado: la persona n compra en la semana (n mod 4) + 1.
 */
export function share(monthly: D, window: WindowId, timing: OrderTiming, index: number): D {
  if (window === "m") return monthly;
  if (timing === "uniforme") return monthly.times(12).dividedBy(52);
  if (timing === "semana1") return window === 0 ? monthly : ZERO;
  return index % 4 === window ? monthly : ZERO;
}

/** Para grupos de N personas iguales: cuántas compran en cada ventana. */
export function groupCount(count: number, window: WindowId, timing: OrderTiming): D {
  if (window === "m") return d(count);
  if (timing === "uniforme") return d(count).times(12).dividedBy(52);
  if (timing === "semana1") return window === 0 ? d(count) : ZERO;
  // escalonado: la persona n compra en la semana n mod 4
  const base = Math.floor(count / 4);
  return d(base + (window < count % 4 ? 1 : 0));
}

export interface ProductIndex { [id: string]: Product }

export const productIndex = (products: Product[]): ProductIndex => Object.fromEntries(products.map((p) => [p.id, p]));

/** Productos usados que no tienen volumen definido (bloquean el cálculo). */
export function missingVolumes(lines: OrderLine[], idx: ProductIndex): string[] {
  const out = new Set<string>();
  for (const l of lines) {
    if (l.qty <= 0) continue;
    const p = idx[l.productId];
    if (!p) out.add(`producto «${l.productId}» no existe en el catálogo`);
    else if (p.qv == null || p.cv == null) out.add(`volumen de «${p.name}»`);
  }
  return [...out];
}

export const qvOf = (lines: OrderLine[], idx: ProductIndex): D =>
  lines.reduce((a, l) => a.plus(d(idx[l.productId]?.qv ?? 0).times(l.qty)), ZERO);
export const cvOf = (lines: OrderLine[], idx: ProductIndex): D =>
  lines.reduce((a, l) => a.plus(d(idx[l.productId]?.cv ?? 0).times(l.qty)), ZERO);
