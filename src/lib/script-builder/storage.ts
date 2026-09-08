import { SCRIPT_BUILDER_STORAGE_KEY } from "./config";
import type { AttributionParams, WebinarProjectProfile } from "./types";

export type ScriptBuilderLocalState = {
  version: 1;
  projectId: string;
  assessmentId?: string;
  attribution: AttributionParams;
  profile: WebinarProjectProfile;
  currentStageIndex: number; // 0=landing, 1-7=etapas, 8=review, 9=lead gate, 10=resultado
  completed: boolean;
  startedAt: string;
  updatedAt: string;
};

// Mismo criterio de inyección que src/lib/readiness/storage.ts: default a
// window.localStorage, testeable con cualquier objeto que cumpla este
// shape, sin depender de jsdom.
export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function getDefaultStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function createInitialState(
  projectId: string,
  attribution: AttributionParams,
  prefill?: { assessmentId?: string; profile?: WebinarProjectProfile }
): ScriptBuilderLocalState {
  const now = new Date().toISOString();
  return {
    version: 1,
    projectId,
    assessmentId: prefill?.assessmentId,
    attribution,
    profile: prefill?.profile ?? {},
    currentStageIndex: 0,
    completed: false,
    startedAt: now,
    updatedAt: now,
  };
}

export function loadScriptBuilderState(
  storage: StorageLike | null = getDefaultStorage()
): ScriptBuilderLocalState | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(SCRIPT_BUILDER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ScriptBuilderLocalState>;
    if (parsed.version !== 1 || typeof parsed.projectId !== "string") return null;
    return parsed as ScriptBuilderLocalState;
  } catch {
    return null;
  }
}

export function saveScriptBuilderState(
  state: ScriptBuilderLocalState,
  storage: StorageLike | null = getDefaultStorage()
): void {
  if (!storage) return;
  try {
    storage.setItem(SCRIPT_BUILDER_STORAGE_KEY, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }));
  } catch {
    // Cuota llena u otro fallo silencioso -- el estado en memoria sigue
    // funcionando, solo no persiste entre sesiones.
  }
}

export function clearScriptBuilderState(storage: StorageLike | null = getDefaultStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(SCRIPT_BUILDER_STORAGE_KEY);
  } catch {
    // no-op
  }
}
