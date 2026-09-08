"use client";

import { ChoiceCard } from "./choice-card";

export function SingleSelectField<T extends string>({
  id,
  legend,
  options,
  value,
  onSelect,
  optionLabel,
  critical,
  columns = 2,
}: {
  id: string;
  legend: string;
  options: readonly T[];
  value: T | undefined;
  onSelect: (value: T) => void;
  optionLabel: (option: T) => string;
  critical?: boolean;
  columns?: 1 | 2;
}) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1 text-sm font-medium">
        {legend}
        {critical && (
          <span aria-hidden className="ml-1 text-[var(--brand)]">
            *
          </span>
        )}
      </legend>
      <div className={columns === 2 ? "grid gap-2 sm:grid-cols-2" : "grid gap-2"}>
        {options.map((option) => (
          <ChoiceCard
            key={option}
            name={id}
            value={option}
            label={optionLabel(option)}
            checked={value === option}
            onSelect={() => onSelect(option)}
          />
        ))}
      </div>
    </fieldset>
  );
}
