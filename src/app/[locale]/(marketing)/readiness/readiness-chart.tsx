"use client";

import { useTranslations } from "next-intl";

import type { CategoryScore } from "@/lib/readiness/types";

// Barras horizontales sobre escala fija 0-100% (no relativa al máximo del
// set, a diferencia de HorizontalBarChart de Analíticas) -- son
// porcentajes de preparación, no conteos, así que la escala tiene que ser
// comparable entre categorías y entre distintos diagnósticos. Sin
// dependencia de gráficos: el brief pide explícitamente no sumar una
// librería pesada solo para esto.
export function ReadinessChart({ categoryScores }: { categoryScores: CategoryScore[] }) {
  const t = useTranslations("Readiness");

  return (
    <div>
      <h3 className="text-sm font-medium text-muted-foreground">{t("results.chartTitle")}</h3>
      {/* El texto por categoría de abajo ya transmite el mismo dato --
          el gráfico es decorativo/redundante para lectores de pantalla. */}
      <div aria-hidden className="mt-3 flex flex-col gap-3">
        {categoryScores.map((score) => (
          <div key={score.category} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium">{t(`categories.${score.category}.title`)}</span>
              <span className="tabular-nums text-muted-foreground">{score.percentage}%</span>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-[width] duration-500 motion-reduce:transition-none"
                style={{
                  width: `${Math.max(2, score.percentage)}%`,
                  background: "linear-gradient(90deg, var(--brand), var(--brand-2))",
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="sr-only">{t("results.chartAlt")}</p>
    </div>
  );
}
