"use client";

import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EVIDENCE_TYPES, type ProofPoint } from "@/lib/script-builder/types";
import { cn } from "@/lib/utils";

const MAX_PROOF_POINTS = 10;

export function ProofPointsField({
  label,
  values,
  onChange,
}: {
  label: string;
  values: ProofPoint[];
  onChange: (values: ProofPoint[]) => void;
}) {
  const t = useTranslations("ScriptBuilder.common");
  const tType = useTranslations("ScriptBuilder.fields.proofPoints.type");

  function update(index: number, patch: Partial<ProofPoint>) {
    onChange(values.map((point, i) => (i === index ? { ...point, ...patch } : point)));
  }

  function removeAt(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  function add() {
    if (values.length >= MAX_PROOF_POINTS) return;
    onChange([...values, { type: EVIDENCE_TYPES[0], label: "" }]);
  }

  return (
    <div className="flex flex-col gap-3">
      <Label>
        {label}{" "}
        <span className="font-normal text-muted-foreground">
          ({values.length}/{MAX_PROOF_POINTS})
        </span>
      </Label>
      {values.map((point, index) => (
        <div key={index} className="flex flex-col gap-2 rounded-lg border border-input p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1.5">
              {EVIDENCE_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  aria-pressed={point.type === type}
                  onClick={() => update(index, { type })}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-xs transition-colors",
                    point.type === type
                      ? "border-transparent bg-[var(--brand-light)] ring-2 ring-[var(--brand)]"
                      : "border-input hover:bg-accent/50"
                  )}
                >
                  {tType(type)}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => removeAt(index)}
              aria-label={t("removeItem", { value: point.label || tType(point.type) })}
              className="shrink-0 text-muted-foreground hover:text-destructive"
            >
              <X className="size-4" />
            </button>
          </div>
          <Input
            value={point.label}
            onChange={(e) => update(index, { label: e.target.value })}
            placeholder={t("proofPointLabelPlaceholder")}
          />
          <Input
            value={point.url ?? ""}
            onChange={(e) => update(index, { url: e.target.value || undefined })}
            placeholder={t("urlOptionalPlaceholder")}
            type="url"
          />
        </div>
      ))}
      {values.length < MAX_PROOF_POINTS && (
        <Button type="button" variant="outline" onClick={add} className="self-start">
          <Plus className="size-4" /> {t("addProofPoint")}
        </Button>
      )}
    </div>
  );
}
