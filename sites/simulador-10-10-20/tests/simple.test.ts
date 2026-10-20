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
    expect(line(r, "binary")).toBe("635.25"); // 11 % × 5 775 (semanal → 52/12, un solo redondeo)
    // cada directo: 14 en su equipo → 1★ Gerente: no es generación (hace falta 1★ Director) → Mentor Match 0
    expect(line(r, "retail")).toBe("200.00"); // 10 preferentes × 1 sobre × $20
    expect(line(r, "mentor")).toBe("0.00");
    expect(r.lines.find((l) => l.id === "mentor")!.how.join(" ")).toMatch(/No son generación/);
    expect(r.confirmed.toFixed(2)).toBe("989.25");
    expect(r.total.toFixed(2)).toBe("989.25");
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
  it("directos inactivos: no compran, no suman volumen ni generan Mentor Match", () => {
    const r = simpleCalc({ ...DEFAULT_SIMPLE, activeDirectsPct: 50 });
    expect(r.rank).toBe("d2");
    expect(line(r, "personal-team")).toBe("38.50"); // 5 activos × 77 × 10 %
    expect(line(r, "binary")).toBe("614.07"); // pierna débil (140 + 5) × 77 / 2 × 11 %
    expect(r.total.toFixed(2)).toBe("929.57");
    const none = simpleCalc({ ...DEFAULT_SIMPLE, activeDirectsPct: 0 });
    expect(line(none, "personal-team")).toBe("0.00");
    expect(line(none, "mentor")).toBe("0.00");
  });
  it("Mentor Match: solo directos que llegan a 1★ Director; los inactivos no cuentan", () => {
    // 1 000 socios, 2 sobres: cada directo tiene 99 en su equipo y 154 PV → 2★ Director
    const r = simpleCalc({ ...DEFAULT_SIMPLE, partners: 1000, sachets: 2 });
    expect(line(r, "mentor")).toBe("4726.26"); // 20 % × (Nivel + Binario) semanal de 10 directos × 52/12
    const half = simpleCalc({ ...DEFAULT_SIMPLE, partners: 1000, sachets: 2, activeDirectsPct: 50 });
    expect(line(half, "mentor")).toBe("2363.13");
  });
  it("valida entradas", () => {
    expect(simpleCalc({ ...DEFAULT_SIMPLE, activeDirectsPct: 120 }).errors.length).toBeGreaterThan(0);
    expect(simpleCalc({ ...DEFAULT_SIMPLE, directs: 200 }).errors.length).toBeGreaterThan(0);
    expect(simpleCalc({ ...DEFAULT_SIMPLE, partners: 1.5 }).errors.length).toBeGreaterThan(0);
  });
});
