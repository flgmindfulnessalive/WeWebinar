export function ScriptBuilderProgress({ current, total, label }: { current: number; total: number; label: string }) {
  const percentage = Math.round((current / total) * 100);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{percentage}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
      >
        <div
          className="h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${percentage}%`, background: "linear-gradient(90deg, var(--brand), var(--brand-2))" }}
        />
      </div>
    </div>
  );
}
