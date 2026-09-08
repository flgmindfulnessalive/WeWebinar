import { describe, expect, it } from "vitest";

import { SCRIPT_BUILDER_STORAGE_KEY } from "./config";
import {
  clearScriptBuilderState,
  createInitialState,
  loadScriptBuilderState,
  saveScriptBuilderState,
  type StorageLike,
} from "./storage";

function memoryStorage(): StorageLike {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

describe("script builder localStorage helpers", () => {
  it("guarda y recupera el estado", () => {
    const storage = memoryStorage();
    const initial = createInitialState("project-1", { source: "readiness" }, { assessmentId: "assessment-1" });
    initial.profile.productName = "Mi producto";
    initial.currentStageIndex = 3;

    saveScriptBuilderState(initial, storage);
    const loaded = loadScriptBuilderState(storage);

    expect(loaded?.projectId).toBe("project-1");
    expect(loaded?.assessmentId).toBe("assessment-1");
    expect(loaded?.profile.productName).toBe("Mi producto");
    expect(loaded?.currentStageIndex).toBe(3);
  });

  it("devuelve null si no hay nada guardado", () => {
    expect(loadScriptBuilderState(memoryStorage())).toBeNull();
  });

  it("ignora datos corruptos o de otra versión (migración local)", () => {
    const storage = memoryStorage();
    storage.setItem(SCRIPT_BUILDER_STORAGE_KEY, JSON.stringify({ version: 99, projectId: "x" }));
    expect(loadScriptBuilderState(storage)).toBeNull();

    storage.setItem(SCRIPT_BUILDER_STORAGE_KEY, "{not valid json");
    expect(loadScriptBuilderState(storage)).toBeNull();
  });

  it("limpia el estado al reiniciar", () => {
    const storage = memoryStorage();
    saveScriptBuilderState(createInitialState("project-1", {}), storage);
    clearScriptBuilderState(storage);
    expect(loadScriptBuilderState(storage)).toBeNull();
  });

  it("no lanza si storage es null (SSR)", () => {
    expect(() => saveScriptBuilderState(createInitialState("a", {}), null)).not.toThrow();
    expect(loadScriptBuilderState(null)).toBeNull();
    expect(() => clearScriptBuilderState(null)).not.toThrow();
  });
});
