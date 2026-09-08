"use client";

import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MIN_PERCENTAGE_TO_GENERATE, canGeneratePrompt, completionBucket } from "@/lib/script-builder/completion";
import { STAGE_FIELDS, type StageKey } from "@/lib/script-builder/profile-config";
import type { WebinarProjectProfile } from "@/lib/script-builder/types";

// A qué etapa manda cada campo crítico faltante -- para el link "completar"
// de cada fila (STAGE_FIELDS ya define la relación campo -> etapa, esto
// solo la invierte una vez).
function stageForField(field: keyof WebinarProjectProfile): StageKey {
  const entry = (Object.entries(STAGE_FIELDS) as [StageKey, (keyof WebinarProjectProfile)[]][]).find(([, fields]) =>
    fields.includes(field)
  );
  return entry ? entry[0] : "basics";
}

export function ProjectReview({
  profileCompletion,
  missingCritical,
  onEditStage,
  onGenerate,
}: {
  profileCompletion: number;
  missingCritical: (keyof WebinarProjectProfile)[];
  onEditStage: (stage: StageKey) => void;
  onGenerate: () => void;
}) {
  const t = useTranslations("ScriptBuilder.review");
  const tFields = useTranslations("ScriptBuilder.fields");
  const bucket = completionBucket(profileCompletion);
  const canGenerate = canGeneratePrompt(profileCompletion);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-6 py-10">
      <div>
        <h2 className="text-2xl font-semibold">{t("title")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
          <div
            className="flex size-28 items-center justify-center rounded-full"
            style={{ background: `conic-gradient(var(--brand) ${profileCompletion}%, var(--muted) 0)` }}
          >
            <div className="flex size-22 items-center justify-center rounded-full bg-background">
              <span className="text-2xl font-semibold tabular-nums">{profileCompletion}%</span>
            </div>
          </div>
          <p className="font-medium">{t(`bucket.${bucket}.title`)}</p>
          <p className="max-w-sm text-sm text-muted-foreground text-pretty">{t(`bucket.${bucket}.description`)}</p>
        </CardContent>
      </Card>

      {missingCritical.length > 0 && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">{t("missingCriticalTitle")}</p>
          <ul className="flex flex-col gap-2">
            {missingCritical.map((field) => (
              <li
                key={field}
                className="flex items-center justify-between gap-3 rounded-lg border border-input px-3 py-2 text-sm"
              >
                <span>{tFields(`${field}.label`)}</span>
                <button
                  type="button"
                  onClick={() => onEditStage(stageForField(field))}
                  className="shrink-0 text-sm font-medium text-[var(--brand)] underline-offset-4 hover:underline"
                >
                  {t("completeField")}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!canGenerate && (
        <p role="alert" className="text-sm text-destructive">
          {t("belowMinimum", { minimum: MIN_PERCENTAGE_TO_GENERATE })}
        </p>
      )}

      <Button
        size="lg"
        disabled={!canGenerate}
        onClick={onGenerate}
        className="h-12 text-base text-white shadow-sm"
        style={{ background: "linear-gradient(90deg, var(--brand), var(--brand-2))" }}
      >
        {t("generateCta")}
      </Button>
    </div>
  );
}
