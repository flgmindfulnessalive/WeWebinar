// Same visual language as the webinar analytics funnel
// (src/app/dashboard/webinars/[id]/analytics/funnel.tsx): single hue,
// progressively lighter down the funnel, drop-off called out per step so
// an operator can see where prospects stall without doing the math.
const STEP_COLOR = "#4f46e5";

export type FunnelStep = { label: string; value: number };

export function Funnel({ steps }: { steps: FunnelStep[] }) {
  const base = steps[0]?.value ?? 0;

  return (
    <div className="flex flex-col">
      {steps.map((step, i) => {
        const pctOfBase = base > 0 ? Math.round((step.value / base) * 100) : 0;
        const widthPct = base > 0 ? Math.max(2, (step.value / base) * 100) : 0;
        const prev = i > 0 ? steps[i - 1] : null;
        const dropPct =
          prev && prev.value > 0 ? Math.round(100 - (step.value / prev.value) * 100) : null;

        return (
          <div
            key={step.label}
            className={`grid grid-cols-[140px_1fr_56px] items-center gap-3 py-2 ${
              i > 0 ? "border-t border-dashed" : ""
            }`}
          >
            <p className="truncate text-sm font-medium">{step.label}</p>
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: STEP_COLOR,
                  opacity: 0.35 + 0.65 * (i === 0 ? 1 : pctOfBase / 100),
                }}
              />
            </div>
            <div className="text-right">
              <p className="text-sm font-bold tabular-nums">{step.value}</p>
              {dropPct !== null && dropPct > 0 && (
                <p className="text-[11px] font-medium text-muted-foreground">−{dropPct}%</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
