"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

export function MultiSelectField<T extends string>({
  legend,
  options,
  values,
  onToggle,
  optionLabel,
  max,
}: {
  legend: string;
  options: readonly T[];
  values: T[];
  onToggle: (option: T) => void;
  optionLabel: (option: T) => string;
  max?: number;
}) {
  const atMax = max !== undefined && values.length >= max;

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-sm font-medium">{legend}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const checked = values.includes(option);
          const disabled = !checked && atMax;
          return (
            <button
              key={option}
              type="button"
              aria-pressed={checked}
              disabled={disabled}
              onClick={() => onToggle(option)}
              className={cn(
                "flex min-h-9 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                checked
                  ? "border-transparent bg-[var(--brand-light)] text-foreground ring-2 ring-[var(--brand)]"
                  : "border-input hover:bg-accent/50"
              )}
            >
              {checked && <Check className="size-3.5" strokeWidth={3} />}
              {optionLabel(option)}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
