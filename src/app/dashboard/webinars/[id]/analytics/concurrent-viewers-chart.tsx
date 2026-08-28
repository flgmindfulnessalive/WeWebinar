"use client";

import { useId, useMemo, useState } from "react";

type Point = { minute: number; concurrentViewers: number };

const WIDTH = 640;
const HEIGHT = 220;
const PAD_LEFT = 36;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 24;

// Same brand indigo as the retention chart -- this is the sibling chart for
// wall-clock presence (join/heartbeat/leave), not video position.
const LINE_COLOR = "#4f46e5";

export function ConcurrentViewersChart({ points }: { points: Point[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const gradientId = useId();

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const maxMinute = points.length > 0 ? points[points.length - 1].minute : 0;
  const maxViewers = Math.max(1, ...points.map((p) => p.concurrentViewers));

  const xFor = (minute: number) =>
    PAD_LEFT + (maxMinute === 0 ? 0 : (minute / maxMinute) * plotWidth);
  const yFor = (viewers: number) => PAD_TOP + plotHeight - (viewers / maxViewers) * plotHeight;

  const linePath = useMemo(
    () =>
      points
        .map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(p.minute)} ${yFor(p.concurrentViewers)}`)
        .join(" "),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [points, maxMinute, maxViewers]
  );
  const areaPath = useMemo(() => {
    if (points.length === 0) return "";
    return `${linePath} L ${xFor(points[points.length - 1].minute)} ${yFor(0)} L ${xFor(points[0].minute)} ${yFor(0)} Z`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linePath, points]);

  const gridSteps = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxViewers * f));
  const hovered = hoverIndex !== null ? points[hoverIndex] : null;

  function handlePointerMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = Math.min(1, Math.max(0, x / rect.width));
    const minute = ratio * maxMinute;
    let closest = 0;
    let closestDist = Infinity;
    points.forEach((p, i) => {
      const d = Math.abs(p.minute - minute);
      if (d < closestDist) {
        closestDist = d;
        closest = i;
      }
    });
    setHoverIndex(closest);
  }

  if (points.length === 0) {
    return <p className="text-sm text-muted-foreground">Todavía no hay datos de esta sesión.</p>;
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="Espectadores simultáneos por minuto"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={LINE_COLOR} stopOpacity="0.22" />
            <stop offset="100%" stopColor={LINE_COLOR} stopOpacity="0" />
          </linearGradient>
        </defs>

        {gridSteps.map((viewers) => (
          <g key={viewers}>
            <line
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={yFor(viewers)}
              y2={yFor(viewers)}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <text
              x={PAD_LEFT - 8}
              y={yFor(viewers)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={10}
              fill="var(--muted-foreground)"
            >
              {viewers}
            </text>
          </g>
        ))}

        <path d={areaPath} fill={`url(#${gradientId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={LINE_COLOR}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {hovered && (
          <>
            <line
              x1={xFor(hovered.minute)}
              x2={xFor(hovered.minute)}
              y1={PAD_TOP}
              y2={HEIGHT - PAD_BOTTOM}
              stroke="var(--border)"
              strokeWidth={1}
            />
            <circle
              cx={xFor(hovered.minute)}
              cy={yFor(hovered.concurrentViewers)}
              r={4}
              fill={LINE_COLOR}
              stroke="var(--card)"
              strokeWidth={2}
            />
          </>
        )}

        <rect
          x={PAD_LEFT}
          y={PAD_TOP}
          width={plotWidth}
          height={plotHeight}
          fill="transparent"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        />
      </svg>

      {hovered && (
        <div
          className="pointer-events-none absolute top-2 rounded-md border bg-popover px-2 py-1 text-xs shadow-md"
          style={{
            left: `${(xFor(hovered.minute) / WIDTH) * 100}%`,
            transform: "translateX(-50%)",
          }}
        >
          <p className="font-medium">Minuto {hovered.minute}</p>
          <p className="text-muted-foreground">{hovered.concurrentViewers} en la sala a la vez</p>
        </div>
      )}
    </div>
  );
}
