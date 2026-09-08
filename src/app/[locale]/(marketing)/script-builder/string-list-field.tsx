"use client";

import { useState, type KeyboardEvent } from "react";
import { useTranslations } from "next-intl";
import { Plus, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Lista de strings cortos con agregar/quitar (mecanismSteps, deliverables,
// benefits, bonuses, objections, forbiddenWords, requiredConcepts) -- un
// único primitivo reutilizado en las 7 etapas en vez de un input por campo.
export function StringListField({
  id,
  label,
  values,
  onChange,
  placeholder,
  max,
}: {
  id: string;
  label: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  max: number;
}) {
  const t = useTranslations("ScriptBuilder.common");
  const [draft, setDraft] = useState("");

  function addDraft() {
    const trimmed = draft.trim();
    if (!trimmed || values.length >= max) return;
    onChange([...values, trimmed]);
    setDraft("");
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      addDraft();
    }
  }

  function removeAt(index: number) {
    onChange(values.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>
        {label} <span className="font-normal text-muted-foreground">({values.length}/{max})</span>
      </Label>
      {values.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {values.map((value, index) => (
            <li
              key={index}
              className="flex items-center justify-between gap-2 rounded-lg border border-input px-3 py-2 text-sm"
            >
              <span className="text-pretty">{value}</span>
              <button
                type="button"
                onClick={() => removeAt(index)}
                aria-label={t("removeItem", { value })}
                className="shrink-0 text-muted-foreground hover:text-destructive"
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {values.length < max && (
        <div className="flex gap-2">
          <Input
            id={id}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
          />
          <Button type="button" variant="outline" onClick={addDraft} disabled={!draft.trim()} aria-label={t("add")}>
            <Plus className="size-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
