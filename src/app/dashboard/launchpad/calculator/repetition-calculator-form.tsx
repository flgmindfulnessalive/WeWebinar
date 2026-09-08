"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { computeRepetitionCalculator, type RepetitionCalculatorInputs } from "@/lib/launchpad/repetition-calculator";
import { trackLaunchpadEvent } from "@/lib/launchpad/track";

const DEFAULT_INPUTS: RepetitionCalculatorInputs = {
  presentationsPerWeek: 5,
  durationMinutes: 45,
  prepAndFollowupMinutes: 25,
  peopleRepeating: 1,
  hourlyValueUsd: 30,
  automatablePercentage: 0.8,
};

function formatHours(hours: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(Math.round(hours));
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(
    Math.round(amount)
  );
}

function StatTile({ label, value, tone }: { label: string; value: string; tone: "current" | "recoverable" }) {
  return (
    <div
      className={
        tone === "current"
          ? "rounded-lg border bg-muted/30 p-4"
          : "rounded-lg border border-[#4f46e5]/30 bg-[#4f46e5]/5 p-4 dark:border-[#4f46e5]/40 dark:bg-[#4f46e5]/10"
      }
    >
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-xl font-semibold tabular-nums">{value}</p>
    </div>
  );
}

export function RepetitionCalculatorForm({
  projectId,
  initialInputs,
}: {
  projectId: string | null;
  initialInputs: RepetitionCalculatorInputs | null;
}) {
  const t = useTranslations("Launchpad.calculator");
  const router = useRouter();
  const [inputs, setInputs] = useState<RepetitionCalculatorInputs>(initialInputs ?? DEFAULT_INPUTS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const results = useMemo(() => computeRepetitionCalculator(inputs), [inputs]);

  useEffect(() => {
    if (projectId) trackLaunchpadEvent(projectId, "launchpad_step_started", { step_key: "cost" });
  }, [projectId]);

  function updateField<K extends keyof RepetitionCalculatorInputs>(key: K, value: RepetitionCalculatorInputs[K]) {
    setInputs((prev) => ({ ...prev, [key]: value }));
  }

  function numberField(key: keyof RepetitionCalculatorInputs, min: number, max: number) {
    return {
      value: inputs[key],
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        const parsed = raw === "" ? 0 : Number(raw);
        if (Number.isFinite(parsed)) updateField(key, Math.min(max, Math.max(min, parsed)));
      },
    };
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/launchpad/calculator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inputs }),
      });
      if (!response.ok) {
        setError(t("saveError"));
        return;
      }
      if (projectId) trackLaunchpadEvent(projectId, "repetition_calculation_completed");
      router.push("/dashboard/launchpad");
    } catch {
      setError(t("saveError"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-4 pt-6">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lp-calc-presentations">{t("presentationsPerWeekLabel")}</Label>
              <Input id="lp-calc-presentations" type="number" min={0} max={100} {...numberField("presentationsPerWeek", 0, 100)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lp-calc-duration">{t("durationMinutesLabel")}</Label>
              <Input id="lp-calc-duration" type="number" min={0} max={600} {...numberField("durationMinutes", 0, 600)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lp-calc-prep">{t("prepAndFollowupMinutesLabel")}</Label>
              <Input id="lp-calc-prep" type="number" min={0} max={600} {...numberField("prepAndFollowupMinutes", 0, 600)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lp-calc-people">{t("peopleRepeatingLabel")}</Label>
              <Input id="lp-calc-people" type="number" min={0} max={500} {...numberField("peopleRepeating", 0, 500)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lp-calc-hourly">{t("hourlyValueUsdLabel")}</Label>
              <Input id="lp-calc-hourly" type="number" min={0} max={10000} {...numberField("hourlyValueUsd", 0, 10000)} />
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="lp-calc-automatable">{t("automatablePercentageLabel")}</Label>
                <span className="text-sm font-medium tabular-nums">
                  {Math.round(inputs.automatablePercentage * 100)}%
                </span>
              </div>
              <Slider
                id="lp-calc-automatable"
                min={0}
                max={100}
                step={5}
                value={[Math.round(inputs.automatablePercentage * 100)]}
                onValueChange={([v]) => updateField("automatablePercentage", v / 100)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="flex flex-col gap-4 pt-6">
              <p className="text-sm text-pretty">
                {t("insight", {
                  annualHours: formatHours(results.annualHours),
                  annualWorkdays: formatHours(results.annualWorkdays),
                  automatablePercentage: Math.round(inputs.automatablePercentage * 100),
                  recoverableHours: formatHours(results.recoverableHours),
                })}
              </p>

              <div>
                <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {t("currentSystemLabel")}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <StatTile tone="current" label={t("annualHoursLabel")} value={formatHours(results.annualHours)} />
                  <StatTile tone="current" label={t("annualWorkdaysLabel")} value={formatHours(results.annualWorkdays)} />
                  <StatTile tone="current" label={t("annualCostLabel")} value={formatUsd(results.annualCostUsd)} />
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  {t("recoverableLabel")}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <StatTile tone="recoverable" label={t("recoverableHoursLabel")} value={formatHours(results.recoverableHours)} />
                  <StatTile
                    tone="recoverable"
                    label={t("recoverableWorkdaysLabel")}
                    value={formatHours(results.recoverableWorkdays)}
                  />
                  <StatTile
                    tone="recoverable"
                    label={t("recoverableValueLabel")}
                    value={formatUsd(results.recoverableValueUsd)}
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                {t("projectionNote", {
                  monthlyCost: formatUsd(results.monthlyCostUsd),
                  threeYear: formatUsd(results.threeYearProjectionUsd),
                })}
              </p>
            </CardContent>
          </Card>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <Button size="lg" onClick={handleSave} disabled={saving} className="h-12 text-base">
            {saving ? t("saving") : t("saveCta")}
          </Button>
        </div>
      </div>
    </div>
  );
}
