import { QUESTIONS_PER_CATEGORY, READINESS_CATEGORY_KEYS, type CategoryKey, type QuestionId } from "./types";

// Config estructural: qué preguntas existen y en qué orden. El texto vive
// en los mensajes de next-intl (namespace Readiness.questions.<category>.q<n>
// / Readiness.categories.<category>.title|description) -- separar
// estructura de copy es lo que permite agregar inglés sin tocar esta
// lógica ni el scoring.
export function questionIdsForCategory(category: CategoryKey): QuestionId[] {
  return Array.from(
    { length: QUESTIONS_PER_CATEGORY },
    (_, i) => `${category}_q${i + 1}` as QuestionId
  );
}

export const ALL_QUESTION_IDS: QuestionId[] = READINESS_CATEGORY_KEYS.flatMap(questionIdsForCategory);

export function isKnownQuestionId(value: string): value is QuestionId {
  return (ALL_QUESTION_IDS as string[]).includes(value);
}

export function categoryForQuestionId(questionId: QuestionId): CategoryKey {
  return questionId.slice(0, questionId.lastIndexOf("_q")) as CategoryKey;
}
