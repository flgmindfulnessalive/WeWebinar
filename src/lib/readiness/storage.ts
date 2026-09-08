import { READINESS_STORAGE_KEY } from "./config";
import type { AttributionParams, ContextAnswers, QuestionAnswers } from "./types";

export type ReadinessLocalState = {
  version: 1;
  assessmentId: string;
  attribution: AttributionParams;
  context: Partial<ContextAnswers>;
  answers: QuestionAnswers;
  currentStepIndex: number;
  // true una vez que el submit al servidor tuvo éxito -- evita que volver
  // a /readiness reabra un assessment ya enviado y dispare un duplicado.
  completed: boolean;
  // Fijado una sola vez en createInitialState -- viaja en el payload de
  // submit como métrica ("cuánto tardó en completarlo"), no se recalcula.
  startedAt: string;
  updatedAt: string;
};

// Mismo criterio de inyección que src/lib/ai/provider.ts: default a
// window.localStorage, pero testeable con cualquier objeto que cumpla
// este shape, sin depender de jsdom (los tests unitarios de este repo
// corren en entorno "node").
export type StorageLike = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function getDefaultStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    // Modo privado en algunos navegadores puede lanzar al acceder a
    // localStorage -- el progreso simplemente no persiste, no es un error
    // que deba romper la evaluación.
    return null;
  }
}

export function createInitialState(assessmentId: string, attribution: AttributionParams): ReadinessLocalState {
  return {
    version: 1,
    assessmentId,
    attribution,
    context: {},
    answers: {},
    currentStepIndex: 0,
    completed: false,
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function loadReadinessState(storage: StorageLike | null = getDefaultStorage()): ReadinessLocalState | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(READINESS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ReadinessLocalState>;
    if (parsed.version !== 1 || typeof parsed.assessmentId !== "string") return null;
    return parsed as ReadinessLocalState;
  } catch {
    return null;
  }
}

export function saveReadinessState(
  state: ReadinessLocalState,
  storage: StorageLike | null = getDefaultStorage()
): void {
  if (!storage) return;
  try {
    storage.setItem(READINESS_STORAGE_KEY, JSON.stringify({ ...state, updatedAt: new Date().toISOString() }));
  } catch {
    // Cuota llena u otro fallo silencioso -- el estado en memoria del
    // componente sigue funcionando igual, solo no persiste entre sesiones.
  }
}

export function clearReadinessState(storage: StorageLike | null = getDefaultStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(READINESS_STORAGE_KEY);
  } catch {
    // no-op
  }
}
