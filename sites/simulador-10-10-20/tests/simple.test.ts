import { describe, expect, it } from "vitest";
import { DEFAULT_SIMPLE, simpleCalc } from "../src/engine/simple";

const line = (r: ReturnType<typeof simpleCalc>, id: string) => r.lines.find((l) => l.id === id)!.monthly.toFixed(2);

describe("Calculadora simple", () => {
  it("ejemplo del propietario: 150 socios, 10 directos (todos activos), 10 clientes preferentes, 1 sobre de 77 PV", () => {
    const r = simpleCalc(DEFAULT_SIMPLE);
    expect(r.errors).toEqual([]);
    expect(r.rank).toBe("d2");
    expect(line(r, "personal-team")).toBe("77.00"); // 10 × 77 × 10 %
    expect(line(r, "customer")).toBe("77.00"); // 770 PV → 10 %
    expect(line(r, "binary")).toBe("508.20"); // reparto 60/40: 11 % × 4 620 (semanal → 52/12, un solo redondeo)
    // caben 2 líderes 1★ Director en tu Gen 1 (bajo un 2★ Director, cada línea cuenta hasta 5 000)
    expect(line(r, "retail")).toBe("200.00"); // 10 preferentes × 1 sobre × $20
    expect(line(r, "mentor")).toBe("118.89");
    expect(r.directors.max).toBe(2);
    expect(r.directors.tiers.map((x) => [x.gen, x.rank, x.count])).toEqual([[1, "d1", 2]]);
    expect(r.confirmed.toFixed(2)).toBe("862.20");
    expect(r.total.toFixed(2)).toBe("981.09");
    expect(r.rankBonusTotal.toString()).toBe("1850"); // 100 + 250 + 500 + 1000
    expect(r.next!.rank).toBe("d3");
    expect(r.next!.gaps.join()).toMatch(/8,450|8.450/);
  });
  it("Mentor Match es 0 por debajo de 1★ Director", () => {
    const r = simpleCalc({ ...DEFAULT_SIMPLE, partners: 20, directs: 5 });
    expect(r.lines.find((l) => l.id === "mentor")!.why).toMatch(/1★ Director/);
    expect(line(r, "mentor")).toBe("0.00");
  });
  it("sin compra propia no hay rango ni 10 %", () => {
    const r = simpleCalc({ ...DEFAULT_SIMPLE, ownSachets: 0, retailCustomers: 0, preferredCustomers: 0 });
    expect(r.rank).toBeNull();
    expect(line(r, "personal-team")).toBe("0.00");
  });
  it("clientes minoristas ($50) y preferentes ($20) por separado", () => {
    const r = simpleCalc({ ...DEFAULT_SIMPLE, retailCustomers: 4, preferredCustomers: 6 });
    expect(line(r, "retail")).toBe("320.00"); // 4 × $50 + 6 × $20
    expect(line(r, "customer")).toBe("77.00"); // los 10 clientes suman 770 PV → 10 %
  });
  it("directos inactivos: no compran ni suman volumen", () => {
    const r = simpleCalc({ ...DEFAULT_SIMPLE, activeDirectsPct: 50 });
    expect(r.rank).toBe("d2");
    expect(line(r, "personal-team")).toBe("38.50"); // 5 activos × 77 × 10 %
    expect(line(r, "binary")).toBe("491.26"); // pierna débil 40 % × (140 + 5) × 77 × 11 %
    expect(r.confirmed.toFixed(2)).toBe("806.76");
    const none = simpleCalc({ ...DEFAULT_SIMPLE, activeDirectsPct: 0 });
    expect(line(none, "personal-team")).toBe("0.00");
  });
  it("binario 50/50 si se elige", () => {
    expect(line(simpleCalc({ ...DEFAULT_SIMPLE, strongLegPct: 50 }), "binary")).toBe("635.25"); // 11 % × 5 775
  });
  it("Mentor Match: líderes de todos los rangos y en varias generaciones", () => {
    const big = simpleCalc({ ...DEFAULT_SIMPLE, partners: 1000, sachets: 2 });
    expect(big.rank).toBe("e2"); // paga 5 generaciones
    const g = (gen: number) => big.directors.tiers.filter((x) => x.gen === gen).map((x) => `${x.count}×${x.rank}`);
    expect(g(1)).toEqual(["3×e1", "1×d3", "1×d2"]); // bajo un 2★ Ejecutivo cada línea cuenta hasta 50 000 → 1★ Ejecutivo
    expect(g(2)).toEqual(["3×d3", "4×d2", "5×d1"]);
    expect(big.directors.max).toBe(5);
    expect(line(big, "mentor")).toBe("3198.94");
    const pres = simpleCalc({ ...DEFAULT_SIMPLE, partners: 3000, directs: 20, sachets: 2 });
    expect(pres.rank).toBe("p1");
    expect(pres.directors.tiers.some((x) => x.rank === "e3")).toBe(true);
    expect(Math.max(...pres.directors.tiers.map((x) => x.gen))).toBe(6);
  });
  it("Mentor Match: número manual de líderes con límite", () => {
    const one = simpleCalc({ ...DEFAULT_SIMPLE, directors: 1 });
    expect(line(one, "mentor")).toBe("59.44");
    expect(one.directors.max).toBe(2);
    const tooMany = simpleCalc({ ...DEFAULT_SIMPLE, directors: 5 });
    expect(tooMany.directors.used).toBe(2);
    expect(tooMany.lines.find((l) => l.id === "mentor")!.how.join(" ")).toMatch(/solo caben 2/);
    expect(line(simpleCalc({ ...DEFAULT_SIMPLE, directors: 0 }), "mentor")).toBe("0.00");
    expect(simpleCalc({ ...DEFAULT_SIMPLE, partners: 1000, sachets: 2, directors: 1 }).directors.max).toBe(5);
  });
  it("valida el reparto del binario", () => {
    expect(simpleCalc({ ...DEFAULT_SIMPLE, strongLegPct: 40 }).errors.length).toBeGreaterThan(0);
  });
  it("valida entradas", () => {
    expect(simpleCalc({ ...DEFAULT_SIMPLE, activeDirectsPct: 120 }).errors.length).toBeGreaterThan(0);
    expect(simpleCalc({ ...DEFAULT_SIMPLE, directs: 200 }).errors.length).toBeGreaterThan(0);
    expect(simpleCalc({ ...DEFAULT_SIMPLE, partners: 1.5 }).errors.length).toBeGreaterThan(0);
  });
});
