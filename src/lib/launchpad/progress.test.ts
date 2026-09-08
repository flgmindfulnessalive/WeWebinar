import { describe, expect, it } from "vitest";

import {
  completedStepCount,
  computeProjectCompletionPercentage,
  estimatedMinutesRemaining,
  nextRecommendedStep,
  stepStatusFor,
} from "./progress";
import type { LaunchpadStepProgress } from "./types";

function stepRow(stepKey: LaunchpadStepProgress["stepKey"], status: LaunchpadStepProgress["status"]): LaunchpadStepProgress {
  return {
    stepKey,
    status,
    progressPercentage: status === "completed" ? 100 : 0,
    startedAt: null,
    completedAt: null,
    lastActivityAt: null,
  };
}

describe("progress", () => {
  it("sin ninguna fila de progreso, el primer paso recomendado es 'cost'", () => {
    expect(nextRecommendedStep([])).toBe("cost");
    expect(computeProjectCompletionPercentage([])).toBe(0);
    expect(completedStepCount([])).toBe(0);
  });

  it("stepStatusFor devuelve not_started para un paso sin fila", () => {
    expect(stepStatusFor([], "diagnosis")).toBe("not_started");
  });

  it("con 3 de 7 pasos completos, calcula 43% (redondeado)", () => {
    const steps = [
      stepRow("cost", "completed"),
      stepRow("diagnosis", "completed"),
      stepRow("architecture", "completed"),
    ];
    expect(completedStepCount(steps)).toBe(3);
    expect(computeProjectCompletionPercentage(steps)).toBe(43);
  });

  it("recomienda el primer paso no completo en el orden establecido, no el primero disponible", () => {
    const steps = [stepRow("cost", "completed")];
    expect(nextRecommendedStep(steps)).toBe("diagnosis");
  });

  it("con todos los pasos completos, recomienda 'create'", () => {
    const steps = ([
      "cost",
      "diagnosis",
      "architecture",
      "script",
      "implementation",
      "demo",
      "create",
    ] as const).map((key) => stepRow(key, "completed"));
    expect(nextRecommendedStep(steps)).toBe("create");
    expect(computeProjectCompletionPercentage(steps)).toBe(100);
  });

  it("estimatedMinutesRemaining solo suma los pasos no completos", () => {
    const none = estimatedMinutesRemaining([]);
    const withCostDone = estimatedMinutesRemaining([stepRow("cost", "completed")]);
    expect(withCostDone).toBeLessThan(none);
  });
});
