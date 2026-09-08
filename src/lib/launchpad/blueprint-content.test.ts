import { describe, expect, it } from "vitest";

import { BLUEPRINT_SLIDES, TOTAL_BLUEPRINT_SLIDES, slideDefinition, slidesForAct } from "./blueprint-content";

describe("blueprint-content", () => {
  it("tiene exactamente 18 slides numeradas 1-18 sin huecos ni duplicados", () => {
    expect(TOTAL_BLUEPRINT_SLIDES).toBe(18);
    const numbers = BLUEPRINT_SLIDES.map((s) => s.number).sort((a, b) => a - b);
    expect(numbers).toEqual(Array.from({ length: 18 }, (_, i) => i + 1));
  });

  it("agrupa los 4 actos con el mismo rango que ARCHITECTURE_SECTION (5/5/5/3)", () => {
    expect(slidesForAct("problem").map((s) => s.number)).toEqual([1, 2, 3, 4, 5]);
    expect(slidesForAct("new_way").map((s) => s.number)).toEqual([6, 7, 8, 9, 10]);
    expect(slidesForAct("criteria").map((s) => s.number)).toEqual([11, 12, 13, 14, 15]);
    expect(slidesForAct("implementation").map((s) => s.number)).toEqual([16, 17, 18]);
  });

  it("slideDefinition devuelve la slide correcta y explota fuera de rango", () => {
    expect(slideDefinition(1).act).toBe("problem");
    expect(slideDefinition(18).act).toBe("implementation");
    expect(() => slideDefinition(19)).toThrow();
    expect(() => slideDefinition(0)).toThrow();
  });
});
