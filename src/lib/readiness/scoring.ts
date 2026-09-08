import { questionIdsForCategory } from "./questions";
import { selectRecommendations } from "./recommendations";
import {
  ANSWER_POINTS,
  MAX_POINTS_PER_CATEGORY,
  MAX_TOTAL_POINTS,
  READINESS_CATEGORY_KEYS,
  WEAKEST_CATEGORY_TIEBREAK_ORDER,
  type AnswerValue,
  type CategoryKey,
  type CategoryScore,
  type CategoryStatusKey,
  type QuestionAnswers,
  type QuestionId,
  type ReadinessReport,
  type ReadinessStatusKey,
} from "./types";

// Redondeo consistente en todo el módulo -- Math.round como pide el brief
// (scorePercentage = Math.round((earnedPoints / 60) * 100)).
function toPercentage(points: number, maxPoints: number): number {
  return Math.round((points / maxPoints) * 100);
}

export function categoryPoints(category: CategoryKey, answers: QuestionAnswers): number {
  return questionIdsForCategory(category).reduce((sum, questionId) => {
    const answer = answers[questionId];
    return sum + (answer ? ANSWER_POINTS[answer] : 0);
  }, 0);
}

export function totalPoints(answers: QuestionAnswers): number {
  return READINESS_CATEGORY_KEYS.reduce((sum, category) => sum + categoryPoints(category, answers), 0);
}

// Mismos cortes para el estado general (sobre 60 puntos) y para el estado
// por categoría (sobre 10 puntos) -- el brief define ambas escalas con los
// mismos umbrales porcentuales (0-39 / 40-69 / 70-84 / 85-100).
export function readinessStatusFromPercentage(percentage: number): ReadinessStatusKey {
  if (percentage >= 85) return "ready";
  if (percentage >= 70) return "almost_ready";
  if (percentage >= 40) return "foundation_built";
  return "not_ready";
}

export function categoryStatusFromPercentage(percentage: number): CategoryStatusKey {
  if (percentage >= 85) return "prepared";
  if (percentage >= 70) return "good_base";
  if (percentage >= 40) return "needs_work";
  return "critical";
}

export function computeCategoryScores(answers: QuestionAnswers): CategoryScore[] {
  return READINESS_CATEGORY_KEYS.map((category) => {
    const points = categoryPoints(category, answers);
    const percentage = toPercentage(points, MAX_POINTS_PER_CATEGORY);
    return { category, points, percentage, status: categoryStatusFromPercentage(percentage) };
  });
}

export function computeScorePercentage(answers: QuestionAnswers): number {
  return toPercentage(totalPoints(answers), MAX_TOTAL_POINTS);
}

// Empate resuelto por WEAKEST_CATEGORY_TIEBREAK_ORDER: un problema
// estratégico nunca queda eclipsado por uno operativo (grabación) con el
// mismo puntaje -- ver el comentario en types.ts.
export function determineWeakestCategory(categoryScores: CategoryScore[]): CategoryKey {
  const minPoints = Math.min(...categoryScores.map((c) => c.points));
  const tied = new Set(categoryScores.filter((c) => c.points === minPoints).map((c) => c.category));
  const winner = WEAKEST_CATEGORY_TIEBREAK_ORDER.find((category) => tied.has(category));
  // WEAKEST_CATEGORY_TIEBREAK_ORDER cubre las 6 categorías -- winner
  // siempre existe si categoryScores no está vacío (invariante interna).
  return winner ?? categoryScores[0].category;
}

// Preguntas contestadas con 0 puntos (answer === "no") -- las
// recomendaciones priorizan específicamente estas, no solo la categoría
// más débil en general.
export function zeroScoreQuestionIds(answers: QuestionAnswers): QuestionId[] {
  return (Object.entries(answers) as [QuestionId, AnswerValue][])
    .filter(([, answer]) => ANSWER_POINTS[answer] === 0)
    .map(([questionId]) => questionId);
}

// Punto de entrada único que junta todo lo anterior -- lo que
// /api/readiness/submit llama para obtener el reporte completo a partir
// de las 30 respuestas ya validadas. También se usa para reconstruir el
// reporte de un assessment ya guardado (reintento idempotente), a partir
// de las columnas de score ya persistidas -- ver toReportFromStoredScores.
export function buildReadinessReport(assessmentId: string, answers: QuestionAnswers): ReadinessReport {
  const categoryScores = computeCategoryScores(answers);
  const weakestCategory = determineWeakestCategory(categoryScores);
  const scorePercentage = computeScorePercentage(answers);

  return {
    assessmentId,
    totalPoints: totalPoints(answers),
    scorePercentage,
    readinessStatus: readinessStatusFromPercentage(scorePercentage),
    categoryScores,
    weakestCategory,
    recommendations: selectRecommendations(weakestCategory),
  };
}

// Reconstruye el mismo shape de reporte a partir de una fila ya guardada
// (columnas *_score, 0-10 cada una) -- usado en el camino de reintento
// idempotente, donde no volvemos a recibir las 30 respuestas individuales.
export function reportFromStoredScores(
  assessmentId: string,
  scores: Record<CategoryKey, number>
): ReadinessReport {
  const categoryScores: CategoryScore[] = READINESS_CATEGORY_KEYS.map((category) => {
    const points = scores[category];
    const percentage = toPercentage(points, MAX_POINTS_PER_CATEGORY);
    return { category, points, percentage, status: categoryStatusFromPercentage(percentage) };
  });
  const weakestCategory = determineWeakestCategory(categoryScores);
  const totalPointsValue = categoryScores.reduce((sum, c) => sum + c.points, 0);
  const scorePercentage = toPercentage(totalPointsValue, MAX_TOTAL_POINTS);

  return {
    assessmentId,
    totalPoints: totalPointsValue,
    scorePercentage,
    readinessStatus: readinessStatusFromPercentage(scorePercentage),
    categoryScores,
    weakestCategory,
    recommendations: selectRecommendations(weakestCategory),
  };
}
