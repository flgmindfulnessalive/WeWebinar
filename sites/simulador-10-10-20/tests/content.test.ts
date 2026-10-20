import { describe, expect, it } from "vitest";
import { EARNINGS } from "../src/content/earnings";
import { simulate } from "../src/engine/simulate";
import { PLAN } from "../src/plan/plan-10-10-20";

describe("Fichas «Entender»: ejemplos verificables", () => {
  const expected: Record<string, string> = { "personal-team": "77.00", binary: "77.00", customer: "246.40", pib: "475.00", "rank-bonus": "175.00", retail: "200.00" };
  for (const m of EARNINGS) {
    it(m.name, () => {
      expect(PLAN.rules.some((r) => r.id === m.ruleId)).toBe(true);
      if (!m.example.input) return;
      const r = simulate(m.example.input);
      expect(r.ok, r.errors.join()).toBe(true);
      const c = r.components.find((x) => x.id === m.example.componentId)!;
      expect(c.monthly?.toFixed(2)).toBe(expected[m.id]);
    });
  }
});
