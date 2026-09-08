import { describe, expect, it } from "vitest";

import { ALL_QUESTION_IDS } from "./questions";
import type { AnswerValue, QuestionId } from "./types";
import { ReadinessEventSchema, ReadinessSubmitSchema } from "./validation";

function validAnswers(): { questionId: QuestionId; answer: AnswerValue }[] {
  return ALL_QUESTION_IDS.map((questionId) => ({ questionId, answer: "yes" }));
}

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    assessmentId: "00000000-0000-4000-8000-000000000000",
    startedAt: new Date().toISOString(),
    answers: validAnswers(),
    context: { businessType: "coaching", presentationStatus: "recorded", primaryGoal: "more_sales" },
    lead: { name: "Ana Pérez", email: "ana@example.com", consentGiven: true, marketingConsent: true },
    attribution: { source: "whop" },
    ...overrides,
  };
}

describe("ReadinessSubmitSchema", () => {
  it("acepta un payload completo y válido", () => {
    const result = ReadinessSubmitSchema.safeParse(validPayload());
    expect(result.success).toBe(true);
  });

  it("rechaza una evaluación incompleta (menos de 30 respuestas)", () => {
    const result = ReadinessSubmitSchema.safeParse(
      validPayload({ answers: validAnswers().slice(0, 29) })
    );
    expect(result.success).toBe(false);
  });

  it("rechaza question_id desconocidos", () => {
    const result = ReadinessSubmitSchema.safeParse(
      validPayload({ answers: [...validAnswers().slice(0, 29), { questionId: "strategy_q99", answer: "yes" }] })
    );
    expect(result.success).toBe(false);
  });

  it("rechaza question_id duplicados aunque haya 30 respuestas", () => {
    const answers = validAnswers().slice(0, 29);
    answers.push({ questionId: answers[0].questionId, answer: "no" });
    const result = ReadinessSubmitSchema.safeParse(validPayload({ answers }));
    expect(result.success).toBe(false);
  });

  it("rechaza un email inválido", () => {
    const payload = validPayload();
    payload.lead = { ...payload.lead, email: "not-an-email" };
    expect(ReadinessSubmitSchema.safeParse(payload).success).toBe(false);
  });

  it("rechaza si no se dio el consentimiento", () => {
    const payload = validPayload();
    payload.lead = { ...payload.lead, consentGiven: false as unknown as true };
    expect(ReadinessSubmitSchema.safeParse(payload).success).toBe(false);
  });

  it("ignora cualquier score enviado por el cliente -- nunca llega al objeto validado", () => {
    const result = ReadinessSubmitSchema.safeParse(
      validPayload({ totalPoints: 999, scorePercentage: 100, weakestCategory: "strategy" })
    );
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty("totalPoints");
    expect(result.data).not.toHaveProperty("scorePercentage");
    expect(result.data).not.toHaveProperty("weakestCategory");
  });

  it("acepta el payload sin ningún parámetro de atribución", () => {
    const result = ReadinessSubmitSchema.safeParse(validPayload({ attribution: {} }));
    expect(result.success).toBe(true);
  });
});

describe("ReadinessEventSchema", () => {
  it("acepta un evento conocido", () => {
    const result = ReadinessEventSchema.safeParse({
      assessmentId: "00000000-0000-4000-8000-000000000000",
      eventType: "readiness_started",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza un event_type desconocido", () => {
    const result = ReadinessEventSchema.safeParse({
      assessmentId: "00000000-0000-4000-8000-000000000000",
      eventType: "something_made_up",
    });
    expect(result.success).toBe(false);
  });
});
