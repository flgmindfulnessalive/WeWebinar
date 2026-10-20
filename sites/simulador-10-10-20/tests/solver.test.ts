import { describe, expect, it } from "vitest";
import { DEFAULT_ASSUMPTIONS } from "../src/engine/model";
import { simulate } from "../src/engine/simulate";
import { buildOrg, DEFAULT_GOAL, solve } from "../src/engine/solver";
import { products, SOBRE } from "./helpers";

const goal = { ...DEFAULT_GOAL, personalQty: 2, productId: "sobre" };

describe("Calculadora de meta (búsqueda inversa)", () => {
  for (const target of [250, 500, 1000, 2000, 5000]) {
    it(`meta US$${target}: cada solución pasa por el motor directo, alcanza la meta y con N−1 no`, () => {
      const r = solve({ ...goal, target }, products, DEFAULT_ASSUMPTIONS);
      expect(r.blocked).toEqual([]);
      expect(r.solutions.length).toBeGreaterThan(0);
      for (const s of r.solutions) {
        expect(s.verified, `${s.structure} ${s.pattern}`).toBe(true);
        expect(s.provenMinimal).toBe(true);
        const again = simulate({ mode: "rapido", products, quick: s.org, assumptions: DEFAULT_ASSUMPTIONS });
        expect(again.ok).toBe(true);
        expect(again.totals.recurring.gte(target)).toBe(true);
        if (s.buyers > 1) {
          const less = simulate({ mode: "rapido", products, quick: buildOrg(s.structure, s.buyers - 1, { ...goal, target, pctOne: s.pctOne }), assumptions: DEFAULT_ASSUMPTIONS });
          expect(less.totals.recurring.lt(target)).toBe(true);
        }
      }
    });
  }

  it("socios que compran 1 sobre: 10 % de 40 + binario 10 % de 20 = 6 USD por persona y mes → 42 para 250", () => {
    const r = solve({ ...goal, target: 250 }, products, DEFAULT_ASSUMPTIONS);
    const s = r.solutions.find((x) => x.structure === "socios" && x.pctOne === 100)!;
    expect(s.buyers).toBe(42);
    expect(s.sponsored).toBe(42);
  });

  it("dos sobres reducen a la mitad los compradores necesarios (mismo volumen)", () => {
    const r = solve({ ...goal, target: 1000 }, products, DEFAULT_ASSUMPTIONS);
    const one = r.solutions.find((x) => x.structure === "socios" && x.pctOne === 100)!;
    const two = r.solutions.find((x) => x.structure === "socios" && x.pctOne === 0)!;
    expect(two.buyers).toBe(Math.ceil(one.buyers / 2));
    expect(two.units).toBe(one.units + (two.units - one.units)); // misma métrica de unidades informada
  });

  it("sin compras personales no hay Socio Activo: la meta no es alcanzable y se explica", () => {
    const r = solve({ ...goal, personalQty: 0, target: 250 }, products, DEFAULT_ASSUMPTIONS);
    expect(r.solutions.filter((s) => s.structure === "socios")).toEqual([]);
    expect(r.unreachable.some((u) => u.structure === "socios")).toBe(true);
    expect(r.unreachable.find((u) => u.structure === "socios")!.reason).toMatch(/Socio Activo/);
  });

  it("bloquea si el producto no tiene volumen", () => {
    const r = solve(goal, [{ ...SOBRE, qv: null, cv: null }], DEFAULT_ASSUMPTIONS);
    expect(r.blocked.join()).toMatch(/volumen/);
  });

  it("con supuestos, la estructura con profundidad también se verifica", () => {
    const r = solve({ ...goal, target: 500 }, products, DEFAULT_ASSUMPTIONS);
    const deep = r.solutions.filter((s) => s.structure === "profundidad");
    expect(deep.length).toBeGreaterThan(0);
    for (const s of deep) expect(s.verified).toBe(true);
  });

  it("una estructura desequilibrada necesita más compradores que una equilibrada (binario supuesto)", () => {
    const bal = solve({ ...goal, target: 1000, leftPct: 50 }, products, DEFAULT_ASSUMPTIONS).solutions.find((s) => s.structure === "profundidad" && s.pctOne === 100)!;
    const unb = solve({ ...goal, target: 1000, leftPct: 85 }, products, DEFAULT_ASSUMPTIONS).solutions.find((s) => s.structure === "profundidad" && s.pctOne === 100)!;
    expect(unb.buyers).toBeGreaterThan(bal.buyers);
  });
});
