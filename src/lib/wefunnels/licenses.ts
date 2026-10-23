export type LicenseRow = {
  license_source: string | null;
  license_price_usd: number | null;
  created_at: string;
  refunded_at: string | null;
};

export type LicenseRevenue = {
  total: number;
  thisMonth: number;
  sold: number;
  publicCount: number;
  invitedCount: number;
  granted: number;
  refunded: number;
};

// Lo que han dejado las licencias, en limpio.
//
// Tres cosas que este cálculo hace a propósito:
//
// Las regaladas no suman nunca. Llevan license_price_usd nulo porque
// nadie pagó (20261007000011), y meterlas al precio público inventaría
// ingresos que no existen.
//
// Las devueltas tampoco. La suspensión de la cuenta no vale de
// sustituto --- también se suspende a mano, por motivos que no son una
// devolución ---, así que lo que manda es refunded_at (20261023000002).
//
// Y «este mes» va al lado del total de siempre porque un total de pagos
// únicos solo sube: como titular deja de decir nada a los dos meses,
// mientras que lo que entró este mes sí cambia.
export function describeLicenseRevenue(rows: LicenseRow[]): LicenseRevenue {
  // El reloj se lee aquí dentro, no en el componente: react-hooks/purity
  // prohíbe Date.now() en el cuerpo de uno.
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  let total = 0;
  let thisMonth = 0;
  let sold = 0;
  let publicCount = 0;
  let invitedCount = 0;
  let granted = 0;
  let refunded = 0;

  for (const row of rows) {
    if (row.license_source === "granted" || row.license_price_usd == null) {
      granted++;
      continue;
    }
    if (row.refunded_at) {
      refunded++;
      continue;
    }
    const price = Number(row.license_price_usd);
    total += price;
    sold++;
    if (row.license_source === "invited") invitedCount++;
    else publicCount++;
    if (new Date(row.created_at).getTime() >= monthStart.getTime()) thisMonth += price;
  }

  return { total, thisMonth, sold, publicCount, invitedCount, granted, refunded };
}
