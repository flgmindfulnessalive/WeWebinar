import { describe, expect, it } from "vitest";
import { DEFAULT_SIMPLE, simpleCalc } from "../src/engine/simple";

const line = (r: ReturnType<typeof simpleCalc>, id: string) => r.lines.find((l) => l.id === id)!.monthly.toFixed(2);

describe("Calculadora simple", () => {
  it("ejemplo del propietario: 150 socios, 10 directos, 10 clientes, 1 sobre de 77 PV", () => {
    const r = simpleCalc(DEFAULT_SIMPLE);
    expect(r.errors).toEqual([]);
    expect(r.rank).toBe("d2");
    expect(line(r, "personal-team")).toBe("77.00"); // 10 × 77 × 10 %
    expect(line(r, "customer")).toBe("77.00"); // 770 PV → 10 %
    expect(line(r, "binary")).toBe("635.25"); // 11 % × 5 775 (semanal → 52/12, un solo redondeo)
    // cada directo: 14 en su equipo → 1★ Gerente, binario 10 % × 7×77×12/52 = 12,44/sem → 20 % = 2,49 → ×10 = 24,90/sem
    expect(line(r, "mentor")).toBe("107.80");
    expect(r.confirmed.toFixed(2)).toBe("154.00");
    expect(r.total.toFixed(2)).toBe("897.05");
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
    const r = simpleCalc({ ...DEFAULT_SIMPLE, ownSachets: 0, customers: 0 });
    expect(r.rank).toBeNull();
    expect(line(r, "personal-team")).toBe("0.00");
  });
  it("valida entradas", () => {
    expect(simpleCalc({ ...DEFAULT_SIMPLE, directs: 200 }).errors.length).toBeGreaterThan(0);
    expect(simpleCalc({ ...DEFAULT_SIMPLE, partners: 1.5 }).errors.length).toBeGreaterThan(0);
  });
});
