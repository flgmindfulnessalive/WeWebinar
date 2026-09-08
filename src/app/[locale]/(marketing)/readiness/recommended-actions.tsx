"use client";

import { useTranslations } from "next-intl";
import { CheckCircle2 } from "lucide-react";

import type { RecommendationId } from "@/lib/readiness/types";

export function RecommendedActions({ recommendations }: { recommendations: RecommendationId[] }) {
  const t = useTranslations("Readiness");

  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground">{t("results.recommendationsTitle")}</h3>
      <ol className="mt-3 flex flex-col gap-3">
        {recommendations.map((id) => (
          <li key={id} className="flex items-start gap-3 rounded-xl border bg-card p-4">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0" style={{ color: "var(--brand)" }} aria-hidden />
            <span className="text-sm">{t(`recommendations.${id}`)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
