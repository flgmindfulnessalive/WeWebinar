"use client";

import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

// Radio semántico (un solo <input type="radio"> seleccionable por grupo,
// lectores de pantalla anuncian "seleccionado" nativamente) con la tarjeta
// entera como target de click/touch -- cumple el pedido del brief de
// "tarjetas seleccionables de ancho completo" en mobile sin sacrificar
// accesibilidad por un <div onClick> sin semántica.
export function AnswerOptionCard({
  name,
  value,
  label,
  checked,
  onSelect,
}: {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <label
      className={cn(
        "flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm transition-colors",
        checked
          ? "border-transparent bg-[var(--brand-light)] text-foreground ring-2 ring-[var(--brand)]"
          : "border-input hover:bg-accent/50"
      )}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        onChange={onSelect}
        className="sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
          checked ? "border-[var(--brand)] bg-[var(--brand)] text-white" : "border-input"
        )}
      >
        {checked && <Check className="size-3" strokeWidth={3} />}
      </span>
      <span className="font-medium">{label}</span>
    </label>
  );
}
