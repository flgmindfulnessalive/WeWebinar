"use client";

import { useTranslations } from "next-intl";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { CategoryScore } from "@/lib/readiness/types";

const STATUS_BADGE_VARIANT = {
  critical: "destructive",
  needs_work: "outline",
  good_base: "secondary",
  prepared: "default",
} as const;

export function CategoryScoreCard({ score }: { score: CategoryScore }) {
  const t = useTranslations("Readiness");

  return (
    <Card>
      <CardContent className="flex flex-col gap-2 pt-6">
        <div className="flex items-start justify-between gap-2">
          <h4 className="font-medium">{t(`categories.${score.category}.title`)}</h4>
          <Badge variant={STATUS_BADGE_VARIANT[score.status]}>{t(`results.categoryStatus.${score.status}`)}</Badge>
        </div>
        <p className="text-2xl font-semibold tabular-nums" style={{ color: "var(--brand)" }}>
          {score.percentage}%
        </p>
      </CardContent>
    </Card>
  );
}
