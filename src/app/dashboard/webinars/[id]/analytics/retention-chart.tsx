"use client";

import { useId, useMemo, useState } from "react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { secondsToClock } from "@/lib/time";

type Point = { minute: number; viewersRemaining: number; pct: number };

const WIDTH = 640;
const HEIGHT = 220;
const PAD_LEFT = 36;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 24;

// Brand indigo instead of the dashboard's grayscale --primary token --
// this chart is the one place a host judges "is this webinar working",
// and it read as flat gray before. No semaphore semantics here (single
// series, single hue) -- just the same brand color used elsewhere.
const LINE_COLOR = "#4f46e5";

export function RetentionChart({ points }: { points: Point[] }) {
  const t = useTranslations("AnalyticsCharts");
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const gradientId = useId();

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const maxMinute = points.length > 0 ? points[points.length - 1].minute : 0;

  const xFor = (minute: number) =>
    PAD_LEFT + (maxMinute === 0 ? 0 : (minute / maxMinute) * plotWidth);
  const yFor = (pct: number) => PAD_TOP + plotHeight - (pct / 100) * plotHeight;

  const linePath = useMemo(
    () => points.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(p.minute)} ${yFor(p.pct)}`).join(" "),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [points, maxMinute]
  );
  const areaPath = useMemo(() => {
    if (points.length === 0) return "";
    const base = `${linePath} L ${xFor(points[points.length - 1].minute)} ${yFor(0)} L ${xFor(points[0].minute)} ${yFor(0)} Z`;
    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linePath, points]);

  const gridPcts = [0, 25, 50, 75, 100];
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
    return <p className="text-sm text-muted-foreground">{t("noWatchData")}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label={t("retentionAriaLabel")}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={LINE_COLOR} stopOpacity="0.22" />
              <stop offset="100%" stopColor={LINE_COLOR} stopOpacity="0" />
            </linearGradient>
          </defs>

          {gridPcts.map((pct) => (
            <g key={pct}>
              <line
                x1={PAD_LEFT}
                x2={WIDTH - PAD_RIGHT}
                y1={yFor(pct)}
                y2={yFor(pct)}
                stroke="var(--border)"
                strokeWidth={1}
              />
              <text x={PAD_LEFT - 8} y={yFor(pct)} textAnchor="end" dominantBaseline="middle" fontSize={10} fill="var(--muted-foreground)">
                {pct}%
              </text>
            </g>
          ))}

          <path d={areaPath} fill={`url(#${gradientId})`} />
          <path d={linePath} fill="none" stroke={LINE_COLOR} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />

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
                cy={yFor(hovered.pct)}
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
            <p className="font-medium">{t("minuteTooltip", { minute: hovered.minute })}</p>
            <p className="text-muted-foreground">
              {t("viewersTooltip", { count: hovered.viewersRemaining, pct: hovered.pct })}
            </p>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{t("retentionCaption")}</p>
        <Button size="sm" variant="ghost" onClick={() => setShowTable((s) => !s)}>
          {showTable ? t("hideTable") : t("showTable")}
        </Button>
      </div>

      {showTable && (
        <div className="max-h-48 overflow-y-auto rounded-md border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted/50">
              <tr>
                <th className="p-2 text-left font-medium">{t("tableMinuteHeader")}</th>
                <th className="p-2 text-left font-medium">{t("tableViewersHeader")}</th>
                <th className="p-2 text-left font-medium">{t("tablePercentHeader")}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((p) => (
                <tr key={p.minute} className="border-t">
                  <td className="p-2">{secondsToClock(p.minute * 60)}</td>
                  <td className="p-2">{p.viewersRemaining}</td>
                  <td className="p-2">{p.pct}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
