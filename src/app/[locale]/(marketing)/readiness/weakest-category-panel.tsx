"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import type { CategoryKey } from "@/lib/readiness/types";

export function WeakestCategoryPanel({ category }: { category: CategoryKey }) {
  const t = useTranslations("Readiness");

  return (
    <Card className="border-[var(--brand-2)]/30 bg-[var(--brand-2)]/5">
      <CardContent className="flex items-start gap-3 pt-6">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" style={{ color: "var(--brand-2)" }} aria-hidden />
        <div>
          <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {t("results.weakestCategoryEyebrow")}
          </p>
          <p className="mt-1 text-lg font-semibold">{t(`categories.${category}.title`)}</p>
          <p className="mt-1 text-sm text-muted-foreground">{t(`categories.${category}.description`)}</p>
        </div>
      </CardContent>
    </Card>
  );
}
