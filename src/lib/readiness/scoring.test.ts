import { describe, expect, it } from "vitest";

import { ALL_QUESTION_IDS, questionIdsForCategory } from "./questions";
import {
  categoryStatusFromPercentage,
  computeCategoryScores,
  computeScorePercentage,
  determineWeakestCategory,
  readinessStatusFromPercentage,
  totalPoints,
  zeroScoreQuestionIds,
} from "./scoring";
import { READINESS_CATEGORY_KEYS, type AnswerValue, type QuestionAnswers } from "./types";

function uniformAnswers(answer: AnswerValue): QuestionAnswers {
  return Object.fromEntries(ALL_QUESTION_IDS.map((id) => [id, answer])) as QuestionAnswers;
}

describe("computeScorePercentage", () => {
  it("30 respuestas 'yes' = 100%", () => {
    expect(computeScorePercentage(uniformAnswers("yes"))).toBe(100);
  });

  it("30 respuestas 'partial' = 50%", () => {
    expect(computeScorePercentage(uniformAnswers("partial"))).toBe(50);
  });

  it("30 respuestas 'no' = 0%", () => {
    expect(computeScorePercentage(uniformAnswers("no"))).toBe(0);
  });

  it("nunca sale del rango 0-100", () => {
    expect(computeScorePercentage({})).toBeGreaterThanOrEqual(0);
    expect(computeScorePercentage(uniformAnswers("yes"))).toBeLessThanOrEqual(100);
  });

  it("totalPoints máximo es 60", () => {
    expect(totalPoints(uniformAnswers("yes"))).toBe(60);
  });
});

describe("computeCategoryScores", () => {
  it("calcula el porcentaje correcto por categoría de forma independiente", () => {
    const answers: QuestionAnswers = {
      ...uniformAnswers("no"),
      ...Object.fromEntries(questionIdsForCategory("strategy").map((id) => [id, "yes"])),
    };
    const scores = computeCategoryScores(answers);
    const strategy = scores.find((s) => s.category === "strategy")!;
    const presentation = scores.find((s) => s.category === "presentation")!;

    expect(strategy.percentage).toBe(100);
    expect(strategy.points).toBe(10);
    expect(presentation.percentage).toBe(0);
  });

  it("cubre las 6 categorías siempre", () => {
    const scores = computeCategoryScores({});
    expect(scores.map((s) => s.category).sort()).toEqual([...READINESS_CATEGORY_KEYS].sort());
  });
});

describe("readinessStatusFromPercentage", () => {
  it.each([
    [0, "not_ready"],
    [39, "not_ready"],
    [40, "foundation_built"],
    [69, "foundation_built"],
    [70, "almost_ready"],
    [84, "almost_ready"],
    [85, "ready"],
    [100, "ready"],
  ] as const)("%i%% -> %s", (percentage, expected) => {
    expect(readinessStatusFromPercentage(percentage)).toBe(expected);
  });
});

describe("categoryStatusFromPercentage", () => {
  it.each([
    [0, "critical"],
    [39, "critical"],
    [40, "needs_work"],
    [69, "needs_work"],
    [70, "good_base"],
    [84, "good_base"],
    [85, "prepared"],
    [100, "prepared"],
  ] as const)("%i%% -> %s", (percentage, expected) => {
    expect(categoryStatusFromPercentage(percentage)).toBe(expected);
  });
});

describe("determineWeakestCategory", () => {
  it("elige la categoría con menor puntaje sin empate", () => {
    const scores = computeCategoryScores({
      ...uniformAnswers("yes"),
      ...Object.fromEntries(questionIdsForCategory("measurement").map((id) => [id, "no"])),
    });
    expect(determineWeakestCategory(scores)).toBe("measurement");
  });

  it("en empate, prioriza estrategia sobre presentación", () => {
    const answers = {
      ...uniformAnswers("yes"),
      ...Object.fromEntries(questionIdsForCategory("strategy").map((id) => [id, "no"])),
      ...Object.fromEntries(questionIdsForCategory("presentation").map((id) => [id, "no"])),
    };
    expect(determineWeakestCategory(computeCategoryScores(answers))).toBe("strategy");
  });

  it("en empate, prioriza experiencia evergreen sobre seguimiento y medición", () => {
    const answers = {
      ...uniformAnswers("yes"),
      ...Object.fromEntries(questionIdsForCategory("followup").map((id) => [id, "no"])),
      ...Object.fromEntries(questionIdsForCategory("evergreen").map((id) => [id, "no"])),
      ...Object.fromEntries(questionIdsForCategory("measurement").map((id) => [id, "no"])),
    };
    expect(determineWeakestCategory(computeCategoryScores(answers))).toBe("evergreen");
  });

  it("grabación es la última prioridad -- nunca eclipsa un problema estratégico", () => {
    const answers = {
      ...uniformAnswers("yes"),
      ...Object.fromEntries(questionIdsForCategory("recording").map((id) => [id, "no"])),
      ...Object.fromEntries(questionIdsForCategory("measurement").map((id) => [id, "no"])),
    };
    expect(determineWeakestCategory(computeCategoryScores(answers))).toBe("measurement");
  });

  it("empate entre las 6 categorías resuelve a estrategia", () => {
    expect(determineWeakestCategory(computeCategoryScores({}))).toBe("strategy");
  });
});

describe("zeroScoreQuestionIds", () => {
  it("devuelve solo las preguntas contestadas con 'no'", () => {
    const answers: QuestionAnswers = { strategy_q1: "no", strategy_q2: "yes", strategy_q3: "partial" };
    expect(zeroScoreQuestionIds(answers)).toEqual(["strategy_q1"]);
  });
});
