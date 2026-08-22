"use client";

import { useState } from "react";

type Bar = { id: string; label: string; sublabel?: string; value: number; valueLabel: string };

export function HorizontalBarChart({ bars }: { bars: Bar[] }) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const maxValue = Math.max(1, ...bars.map((b) => b.value));

  if (bars.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin datos todavía.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {bars.map((bar) => (
        <div
          key={bar.id}
          className="group flex flex-col gap-1"
          onPointerEnter={() => setHoveredId(bar.id)}
          onPointerLeave={() => setHoveredId(null)}
          tabIndex={0}
          onFocus={() => setHoveredId(bar.id)}
          onBlur={() => setHoveredId(null)}
        >
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="truncate font-medium">{bar.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{bar.valueLabel}</span>
          </div>
          <div className="h-4 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full transition-[width]"
              style={{
                width: `${Math.max(2, (bar.value / maxValue) * 100)}%`,
                backgroundColor: "var(--primary)",
                opacity: hoveredId === null || hoveredId === bar.id ? 1 : 0.55,
              }}
            />
          </div>
          {bar.sublabel && <span className="text-xs text-muted-foreground">{bar.sublabel}</span>}
        </div>
      ))}
    </div>
  );
}
