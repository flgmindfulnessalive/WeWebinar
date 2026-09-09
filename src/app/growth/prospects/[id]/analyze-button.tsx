"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";

import { analyzeProspectAction } from "@/lib/actions/growth-scoring";
import { Button } from "@/components/ui/button";

export function AnalyzeButton({ prospectId, hasAnalysis }: { prospectId: string; hasAnalysis: boolean }) {
  const t = useTranslations("GrowthScoring");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(force: boolean) {
    setError(null);
    startTransition(async () => {
      const result = await analyzeProspectAction(prospectId, { force });
      if (result && "error" in result) setError(result.error);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <Button type="button" onClick={() => run(hasAnalysis)} disabled={isPending} variant={hasAnalysis ? "outline" : "default"}>
        <Sparkles className="size-4" />
        {isPending ? t("analyzing") : hasAnalysis ? t("refreshAnalysis") : t("analyzeWithAi")}
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
