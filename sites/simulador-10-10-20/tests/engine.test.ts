import { describe, expect, it } from "vitest";
import { simulate } from "../src/engine/simulate";
import { PLAN } from "../src/plan/plan-10-10-20";
import { bp, cust, din, products, qin, quick, SOBRE } from "./helpers";

const comp = (r: ReturnType<typeof simulate>, id: string) => r.components.find((c) => c.id === id)!;
const money = (x: { toFixed: (n: number) => string } | null | undefined) => (x == null ? null : x.toFixed(2));
const prod = (qv: number, cv = qv) => [{ ...SOBRE, qv, cv }];

describe("Reglas del plan (datos)", () => {
  it("tiene 13 rangos en orden con los valores del PDF p.4, p.9 y p.10", () => {
    expect(PLAN.ranks.map((r) => r.id)).toEqual(["abp", "m1", "m2", "m3", "d1", "d2", "d3", "e1", "e2", "e3", "p1", "p2", "p3"]);
    expect(PLAN.ranks.map((r) => r.pv)).toEqual([55, 75, 75, 75, 110, 110, 110, 200, 200, 200, 200, 200, 200]);
    expect(PLAN.ranks.map((r) => r.qdv)).toEqual([null, 750, 1500, 2500, 5000, 10000, 20000, 40000, 100000, 200000, 400000, 1000000, 2500000]);
    expect(PLAN.ranks.map((r) => r.binaryPct)).toEqual([null, 10, 10, 10, 11, 11, 11, 12, 12, 12, 13, 13, 13]);
    expect(PLAN.ranks.map((r) => r.binaryWeeklyCap)).toEqual([null, 100, 500, 1500, 2500, 3500, 5000, 7500, 10000, 15000, 20000, 25000, 25000]);
    expect(PLAN.ranks.find((r) => r.id === "e3")!.mentorGens).toEqual([20, 15, 10, 7, 7, 5]);
    expect(PLAN.ranks.find((r) => r.id === "p2")!.mentorGens).toEqual([20, 15, 10, 7, 7, 7]);
  });
  it("cada regla cita al menos una fuente", () => {
    for (const r of PLAN.rules) expect(r.sources.length, r.id).toBeGreaterThan(0);
  });
});

describe("BP Activo (55 PV): umbral exacto", () => {
  for (const [qv, expected] of [[54, null], [55, "abp"], [56, "abp"]] as const) {
    it(`PV ${qv} → ${expected ?? "sin rango"}`, () => {
      const r = simulate(qin(quick({ personal: [{ productId: "sobre", qty: 1 }] }), {}, prod(qv)));
      expect(r.paidRank).toBe(expected);
    });
  }
  it("el PV suma compras de clientes personales", () => {
    const r = simulate(qin(quick({ personal: [{ productId: "sobre", qty: 1 }], customers: [{ count: 1, productId: "sobre", qty: 1, kind: "cliente" }] }), {}, prod(30)));
    expect(r.paidRank).toBe("abp");
  });
});

describe("10 % Personal Team", () => {
  const org = quick({ personal: [{ productId: "sobre", qty: 2 }], sponsored: [{ count: 3, productId: "sobre", qty: 1 }], distribution: { lines: 3, largestPct: 34, secondPct: 33, leftPct: 50 } });
  it("10 % del volumen comisionable de los patrocinados (semana 1: 3 × 40 × 10 % = 12,00)", () => {
    const r = simulate(qin(org, { orderTiming: "semana1" }));
    expect(money(comp(r, "personal-team").monthly)).toBe("12.00");
    expect(comp(r, "personal-team").status).toBe("calculado");
  });
  it("uniforme: redondeo semanal y conversión 52/12 declarados", () => {
    const r = simulate(qin(org, { orderTiming: "uniforme" }));
    const c = comp(r, "personal-team");
    // 120 × 12/52 = 27,6923 → 10 % = 2,7692 → 2,77 por semana
    expect(c.weekly!.map((x) => money(x))).toEqual(["2.77", "2.77", "2.77", "2.77"]);
    expect(money(c.monthly4w)).toBe("11.08");
    expect(money(c.monthly)).toBe("12.00"); // 2,77 × 52/12 = 12,0033 → 12,00
  });
  it("no elegible (0 y causa) si no tienes BP Activo", () => {
    const r = simulate(qin({ ...org, personal: [] }));
    const c = comp(r, "personal-team");
    expect(c.status).toBe("no_elegible");
    expect(money(c.monthly)).toBe("0.00");
    expect(c.reasons.join(" ")).toMatch(/BP Activo/);
  });
});

describe("Bono para el cliente: tramos (fuente web)", () => {
  const cases: [number, string, string][] = [[299, "no_elegible", "0.00"], [300, "calculado", "15.00"], [599, "calculado", "29.95"], [600, "calculado", "60.00"], [1199, "calculado", "119.90"], [1200, "calculado", "240.00"]];
  for (const [qv, st, amt] of cases) {
    it(`${qv} QV de clientes → ${amt}`, () => {
      const r = simulate(qin(quick({ customers: [{ count: 1, productId: "sobre", qty: 1, kind: "cliente" }] }), {}, [{ ...SOBRE, qv, cv: qv, retailMargin: 0 }]));
      const c = comp(r, "customer");
      expect(c.status).toBe(st);
      expect(money(c.monthly)).toBe(amt);
      expect(c.basis).toBe("web");
    });
  }
});

describe("Regla del 50 % (MVR), OL2L, equilibrio y PV 200", () => {
  // Modo detallado con líneas exactas. 1 sobre = 1 de volumen para controlar cifras.
  const unit = [{ ...SOBRE, qv: 1, cv: 1, retailMargin: null }];
  const base = (lineA: number, lineB: number) => [
    bp("tu", null, null, 110), bp("a", "tu", ["tu", "L"], lineA), bp("b", "tu", ["tu", "R"], lineB),
  ];
  it("5 000 con 3 000 + 2 000: la línea grande cuenta 2 500 → no llega a 1★ Director", () => {
    const r = simulate(din(base(3000, 2000), {}, unit));
    expect(r.paidRank).toBe("m3");
    const d1 = r.qualificationMonth!.evaluations.find((e) => e.rank === "d1")!;
    expect(d1.checks.find((c) => c.key === "qdv")!.actual.toString()).toBe("4500");
  });
  it("2 500 + 2 500 → 1★ Director (umbral exacto)", () => {
    expect(simulate(din(base(2500, 2500), {}, unit)).paidRank).toBe("d1");
  });
  it("2 500 + 2 499 → falta 1 de QDV", () => {
    const r = simulate(din(base(2500, 2499), {}, unit));
    expect(r.paidRank).toBe("m3");
    const qdv = r.qualificationMonth!.evaluations.find((e) => e.rank === "d1")!.checks.find((c) => c.key === "qdv")!;
    expect(qdv.gap.toString()).toBe("1");
  });
  it("PV 200: máximo 110 de compras personales (salvo APAC)", () => {
    const people = [bp("tu", null, null, 200), bp("a", "tu", ["tu", "L"], 20000), bp("b", "tu", ["tu", "R"], 20000), bp("c", "tu", ["a", "L"], 5000)];
    // c está patrocinado por ti (línea propia) y colocado bajo a.
    const gen = simulate(din(people, {}, unit));
    expect(gen.paidRank).toBe("d3");
    const pv = gen.qualificationMonth!.evaluations.find((e) => e.rank === "e1")!.checks.find((c) => c.key === "pv")!;
    expect(pv.actual.toString()).toBe("110");
    expect(simulate(din(people, { region: "apac" }, unit)).paidRank).toBe("e1");
  });
  it("OL2L exige volumen fuera de las 2 líneas más grandes", () => {
    const people = [bp("tu", null, null, 200), bp("a", "tu", ["tu", "L"], 20000), bp("b", "tu", ["tu", "R"], 20000), bp("c", "tu", ["a", "L"], 4999)];
    const r = simulate(din(people, { region: "apac" }, unit));
    expect(r.paidRank).toBe("d3");
    const o = r.qualificationMonth!.evaluations.find((e) => e.rank === "e1")!.checks.find((c) => c.key === "ol2l")!;
    expect(o.gap.toString()).toBe("1");
  });
});

describe("Patrocinio frente a colocación", () => {
  const unit = [{ ...SOBRE, qv: 1, cv: 1, retailMargin: null }];
  // Mismas 3 personas y compras; solo cambia la colocación.
  const people = (placeB: [string, "L" | "R"]) => [bp("tu", null, null, 110), bp("a", "tu", ["tu", "L"], 2500), bp("b", "tu", placeB, 2500)];
  it("equilibradas en el binario → 1★ Director", () => {
    expect(simulate(din(people(["tu", "R"]), {}, unit)).paidRank).toBe("d1");
  });
  it("b colocado debajo de a: mismo QDV por patrocinio, pierna derecha vacía → falla el equilibrio", () => {
    const r = simulate(din(people(["a", "L"]), {}, unit));
    expect(r.paidRank).toBe("m3");
    const d1 = r.qualificationMonth!.evaluations.find((e) => e.rank === "d1")!;
    expect(d1.checks.find((c) => c.key === "qdv")!.ok).toBe(true);
    expect(d1.checks.find((c) => c.key === "balance")!.ok).toBe(false);
  });
  it("contar líneas por colocación cambia el QDV contable", () => {
    const r = simulate(din(people(["a", "L"]), { linesTree: "colocacion" }, unit));
    const qdv = r.qualificationMonth!.evaluations.find((e) => e.rank === "d1")!.checks.find((c) => c.key === "qdv")!;
    expect(qdv.actual.toString()).toBe("2500"); // una sola pierna con 5 000, cuenta 2 500
  });
});

describe("Binario y Mentor Match: pendientes salvo supuesto explícito", () => {
  const org = quick({ personal: [{ productId: "sobre", qty: 2 }], sponsored: [{ count: 20, productId: "sobre", qty: 1 }], distribution: { lines: 20, largestPct: 5, secondPct: 5, leftPct: 50 } });
  it("por defecto el binario está pendiente (sin importe, no 0)", () => {
    const c = comp(simulate(qin(org)), "binary");
    expect(c.status).toBe("pendiente");
    expect(c.monthly).toBeNull();
  });
  it("con el supuesto: 10 % de la pierna menor, tope semanal de 1★ Manager", () => {
    const r = simulate(qin(org, { assumeBinary: true, orderTiming: "semana1" }));
    expect(r.paidRank).toBe("m1"); // QDV 1000 ≥ 750
    const c = comp(r, "binary");
    expect(c.status).toBe("hipotetico");
    // pierna menor 400 cv × 10 % = 40 (bajo el tope de 100)
    expect(money(c.monthly)).toBe("40.00");
    expect(money(r.totals.recurring)).toBe(money(comp(r, "personal-team").monthly!.plus(comp(r, "retail").monthly ?? 0).plus(comp(r, "customer").monthly ?? 0)));
  });
  it("tope semanal aplicado", () => {
    const big = quick({ personal: [{ productId: "sobre", qty: 2 }], sponsored: [{ count: 60, productId: "sobre", qty: 1 }], distribution: { lines: 60, largestPct: 2, secondPct: 2, leftPct: 50 } });
    const r = simulate(qin(big, { assumeBinary: true, orderTiming: "semana1" }));
    expect(r.paidRank).toBe("m3"); // 60 × 50 = 3 000 QDV
    const c = comp(r, "binary");
    expect(money(c.monthly)).toBe("120.00"); // pierna menor 1 200 × 10 % = 120 < tope 1 500
  });
  it("Mentor Match en modo rápido: información insuficiente", () => {
    const c = comp(simulate(qin(org, { assumeBinary: true, assumeMentor: true })), "mentor");
    expect(c.status).toBe("pendiente");
    expect(c.reasons.join(" ")).toMatch(/Información insuficiente/);
  });
});

describe("Mentor Match con supuestos (modo detallado)", () => {
  const unit = [{ ...SOBRE, qv: 1, cv: 1, retailMargin: null }];
  it("20 % del binario de la Gen 1 con tope por BP", () => {
    const people = [
      bp("tu", null, null, 110), bp("a", "tu", ["tu", "L"], 110), bp("b", "tu", ["tu", "R"], 110),
      bp("a1", "a", ["a", "L"], 2500), bp("a2", "a", ["a", "R"], 2500),
      bp("b1", "b", ["b", "L"], 2500), bp("b2", "b", ["b", "R"], 2500),
    ];
    const r = simulate(din(people, { assumeBinary: true, assumeMentor: true, orderTiming: "semana1" }, unit));
    // Tus líneas: 110 + 2 500 + 2 500 = 5 110 cada una → QDV 10 000 tras el 50 % → 2★ Director
    expect(r.paidRank).toBe("d2");
    // a: piernas 2 500 / 2 500 → rango 1★ Director (QDV 5 000, equilibrio ok) → binario 11 % × 2 500 = 275
    const m = comp(r, "mentor");
    expect(m.status).toBe("hipotetico");
    // 20 % × 275 = 55 por persona → 2 × 55 = 110 (tope 250 por BP no se alcanza)
    expect(money(m.monthly)).toBe("110.00");
  });
});

describe("Bonos puntuales", () => {
  it("PIB por paquete: 2 Básico + 1 Premium = 475", () => {
    const r = simulate(qin(quick({ enrollments: [{ packageId: "basico", count: 2 }, { packageId: "premium", count: 1 }] })));
    expect(money(comp(r, "pib").monthly)).toBe("475.00");
    expect(comp(r, "pib").classification).toBe("puntual");
    expect(money(r.totals.recurring)).toBe("0.00");
  });
  it("Bono por subir de rango: mitad en la 1.ª calificación; acumulativo", () => {
    const unit = [{ ...SOBRE, qv: 1, cv: 1, retailMargin: null }];
    const r = simulate(din([bp("tu", null, null, 75), bp("a", "tu", ["tu", "L"], 1250), bp("b", "tu", ["tu", "R"], 1250)], {}, unit));
    expect(r.paidRank).toBe("m3");
    const c = comp(r, "rank-bonus");
    expect(money(c.monthly)).toBe("175.00"); // (100 + 250) / 2
    const again = simulate(din([bp("tu", null, null, 75), bp("a", "tu", ["tu", "L"], 1250), bp("b", "tu", ["tu", "R"], 1250)], { previousHighestRank: "m2" }, unit));
    expect(money(comp(again, "rank-bonus").monthly)).toBe("125.00");
  });
  it("nuevo BP: las fuentes se contradicen → rango, sin importe único", () => {
    const unit = [{ ...SOBRE, qv: 1, cv: 1, retailMargin: null }];
    const r = simulate(din([bp("tu", null, null, 75), bp("a", "tu", ["tu", "L"], 750), bp("b", "tu", ["tu", "R"], 750)], { daysSinceEnrollment: 30 }, unit));
    const c = comp(r, "rank-bonus");
    expect(r.paidRank).toBe("m2");
    expect(c.status).toBe("contradiccion");
    expect(c.monthly).toBeNull();
    expect(money(c.range!.low)).toBe("50.00");
    expect(money(c.range!.high)).toBe("200.00");
  });
  it("Grupo trimestral: participaciones, nunca dinero", () => {
    const unit = [{ ...SOBRE, qv: 1, cv: 1, retailMargin: null }];
    const people = [bp("tu", null, null, 200), bp("a", "tu", ["tu", "L"], 200000), bp("b", "tu", ["tu", "R"], 200000), bp("c", "tu", ["a", "L"], 50000)];
    const r = simulate(din(people, { region: "apac" }, unit));
    expect(r.paidRank).toBe("p1");
    const c = comp(r, "quarterly");
    expect(c.status).toBe("pendiente");
    expect(c.monthly).toBeNull();
  });
});

describe("Periodos", () => {
  it("calificación semanal con compras uniformes: 1 sobre al mes no da 55 PV en ninguna semana", () => {
    const org = quick({ personal: [{ productId: "sobre", qty: 1 }] });
    expect(simulate(qin(org, {}, prod(60))).paidRank).toBe("abp");
    const w = simulate(qin(org, { qualificationPeriod: "semanal" }, prod(60)));
    expect(w.paidRankByWeek).toEqual([null, null, null, null]);
  });
  it("calificación semanal con compra en la semana 1: activo solo esa semana", () => {
    const org = quick({ personal: [{ productId: "sobre", qty: 1 }], sponsored: [{ count: 1, productId: "sobre", qty: 1 }], distribution: { lines: 1, largestPct: 100, secondPct: 0, leftPct: 50 } });
    const r = simulate(qin(org, { qualificationPeriod: "semanal", orderTiming: "semana1" }, prod(60)));
    expect(r.paidRankByWeek).toEqual(["abp", null, null, null]);
    expect(comp(r, "personal-team").weekly!.map(money)).toEqual(["6.00", "0.00", "0.00", "0.00"]);
  });
});

describe("Entradas inválidas y datos faltantes", () => {
  it("volumen de producto sin definir → pendiente, no 0", () => {
    const r = simulate(qin(quick({ personal: [{ productId: "sobre", qty: 1 }] }), {}, [{ ...SOBRE, qv: null, cv: null }]));
    expect(r.ok).toBe(false);
    expect(r.missing.join()).toMatch(/volumen/);
  });
  it("unidades negativas", () => {
    expect(simulate(qin(quick({ personal: [{ productId: "sobre", qty: -1 }] }))).errors.length).toBeGreaterThan(0);
  });
  it("más líneas que patrocinados", () => {
    const r = simulate(qin(quick({ sponsored: [{ count: 1, productId: "sobre", qty: 1 }], distribution: { lines: 3, largestPct: 40, secondPct: 30, leftPct: 50 } })));
    expect(r.errors.join()).toMatch(/líneas/);
  });
  it("pierna ocupada dos veces y ciclos", () => {
    const r = simulate(din([bp("tu", null, null, 1), bp("a", "tu", ["tu", "L"]), bp("b", "tu", ["tu", "L"])]));
    expect(r.errors.join()).toMatch(/ocupada/);
    const c = simulate(din([bp("tu", null, null, 1), bp("a", "b", ["tu", "L"]), bp("b", "a", ["tu", "R"])]));
    expect(c.errors.join()).toMatch(/Ciclo/);
  });
  it("un cliente no puede patrocinar", () => {
    const r = simulate(din([bp("tu", null, null, 1), cust("c", "tu", 1), bp("x", "c", ["tu", "L"])]));
    expect(r.errors.join()).toMatch(/cliente no puede patrocinar/);
  });
  it("margen minorista sin definir → pendiente", () => {
    const r = simulate(qin(quick({ customers: [{ count: 1, productId: "sobre", qty: 1, kind: "cliente" }] }), {}, [{ ...SOBRE, retailMargin: null }]));
    expect(comp(r, "retail").status).toBe("pendiente");
    expect(comp(r, "retail").monthly).toBeNull();
  });
});

describe("Totales separados", () => {
  it("lo puntual no suma a lo recurrente", () => {
    const r = simulate(qin(quick({ personal: [{ productId: "sobre", qty: 2 }], sponsored: [{ count: 2, productId: "sobre", qty: 1 }], distribution: { lines: 2, largestPct: 50, secondPct: 50, leftPct: 50 }, enrollments: [{ packageId: "premium", count: 1 }] }), { orderTiming: "semana1" }, products));
    expect(money(r.totals.recurring)).toBe("8.00");
    expect(money(r.totals.oneTime)).toBe("405.00");
  });
});

describe("Tope semanal del binario", () => {
  it("1★ Manager: 10 % de 2 000 = 200 → se paga el tope de 100", () => {
    const unit = [{ ...SOBRE, qv: 1, cv: 1, retailMargin: null }];
    // QDV 1 499 (< 1 500 de 2★M) pero piernas grandes en volumen comisionable
    const p = [{ ...SOBRE, id: "x", name: "x", qv: 0, cv: 2000, retailMargin: null }, ...unit];
    const people = [bp("tu", null, null, 75), bp("a", "tu", ["tu", "L"], 750), bp("b", "tu", ["tu", "R"], 749),
      { ...bp("a2", "a", ["a", "L"]), orders: [{ productId: "x", qty: 1 }] }, { ...bp("b2", "b", ["b", "L"]), orders: [{ productId: "x", qty: 1 }] }];
    const r = simulate(din(people, { assumeBinary: true, orderTiming: "semana1" }, p));
    expect(r.paidRank).toBe("m1");
    const c = comp(r, "binary");
    expect(money(c.weekly![0])).toBe("100.00");
    expect(c.capsHit.length).toBe(1);
  });
});

describe("Tope por BP del Mentor Match (supuesto)", () => {
  it("20 % de un binario de 2 500 = 500 → se paga el tope de 250 de 1★ Director", () => {
    const unit = [{ ...SOBRE, qv: 1, cv: 1, retailMargin: null }];
    const big = [{ ...SOBRE, id: "x", name: "x", qv: 0, cv: 30000, retailMargin: null }, ...unit];
    const people = [
      bp("tu", null, null, 110), bp("a", "tu", ["tu", "L"], 110), bp("b", "tu", ["tu", "R"], 2500),
      bp("a1", "a", ["a", "L"], 2500), bp("a2", "a", ["a", "R"], 2500),
      { ...bp("a1x", "a1", ["a1", "L"]), orders: [{ productId: "x", qty: 1 }] }, { ...bp("a2x", "a2", ["a2", "L"]), orders: [{ productId: "x", qty: 1 }] },
    ];
    const r = simulate(din(people, { assumeBinary: true, assumeMentor: true, orderTiming: "semana1" }, big));
    expect(r.paidRank).toBe("d1");
    const m = comp(r, "mentor");
    // a: 1★ Director, binario 11 % × 32 500 = 3 575 → tope 2 500; 20 % = 500 → tope por BP 250
    expect(money(m.weekly![0])).toBe("250.00");
    expect(m.capsHit.join()).toMatch(/topado/);
  });
});
