import type { CategoryKey, RecommendationId } from "./types";

// Determinístico: la categoría más débil (ya resuelta con desempate en
// scoring.ts) trae siempre las mismas 3 recomendaciones fijas, en el mismo
// orden -- el texto vive en Readiness.recommendations.<id> (next-intl). No
// hay IA en el MVP, como pide el brief explícitamente.
export function selectRecommendations(weakestCategory: CategoryKey): RecommendationId[] {
  return [1, 2, 3].map((n) => `${weakestCategory}_${n}` as RecommendationId);
}
