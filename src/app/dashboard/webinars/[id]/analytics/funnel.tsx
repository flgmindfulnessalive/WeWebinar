// Brand indigo, single hue -- each step gets progressively lighter down the
// funnel (no red/green semaphore), and the drop from one step to the next
// is called out as its own small line so the host can see where the
// audience actually falls off without doing the subtraction themselves.
const STEP_COLOR = "#4f46e5";

type FunnelStep = { label: string; sublabel: string; value: number };

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
            className={`grid grid-cols-[108px_1fr_72px] items-center gap-3 py-2.5 ${
              i > 0 ? "border-t border-dashed" : ""
            }`}
          >
            <div>
              <p className="text-sm font-semibold">{step.label}</p>
              <p className="text-[11px] text-muted-foreground">{step.sublabel}</p>
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full"
                style={{ width: `${widthPct}%`, backgroundColor: STEP_COLOR, opacity: 0.35 + 0.65 * (i === 0 ? 1 : pctOfBase / 100) }}
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
