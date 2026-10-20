import { describe, expect, it } from "vitest";
import { simulate } from "../src/engine/simulate";
import { SCENARIOS } from "../src/scenarios/scenarios";

describe("Escenarios educativos: el texto coincide con el motor", () => {
  it("hay al menos 8 escenarios y una comparación", () => {
    expect(SCENARIOS.length).toBeGreaterThanOrEqual(9);
  });
  for (const s of SCENARIOS) {
    it(s.title, () => {
      const r = simulate(s.input);
      expect(r.ok, r.errors.join() + r.missing.join()).toBe(true);
      expect(r.paidRank).toBe(s.expect.rank);
      if (s.compare) {
        const c = simulate(s.compare.input);
        expect(c.ok, c.errors.join()).toBe(true);
        expect(c.paidRank).toBe(s.expect.compareRank);
      }
    });
  }
  it("caso 5 y 6: mismo número de personas y mismo volumen total; la MVR recorta la línea grande", () => {
    const a = SCENARIOS.find((s) => s.id === "equilibrada")!, b = SCENARIOS.find((s) => s.id === "concentrada")!;
    const ra = simulate(a.input), rb = simulate(b.input);
    expect(a.input.detailed!.people.length).toBe(b.input.detailed!.people.length);
    expect(ra.volumes!.totalQv.toString()).toBe(rb.volumes!.totalQv.toString());
    expect(ra.volumes!.teamQv.toString()).toBe("5236");
    const q = rb.qualificationMonth!.evaluations.find((e) => e.rank === "d1")!.checks.find((c) => c.key === "qdv")!;
    expect(q.actual.toString()).toBe("3886");
    expect(q.gap.toString()).toBe("1114");
  });
  it("caso 1: clientes por debajo del primer tramo y PIB puntual", () => {
    const r = simulate(SCENARIOS[0].input);
    expect(r.components.find((c) => c.id === "customer")!.status).toBe("no_elegible");
    expect(r.components.find((c) => c.id === "pib")!.monthly!.toString()).toBe("35");
  });
  it("caso 7: PV 77 no llega a los 110 de 1★ Director", () => {
    const r = simulate(SCENARIOS.find((s) => s.id === "incompleta")!.input);
    const pv = r.qualificationMonth!.evaluations.find((e) => e.rank === "d1")!.checks.find((c) => c.key === "pv")!;
    expect(pv.actual.toString()).toBe("77");
  });
  it("caso 8: el volumen cae de 3 080 a 1 925", () => {
    const s = SCENARIOS.find((x) => x.id === "pierde")!;
    expect(simulate(s.input).volumes!.teamQv.toString()).toBe("3080");
    expect(simulate(s.compare!.input).volumes!.teamQv.toString()).toBe("1925");
    expect(simulate(s.compare!.input).components.find((c) => c.id === "personal-team")!.monthly!.toFixed(2)).toBe("192.50");
  });
});
