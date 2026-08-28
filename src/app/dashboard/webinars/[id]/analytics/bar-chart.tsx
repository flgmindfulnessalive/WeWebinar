"use client";

import { useState } from "react";

type Bar = { id: string; label: string; sublabel?: string; value: number; valueLabel: string };

// Brand indigo, same everywhere -- but bars aren't flat: fill opacity scales
// with the bar's own value (relative to the max in the set), so the
// strongest-performing CTA or poll option visibly "pops" without needing a
// second hue or a rank badge. Single-hue magnitude encoding, not identity --
// no CVD/categorical concerns, and the number label next to every bar means
// nothing here is color-only.
const BAR_COLOR = "#4f46e5";

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
                backgroundColor: BAR_COLOR,
                opacity:
                  (bar.value === 0 ? 0.3 : 0.45 + 0.55 * (bar.value / maxValue)) *
                  (hoveredId === null || hoveredId === bar.id ? 1 : 0.55),
              }}
            />
          </div>
          {bar.sublabel && <span className="text-xs text-muted-foreground">{bar.sublabel}</span>}
        </div>
      ))}
    </div>
  );
}
