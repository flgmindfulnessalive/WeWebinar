"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { questionIdsForCategory } from "@/lib/readiness/questions";
import { ANSWER_VALUES, type AnswerValue, type CategoryKey, type QuestionAnswers, type QuestionId } from "@/lib/readiness/types";
import { AnswerOptionCard } from "./answer-option-card";
import { ReadinessProgress } from "./readiness-progress";

export function ReadinessCategoryStep({
  category,
  stepNumber,
  totalSteps,
  answers,
  onAnswer,
  onContinue,
  onBack,
}: {
  category: CategoryKey;
  stepNumber: number;
  totalSteps: number;
  answers: QuestionAnswers;
  onAnswer: (questionId: QuestionId, value: AnswerValue) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const t = useTranslations("Readiness");
  const questionIds = questionIdsForCategory(category);
  const allAnswered = questionIds.every((id) => answers[id]);
  const [showValidation, setShowValidation] = useState(false);

  function handleContinue() {
    if (!allAnswered) {
      setShowValidation(true);
      return;
    }
    setShowValidation(false);
    onContinue();
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
      <ReadinessProgress
        current={stepNumber}
        total={totalSteps}
        label={t("progress.categoryStepLabel", { current: stepNumber, total: totalSteps })}
      />

      <div>
        <h2 className="text-2xl font-semibold">{t(`categories.${category}.title`)}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t(`categories.${category}.description`)}</p>
      </div>

      <div className="flex flex-col gap-4">
        {questionIds.map((questionId, index) => (
          <Card key={questionId}>
            <CardContent className="flex flex-col gap-3 pt-6">
              <p className="font-medium">{t(`questions.${category}.q${index + 1}`)}</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {ANSWER_VALUES.map((value) => (
                  <AnswerOptionCard
                    key={value}
                    name={questionId}
                    value={value}
                    label={t(`answers.${value}`)}
                    checked={answers[questionId] === value}
                    onSelect={() => onAnswer(questionId, value)}
                  />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div aria-live="polite" className="min-h-5 text-sm text-destructive">
        {showValidation && !allAnswered ? t("validation.answerAllQuestions") : null}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          {t("nav.previous")}
        </Button>
        <Button
          onClick={handleContinue}
          className="text-white shadow-sm"
          style={{ background: "linear-gradient(90deg, var(--brand), var(--brand-2))" }}
        >
          {t("nav.continue")}
        </Button>
      </div>
    </div>
  );
}
