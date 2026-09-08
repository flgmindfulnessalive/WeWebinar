"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  critical,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: "text" | "url";
  critical?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        {critical && (
          <span aria-hidden className="ml-1 text-[var(--brand)]">
            *
          </span>
        )}
      </Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}
