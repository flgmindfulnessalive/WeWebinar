// Modo detallado: personas con patrocinador (árbol de inscripción) y
// colocación (árbol binario) independientes. Necesario para todo lo que
// depende de la genealogía: líneas reales, piernas reales y generaciones.
import { d, ZERO, type D } from "./decimal";
import { ROOT_ID, type Assumptions, type DetailedOrg, type Person } from "./model";
import type { PeopleCounts } from "./quick";
import { cvOf, emptySnapshot, missingVolumes, qvOf, share, type ProductIndex, type Snapshot, type WindowId } from "./snapshot";

export function validateDetailed(org: DetailedOrg): string[] {
  const errs: string[] = [];
  const byId = new Map<string, Person>();
  for (const p of org.people) {
    if (byId.has(p.id)) errs.push(`Id repetido: «${p.id}».`);
    byId.set(p.id, p);
  }
  const root = byId.get(ROOT_ID);
  if (!root) return [...errs, "Falta la persona raíz («Tú»)."];
  if (root.kind !== "bp") errs.push("La raíz tiene que ser un Brand Partner.");
  const sides = new Set<string>();
  for (const p of org.people) {
    for (const o of p.orders) if (!(o.qty >= 0)) errs.push(`${p.label}: las unidades deben ser ≥ 0.`);
    if (p.id === ROOT_ID) continue;
    const sp = p.sponsorId ? byId.get(p.sponsorId) : undefined;
    if (!sp) errs.push(`${p.label}: su patrocinador no existe.`);
    else if (sp.kind !== "bp") errs.push(`${p.label}: un cliente no puede patrocinar (${sp.label}).`);
    if (p.kind === "bp") {
      if (!p.placement) errs.push(`${p.label}: falta su colocación en el binario.`);
      else {
        const par = byId.get(p.placement.parentId);
        if (!par || par.kind !== "bp") errs.push(`${p.label}: su posición de colocación no existe.`);
        const key = `${p.placement.parentId}:${p.placement.side}`;
        if (sides.has(key)) errs.push(`${p.label}: la pierna ${p.placement.side === "L" ? "izquierda" : "derecha"} de ${par?.label ?? "?"} ya está ocupada.`);
        sides.add(key);
      }
    } else if (p.placement) errs.push(`${p.label}: los clientes no se colocan en el binario.`);
  }
  // Ciclos en patrocinio y colocación
  for (const tree of ["sponsor", "placement"] as const) {
    for (const p of org.people) {
      const seen = new Set<string>();
      let cur: Person | undefined = p;
      while (cur && cur.id !== ROOT_ID) {
        if (seen.has(cur.id)) { errs.push(`Ciclo en el árbol de ${tree === "sponsor" ? "patrocinio" : "colocación"} en ${p.label}.`); break; }
        seen.add(cur.id);
        const next: string | null | undefined = tree === "sponsor" ? cur.sponsorId : cur.placement?.parentId;
        if (tree === "placement" && cur.kind !== "bp") break;
        cur = next ? byId.get(next) : undefined;
      }
    }
  }
  return [...new Set(errs)];
}

export interface Tree {
  byId: Map<string, Person>;
  index: Map<string, number>;
  sponsorKids: Map<string, Person[]>;
  placeKids: Map<string, { L?: Person; R?: Person }>;
}

export function buildTree(org: DetailedOrg): Tree {
  const byId = new Map(org.people.map((p) => [p.id, p]));
  const index = new Map(org.people.map((p, i) => [p.id, i]));
  const sponsorKids = new Map<string, Person[]>();
  const placeKids = new Map<string, { L?: Person; R?: Person }>();
  for (const p of org.people) {
    if (p.sponsorId) sponsorKids.set(p.sponsorId, [...(sponsorKids.get(p.sponsorId) ?? []), p]);
    if (p.kind === "bp" && p.placement) {
      const k = placeKids.get(p.placement.parentId) ?? {};
      k[p.placement.side] = p;
      placeKids.set(p.placement.parentId, k);
    }
  }
  return { byId, index, sponsorKids, placeKids };
}

export function detailedMissing(org: DetailedOrg, idx: ProductIndex): string[] {
  return missingVolumes(org.people.flatMap((p) => p.orders), idx);
}

/** Calcula volúmenes por persona y ventana, con memoria. */
export class DetailedVolumes {
  private memo = new Map<string, D>();
  constructor(private t: Tree, private idx: ProductIndex, private a: Assumptions) {}

  private key(kind: string, id: string, w: WindowId) { return `${kind}|${id}|${w}`; }
  private cached(kind: string, id: string, w: WindowId, f: () => D): D {
    const k = this.key(kind, id, w);
    let v = this.memo.get(k);
    if (!v) { v = f(); this.memo.set(k, v); }
    return v;
  }

  ownQv(p: Person, w: WindowId) { return share(qvOf(p.orders, this.idx), w, this.a.orderTiming, this.t.index.get(p.id) ?? 0); }
  ownCv(p: Person, w: WindowId) { return share(cvOf(p.orders, this.idx), w, this.a.orderTiming, this.t.index.get(p.id) ?? 0); }
  customers(bpId: string) { return (this.t.sponsorKids.get(bpId) ?? []).filter((k) => k.kind !== "bp"); }
  sponsoredBps(bpId: string) { return (this.t.sponsorKids.get(bpId) ?? []).filter((k) => k.kind === "bp"); }

  customersQv(bpId: string, w: WindowId) { return this.customers(bpId).reduce((a, c) => a.plus(this.ownQv(c, w)), ZERO); }
  customersCv(bpId: string, w: WindowId) { return this.customers(bpId).reduce((a, c) => a.plus(this.ownCv(c, w)), ZERO); }

  /** PV de un BP: compras propias + clientes personales. */
  pvTotal(bp: Person, w: WindowId) { return this.cached("pv", bp.id, w, () => this.ownQv(bp, w).plus(this.customersQv(bp.id, w))); }
  cvTotal(bp: Person, w: WindowId) { return this.cached("cv", bp.id, w, () => this.ownCv(bp, w).plus(this.customersCv(bp.id, w))); }

  sponsorSubtree(bp: Person, w: WindowId, key: "qv" | "cv"): D {
    return this.cached(`ss${key}`, bp.id, w, () =>
      this.sponsoredBps(bp.id).reduce((a, c) => a.plus(this.sponsorSubtree(c, w, key)), key === "qv" ? this.pvTotal(bp, w) : this.cvTotal(bp, w)));
  }
  placeSubtree(bp: Person | undefined, w: WindowId, key: "qv" | "cv"): D {
    if (!bp) return ZERO;
    return this.cached(`ps${key}`, bp.id, w, () => {
      const k = this.t.placeKids.get(bp.id) ?? {};
      return (key === "qv" ? this.pvTotal(bp, w) : this.cvTotal(bp, w)).plus(this.placeSubtree(k.L, w, key)).plus(this.placeSubtree(k.R, w, key));
    });
  }

  snapshot(bpId: string, w: WindowId): Snapshot {
    const bp = this.t.byId.get(bpId)!;
    const s = emptySnapshot();
    s.ownQv = this.ownQv(bp, w);
    s.customersQv = this.customersQv(bpId, w);
    s.customersCv = this.customersCv(bpId, w);
    s.customerUnits = this.customers(bpId).flatMap((c) => c.orders.map((o) => ({ productId: o.productId, qty: share(d(o.qty), w, this.a.orderTiming, this.t.index.get(c.id) ?? 0) })));
    const kids = this.t.placeKids.get(bpId) ?? {};
    s.legs = {
      L: this.placeSubtree(kids.L, w, "qv"), R: this.placeSubtree(kids.R, w, "qv"),
      Lcv: this.placeSubtree(kids.L, w, "cv"), Rcv: this.placeSubtree(kids.R, w, "cv"),
    };
    if (this.a.linesTree === "patrocinio") {
      s.lines = this.sponsoredBps(bpId).map((c) => { const qv = this.sponsorSubtree(c, w, "qv"); return { label: `Línea de ${c.label}`, qv, count: 1, total: qv }; });
    } else {
      s.lines = (["L", "R"] as const).filter((sd) => kids[sd]).map((sd) => { const qv = this.placeSubtree(kids[sd], w, "qv"); return { label: `Pierna ${sd === "L" ? "izquierda" : "derecha"}`, qv, count: 1, total: qv }; });
    }
    const spons = this.sponsoredBps(bpId);
    s.sponsoredCv = spons.reduce((a, c) => a.plus(this.ownCv(c, w)), ZERO);
    s.sponsoredCustomersCv = spons.reduce((a, c) => a.plus(this.customersCv(c.id, w)), ZERO);
    return s;
  }

  /** Generaciones de patrocinio de Brand Partners: [Gen1, Gen2, …]. */
  generations(bpId: string, depth: number): Person[][] {
    const out: Person[][] = [];
    let cur = this.sponsoredBps(bpId);
    for (let g = 0; g < depth && cur.length; g++) {
      out.push(cur);
      cur = cur.flatMap((c) => this.sponsoredBps(c.id));
    }
    return out;
  }
}

export function detailedCounts(org: DetailedOrg, v: DetailedVolumes): PeopleCounts {
  const buys = (p: Person) => p.orders.some((o) => o.qty > 0);
  const bps = org.people.filter((p) => p.kind === "bp");
  const custOfRoot = v.customers(ROOT_ID);
  const spons = v.sponsoredBps(ROOT_ID);
  return {
    activeBuyers: org.people.filter(buys).length,
    personalCustomers: custOfRoot.filter(buys).length,
    sponsoredPersonally: spons.length,
    sponsoredBuying: spons.filter(buys).length,
    organizationMembers: bps.length - 1,
    registered: org.people.length,
    meetingActivity: bps.filter((b) => v.pvTotal(b, "m").gte(55)).length,
    totalUnits: org.people.reduce((a, p) => a + p.orders.reduce((x, o) => x + o.qty, 0), 0),
  };
}
