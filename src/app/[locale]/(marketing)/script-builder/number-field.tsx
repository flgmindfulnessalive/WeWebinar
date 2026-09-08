"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NumberField({
  id,
  label,
  value,
  onChange,
  placeholder,
  min,
  max,
}: {
  id: string;
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  placeholder?: string;
  min?: number;
  max?: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        value={value ?? ""}
        onChange={(e) => {
          const raw = e.target.value;
          onChange(raw === "" ? undefined : Number(raw));
        }}
        placeholder={placeholder}
      />
    </div>
  );
}
