// Aritmética decimal: nada de coma flotante en volúmenes ni dinero.
import Decimal from "decimal.js-light";

Decimal.config({ precision: 40, rounding: Decimal.ROUND_HALF_UP });

export { Decimal };
export type D = Decimal;

export const d = (v: number | string | Decimal | null | undefined): Decimal => new Decimal(v ?? 0);
export const ZERO = new Decimal(0);
export const sum = (xs: Decimal[]): Decimal => xs.reduce((a, b) => a.plus(b), ZERO);
export const min = (a: Decimal, b: Decimal): Decimal => (a.lt(b) ? a : b);
export const max = (a: Decimal, b: Decimal): Decimal => (a.gt(b) ? a : b);
export const pct = (base: Decimal, percent: number): Decimal => base.times(percent).dividedBy(100);

/**
 * Redondeo de importes a centavos (mitad hacia arriba). Las fuentes no indican
 * en qué punto redondea LifeWave: el simulador redondea cada componente y
 * cada semana una sola vez, al final de su cálculo, y lo declara.
 */
export const cents = (x: Decimal): Decimal => x.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

/** Semanas por mes en promedio anual. */
export const WEEKS_PER_MONTH = new Decimal(52).dividedBy(12);

const usdFmt = new Intl.NumberFormat("es-419", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const numFmt = new Intl.NumberFormat("es-419", { maximumFractionDigits: 2 });

export const usd = (x: Decimal | number | null | undefined): string =>
  x == null ? "—" : usdFmt.format(Number(x instanceof Decimal ? cents(x).toString() : x));
export const vol = (x: Decimal | number | null | undefined): string =>
  x == null ? "—" : numFmt.format(Number(x instanceof Decimal ? x.toDecimalPlaces(2).toString() : x));
