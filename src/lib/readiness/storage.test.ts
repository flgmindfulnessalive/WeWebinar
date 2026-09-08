import { describe, expect, it } from "vitest";

import { READINESS_STORAGE_KEY } from "./config";
import { clearReadinessState, createInitialState, loadReadinessState, saveReadinessState, type StorageLike } from "./storage";

function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

describe("readiness localStorage helpers", () => {
  it("guarda y recupera el estado", () => {
    const storage = memoryStorage();
    const initial = createInitialState("assessment-1", { source: "whop" });
    initial.answers.strategy_q1 = "yes";
    initial.currentStepIndex = 2;

    saveReadinessState(initial, storage);
    const loaded = loadReadinessState(storage);

    expect(loaded?.assessmentId).toBe("assessment-1");
    expect(loaded?.answers.strategy_q1).toBe("yes");
    expect(loaded?.currentStepIndex).toBe(2);
    expect(loaded?.attribution.source).toBe("whop");
  });

  it("devuelve null si no hay nada guardado", () => {
    expect(loadReadinessState(memoryStorage())).toBeNull();
  });

  it("ignora datos corruptos o de otra versión en vez de romper", () => {
    const storage = memoryStorage();
    storage.setItem(READINESS_STORAGE_KEY, JSON.stringify({ version: 99, assessmentId: "x" }));
    expect(loadReadinessState(storage)).toBeNull();

    storage.setItem(READINESS_STORAGE_KEY, "{not valid json");
    expect(loadReadinessState(storage)).toBeNull();
  });

  it("limpia el estado al reiniciar", () => {
    const storage = memoryStorage();
    saveReadinessState(createInitialState("assessment-1", {}), storage);
    clearReadinessState(storage);
    expect(loadReadinessState(storage)).toBeNull();
  });

  it("no lanza si storage es null (SSR / localStorage no disponible)", () => {
    expect(() => saveReadinessState(createInitialState("a", {}), null)).not.toThrow();
    expect(loadReadinessState(null)).toBeNull();
    expect(() => clearReadinessState(null)).not.toThrow();
  });
});
