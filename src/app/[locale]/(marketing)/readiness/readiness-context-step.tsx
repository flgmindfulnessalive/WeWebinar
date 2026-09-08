"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { BUSINESS_TYPES, PRESENTATION_STATUSES, PRIMARY_GOALS, type ContextAnswers } from "@/lib/readiness/types";
import { AnswerOptionCard } from "./answer-option-card";

export function ReadinessContextStep({
  value,
  onChange,
  onContinue,
  onBack,
}: {
  value: Partial<ContextAnswers>;
  onChange: (patch: Partial<ContextAnswers>) => void;
  onContinue: () => void;
  onBack: () => void;
}) {
  const t = useTranslations("Readiness.context");
  const tNav = useTranslations("Readiness.nav");
  const complete = Boolean(value.businessType && value.presentationStatus && value.primaryGoal);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8 px-6 py-10">
      <div>
        <h2 className="text-2xl font-semibold">{t("title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">{t("businessTypeLabel")}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {BUSINESS_TYPES.map((type) => (
            <AnswerOptionCard
              key={type}
              name="businessType"
              value={type}
              label={t(`businessType.${type}`)}
              checked={value.businessType === type}
              onSelect={() => onChange({ businessType: type })}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">{t("presentationStatusLabel")}</legend>
        <div className="grid gap-2">
          {PRESENTATION_STATUSES.map((status) => (
            <AnswerOptionCard
              key={status}
              name="presentationStatus"
              value={status}
              label={t(`presentationStatus.${status}`)}
              checked={value.presentationStatus === status}
              onSelect={() => onChange({ presentationStatus: status })}
            />
          ))}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-1 text-sm font-medium">{t("primaryGoalLabel")}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {PRIMARY_GOALS.map((goal) => (
            <AnswerOptionCard
              key={goal}
              name="primaryGoal"
              value={goal}
              label={t(`primaryGoal.${goal}`)}
              checked={value.primaryGoal === goal}
              onSelect={() => onChange({ primaryGoal: goal })}
            />
          ))}
        </div>
      </fieldset>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack}>
          {tNav("previous")}
        </Button>
        <Button
          disabled={!complete}
          onClick={onContinue}
          className="text-white shadow-sm"
          style={{ background: "linear-gradient(90deg, var(--brand), var(--brand-2))" }}
        >
          {tNav("continue")}
        </Button>
      </div>
    </div>
  );
}
