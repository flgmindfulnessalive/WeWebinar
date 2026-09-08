import { describe, expect, it } from "vitest";

import {
  MIN_PERCENTAGE_TO_GENERATE,
  canGeneratePrompt,
  completionBucket,
  computeProfileCompletion,
  missingCriticalFields,
} from "./completion";
import { CRITICAL_FIELDS, COMPLETION_TRACKED_FIELDS } from "./profile-config";
import type { WebinarProjectProfile } from "./types";

function fullProfile(): WebinarProjectProfile {
  const profile: WebinarProjectProfile = {};
  for (const field of COMPLETION_TRACKED_FIELDS) {
    // @ts-expect-error -- construimos un perfil completo genérico solo
    // para el test de completitud, el tipo real de cada campo no importa acá.
    profile[field] = Array.isArray(profile[field]) ? ["x"] : "x";
  }
  // Los campos array necesitan un array real, no el string "x" de arriba.
  profile.mechanismSteps = ["paso 1"];
  profile.proofPoints = [{ type: "testimonial", label: "x" }];
  profile.deliverables = ["x"];
  profile.benefits = ["x"];
  profile.deliveryStyle = ["professional"];
  return profile;
}

describe("computeProfileCompletion", () => {
  it("perfil vacío = 0%", () => {
    expect(computeProfileCompletion({})).toBe(0);
  });

  it("perfil con todos los campos trackeados = 100%", () => {
    expect(computeProfileCompletion(fullProfile())).toBe(100);
  });

  it("cuenta solo los campos trackeados, no los cosméticos", () => {
    const withOnlyCosmetic: WebinarProjectProfile = { projectName: "Mi proyecto", currency: "USD" };
    expect(computeProfileCompletion(withOnlyCosmetic)).toBe(0);
  });
});

describe("completionBucket", () => {
  it.each([
    [0, "insufficient"],
    [49, "insufficient"],
    [50, "draft_ready"],
    [74, "draft_ready"],
    [75, "solid"],
    [89, "solid"],
    [90, "excellent"],
    [100, "excellent"],
  ] as const)("%i%% -> %s", (percentage, expected) => {
    expect(completionBucket(percentage)).toBe(expected);
  });
});

describe("canGeneratePrompt", () => {
  it(`permite generar desde ${MIN_PERCENTAGE_TO_GENERATE}%`, () => {
    expect(canGeneratePrompt(49)).toBe(false);
    expect(canGeneratePrompt(50)).toBe(true);
  });
});

describe("missingCriticalFields", () => {
  it("detecta los 9 campos críticos cuando el perfil está vacío", () => {
    expect(missingCriticalFields({})).toEqual(CRITICAL_FIELDS);
  });

  it("no lista un campo crítico ya completado", () => {
    const missing = missingCriticalFields({ productName: "Mi producto" });
    expect(missing).not.toContain("productName");
    expect(missing).toHaveLength(CRITICAL_FIELDS.length - 1);
  });

  it("perfil con todos los críticos completos no reporta faltantes", () => {
    const profile = fullProfile();
    expect(missingCriticalFields(profile)).toEqual([]);
  });
});
