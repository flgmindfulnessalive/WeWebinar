// Modo rápido: organización agregada. Solo produce lo que puede determinarse
// con datos agregados; el reparto por líneas y piernas lo declara el usuario.
import { d, ZERO, type D } from "./decimal";
import type { Assumptions, QuickOrg } from "./model";
import { emptySnapshot, groupCount, missingVolumes, qvOf, share, type ProductIndex, type Snapshot, type WindowId } from "./snapshot";

export interface PeopleCounts {
  /** Personas que compran en el mes (clientes + Brand Partners, incluido tú). */
  activeBuyers: number;
  personalCustomers: number;
  sponsoredPersonally: number;
  sponsoredBuying: number;
  /** Brand Partners de toda la organización (sin contarte a ti). */
  organizationMembers: number;
  /** Personas registradas (Brand Partners + clientes, incluido tú). */
  registered: number;
  /** Brand Partners con PV ≥ 55 en el mes (incluido tú). */
  meetingActivity: number;
  totalUnits: number;
}

export function validateQuick(q: QuickOrg): string[] {
  const errs: string[] = [];
  const nonNeg = (v: number, what: string) => { if (!(v >= 0) || !Number.isFinite(v)) errs.push(`${what} debe ser un número ≥ 0.`); };
  const intg = (v: number, what: string) => { if (!Number.isInteger(v)) errs.push(`${what} debe ser un número entero.`); };
  for (const l of q.personal) nonNeg(l.qty, "Tus unidades");
  for (const g of [...q.customers, ...q.sponsored, ...q.team]) { nonNeg(g.count, "Personas"); intg(g.count, "Personas"); nonNeg(g.qty, "Unidades"); }
  nonNeg(q.sponsoredInactive, "Patrocinados sin compra"); intg(q.sponsoredInactive, "Patrocinados sin compra");
  nonNeg(q.teamInactive, "Integrantes sin compra"); intg(q.teamInactive, "Integrantes sin compra");
  const { lines, largestPct, secondPct, leftPct } = q.distribution;
  const sponsoredTotal = q.sponsored.reduce((a, g) => a + g.count, 0) + q.sponsoredInactive;
  const teamBuyers = q.team.reduce((a, g) => a + g.count, 0);
  if (!Number.isInteger(lines) || lines < 0) errs.push("El número de líneas debe ser un entero ≥ 0.");
  if (lines > sponsoredTotal) errs.push(`No puede haber más líneas (${lines}) que Brand Partners patrocinados personalmente (${sponsoredTotal}): cada línea empieza en un patrocinado.`);
  if (teamBuyers > 0 && sponsoredTotal === 0) errs.push("Hay compradores en tu organización pero ningún Brand Partner patrocinado personalmente: alguien tiene que encabezar cada línea.");
  const groups = q.distribution.groups?.filter((g) => g.count > 0 && g.weight > 0);
  if (groups?.length) {
    if (!(leftPct >= 0 && leftPct <= 100)) errs.push("% de la pierna izquierda debe estar entre 0 y 100.");
    return errs;
  }
  for (const [v, w] of [[largestPct, "% de la línea más grande"], [secondPct, "% de la segunda línea"], [leftPct, "% de la pierna izquierda"]] as const) {
    if (!(v >= 0 && v <= 100)) errs.push(`${w} debe estar entre 0 y 100.`);
  }
  if (lines === 1 && largestPct !== 100) errs.push("Con una sola línea, esa línea tiene el 100 % del volumen.");
  if (lines >= 2 && largestPct + secondPct > 100) errs.push("La línea más grande y la segunda no pueden sumar más del 100 %.");
  if (lines === 2 && largestPct + secondPct !== 100) errs.push("Con dos líneas, entre ambas suman el 100 % del volumen.");
  if (secondPct > largestPct) errs.push("La segunda línea no puede ser mayor que la más grande.");
  if (lines > 2) {
    const rest = (100 - largestPct - secondPct) / (lines - 2);
    if (rest > secondPct + 1e-9) errs.push(`Con ese reparto, cada una de las otras ${lines - 2} líneas tendría ${rest.toFixed(1)} %, más que la segunda línea.`);
  }
  return errs;
}

export function quickMissing(q: QuickOrg, idx: ProductIndex): string[] {
  const lines = [
    ...q.personal,
    ...[...q.customers, ...q.sponsored, ...q.team].filter((g) => g.count > 0).map((g) => ({ productId: g.productId, qty: g.qty })),
  ];
  return missingVolumes(lines, idx);
}

const groupVol = (groups: { count: number; productId: string; qty: number }[], w: WindowId, a: Assumptions, idx: ProductIndex, key: "qv" | "cv"): D =>
  groups.reduce((acc, g) => acc.plus(groupCount(g.count, w, a.orderTiming).times(g.qty).times(d(idx[g.productId]?.[key] ?? 0))), ZERO);

export function quickSnapshot(q: QuickOrg, w: WindowId, a: Assumptions, idx: ProductIndex): Snapshot {
  const s = emptySnapshot();
  s.ownQv = share(qvOf(q.personal, idx), w, a.orderTiming, 0);
  s.customersQv = groupVol(q.customers, w, a, idx, "qv");
  s.customersCv = groupVol(q.customers, w, a, idx, "cv");
  s.customerUnits = q.customers.map((g) => ({ productId: g.productId, qty: groupCount(g.count, w, a.orderTiming).times(g.qty), kind: g.kind }));
  const teamQv = groupVol([...q.sponsored, ...q.team], w, a, idx, "qv");
  const teamCv = groupVol([...q.sponsored, ...q.team], w, a, idx, "cv");
  s.sponsoredCv = groupVol(q.sponsored, w, a, idx, "cv");
  // Modo rápido: los clientes de tus patrocinados no se modelan por separado.
  s.sponsoredCustomersCv = ZERO;

  const { lines, largestPct, secondPct, leftPct } = q.distribution;
  const groups = q.distribution.groups?.filter((g) => g.count > 0 && g.weight > 0);
  if (groups?.length) {
    // Reparto por grupos: el último se calcula por diferencia para que la suma sea exacta.
    const totalW = groups.reduce((a, g) => a + g.count * g.weight, 0);
    let used = ZERO;
    s.lines = groups.map((g, i) => {
      const total = i === groups.length - 1 ? teamQv.minus(used) : teamQv.times(g.count * g.weight).dividedBy(totalW);
      used = used.plus(total);
      return { label: g.label, qv: total.dividedBy(g.count), count: g.count, total };
    });
  } else if (lines >= 1) {
    const l1 = lines === 1 ? teamQv : teamQv.times(largestPct).dividedBy(100);
    const l2 = lines >= 2 ? (lines === 2 ? teamQv.minus(l1) : teamQv.times(secondPct).dividedBy(100)) : ZERO;
    const out = [{ label: "Línea 1 (la más grande)", qv: l1, count: 1, total: l1 }];
    if (lines >= 2) out.push({ label: "Línea 2", qv: l2, count: 1, total: l2 });
    if (lines > 2) {
      // El resto se calcula por diferencia para que la suma sea exacta.
      const rest = teamQv.minus(l1).minus(l2);
      out.push({ label: lines === 3 ? "Línea 3" : `Líneas 3 a ${lines} (cada una)`, qv: rest.dividedBy(lines - 2), count: lines - 2, total: rest });
    }
    s.lines = out;
  }
  s.legs = {
    L: teamQv.times(leftPct).dividedBy(100), R: teamQv.times(100 - leftPct).dividedBy(100),
    Lcv: teamCv.times(leftPct).dividedBy(100), Rcv: teamCv.times(100 - leftPct).dividedBy(100),
  };
  return s;
}

export function quickCounts(q: QuickOrg, idx: ProductIndex): PeopleCounts {
  const n = (gs: { count: number }[]) => gs.reduce((a, g) => a + g.count, 0);
  const units = (gs: { count: number; qty: number }[]) => gs.reduce((a, g) => a + g.count * g.qty, 0);
  const ownUnits = q.personal.reduce((a, l) => a + l.qty, 0);
  const youBuy = ownUnits > 0 ? 1 : 0;
  const customers = n(q.customers);
  const sponsoredBuying = n(q.sponsored);
  const team = n(q.team);
  // Actividad: Brand Partners del modo rápido con PV ≥ 55 (cada grupo es homogéneo).
  const active55 = [...q.sponsored, ...q.team].reduce((a, g) => a + (d(idx[g.productId]?.qv ?? 0).times(g.qty).gte(55) ? g.count : 0), 0);
  const youPv = qvOf(q.personal, idx).plus(q.customers.reduce((a, g) => a.plus(d(idx[g.productId]?.qv ?? 0).times(g.qty).times(g.count)), ZERO));
  return {
    activeBuyers: youBuy + customers + sponsoredBuying + team,
    personalCustomers: customers,
    sponsoredPersonally: sponsoredBuying + q.sponsoredInactive,
    sponsoredBuying,
    organizationMembers: sponsoredBuying + q.sponsoredInactive + team + q.teamInactive,
    registered: 1 + customers + sponsoredBuying + q.sponsoredInactive + team + q.teamInactive,
    meetingActivity: active55 + (youPv.gte(55) ? 1 : 0),
    totalUnits: ownUnits + units(q.customers) + units(q.sponsored) + units(q.team),
  };
}
