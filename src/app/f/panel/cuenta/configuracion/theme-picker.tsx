"use client";

import { useOptimistic, startTransition } from "react";
import { Moon, Sun } from "lucide-react";

import { setPanelTheme, type PanelTheme } from "@/lib/actions/wefunnel-theme";

const OPTIONS: { value: PanelTheme; label: string; hint: string; Icon: typeof Sun }[] = [
  { value: "dark", label: "Oscuro", hint: "El de la marca", Icon: Moon },
  { value: "light", label: "Claro", hint: "Fondo blanco", Icon: Sun },
];

// El tema lo pinta el servidor, así que al enviar hay un viaje completo
// antes de que cambie nada. useOptimistic marca la opción elegida en el
// acto: sin eso, se pulsa y durante medio segundo parece que no pasó nada.
export function ThemePicker({ current }: { current: PanelTheme }) {
  const [shown, show] = useOptimistic(current);

  return (
    <div className="flex flex-wrap gap-3">
      {OPTIONS.map(({ value, label, hint, Icon }) => {
        const active = shown === value;
        return (
          <form
            key={value}
            action={(formData: FormData) => {
              startTransition(() => show(value));
              return setPanelTheme(formData);
            }}
          >
            <input type="hidden" name="theme" value={value} />
            <button
              type="submit"
              aria-pressed={active}
              className={`flex min-h-[64px] min-w-[150px] items-center gap-3 rounded-[12px] border px-4 py-3 text-left ${
                active
                  ? "border-[var(--wf-accent)] bg-[var(--wf-inset)]"
                  : "border-[var(--wf-edge)] bg-[var(--wf-card-2)]"
              }`}
            >
              <Icon
                className={`h-5 w-5 shrink-0 ${
                  active ? "text-[var(--wf-accent)]" : "text-[var(--wf-fg-muted)]"
                }`}
                aria-hidden="true"
              />
              <span className="flex min-w-0 flex-col">
                <span className="text-[length:var(--wf-body)] font-semibold text-[var(--wf-fg)]">
                  {label}
                </span>
                <span className="text-[length:var(--wf-small)] text-[var(--wf-fg-muted)]">
                  {hint}
                </span>
              </span>
            </button>
          </form>
        );
      })}
    </div>
  );
}
