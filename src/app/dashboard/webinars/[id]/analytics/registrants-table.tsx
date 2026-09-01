"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { secondsToClock } from "@/lib/time";

type Registrant = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  computedSessionStart: string;
  createdAt: string;
  unsubscribedAt: string | null;
  lastPositionSeconds: number | null;
  score: number | null;
  tier: string | null;
};

const TIER_CLASSES: Record<string, string> = {
  caliente:
    "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300",
  tibio:
    "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300",
  frio: "border-sky-300 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-300",
};

const TIER_LABEL_KEYS: Record<string, "tierCaliente" | "tierTibio" | "tierFrio"> = {
  caliente: "tierCaliente",
  tibio: "tierTibio",
  frio: "tierFrio",
};

// null = default order; "watch"/"score" = sorted by that column, direction
// tracked separately. Clicking the same header cycles desc -> asc -> off.
type SortColumn = "watch" | "score";

export function RegistrantsTable({
  registrants,
  durationSeconds,
  leadScoringAllowed,
}: {
  registrants: Registrant[];
  durationSeconds: number;
  leadScoringAllowed: boolean;
}) {
  const t = useTranslations("AnalyticsTables");
  const locale = useLocale();
  const [sortColumn, setSortColumn] = useState<SortColumn | null>(null);
  const [sortDesc, setSortDesc] = useState(true);

  const sorted = useMemo(() => {
    if (sortColumn === null) return registrants;
    return [...registrants].sort((a, b) => {
      const av = sortColumn === "watch" ? a.lastPositionSeconds : a.score;
      const bv = sortColumn === "watch" ? b.lastPositionSeconds : b.score;
      // Registrants with no value for the sorted column (didn't attend, or
      // no score yet) stay at the bottom regardless of direction.
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return sortDesc ? bv - av : av - bv;
    });
  }, [registrants, sortColumn, sortDesc]);

  function toggleSort(column: SortColumn) {
    if (sortColumn !== column) {
      setSortColumn(column);
      setSortDesc(true);
    } else if (sortDesc) {
      setSortDesc(false);
    } else {
      setSortColumn(null);
    }
  }

  return (
    <div className="max-h-96 overflow-auto rounded-md border">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="sticky top-0 bg-muted/50">
          <tr>
            <th className="p-2 text-left font-medium">{t("nameHeader")}</th>
            <th className="p-2 text-left font-medium">{t("emailHeader")}</th>
            <th className="p-2 text-left font-medium">{t("phoneHeader")}</th>
            <th className="p-2 text-left font-medium">{t("statusHeader")}</th>
            <th className="p-2 text-left font-medium">{t("scheduleHeader")}</th>
            <th className="p-2 text-left font-medium">{t("registeredHeader")}</th>
            <th className="p-2 text-left font-medium">
              <button
                type="button"
                onClick={() => toggleSort("watch")}
                className="flex items-center gap-1 hover:text-foreground"
              >
                {t("lastMinuteWatchedHeader")}
                <ArrowUpDown className="size-3.5" />
              </button>
            </th>
            {leadScoringAllowed && (
              <th className="p-2 text-left font-medium">
                <button
                  type="button"
                  onClick={() => toggleSort("score")}
                  className="flex items-center gap-1 hover:text-foreground"
                >
                  {t("scoreHeader")}
                  <ArrowUpDown className="size-3.5" />
                </button>
              </th>
            )}
          </tr>
        </thead>
        <tbody>
          {sorted.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="p-2">{r.name}</td>
              <td className="p-2">{r.email}</td>
              <td className="p-2">{r.phone ?? "—"}</td>
              <td className="p-2">
                {r.unsubscribedAt ? (
                  <span
                    className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                    title={t("unsubscribedAtTitle", {
                      date: new Date(r.unsubscribedAt).toLocaleString(locale),
                    })}
                  >
                    {t("unsubscribedBadge")}
                  </span>
                ) : (
                  <span className="text-muted-foreground">{t("activeStatus")}</span>
                )}
              </td>
              <td className="p-2">{new Date(r.computedSessionStart).toLocaleString(locale)}</td>
              <td className="p-2">{new Date(r.createdAt).toLocaleString(locale)}</td>
              <td className="p-2">
                {r.lastPositionSeconds === null ? (
                  <span className="text-muted-foreground">{t("didNotAttend")}</span>
                ) : (
                  <>
                    {secondsToClock(r.lastPositionSeconds)}
                    {durationSeconds > 0 && (
                      <span className="text-muted-foreground">
                        {" "}
                        ({Math.round((r.lastPositionSeconds / durationSeconds) * 100)}%)
                      </span>
                    )}
                  </>
                )}
              </td>
              {leadScoringAllowed && (
                <td className="p-2">
                  {r.score === null ? (
                    <span className="text-muted-foreground">—</span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <span className="tabular-nums">{r.score}</span>
                      {r.tier && (
                        <span
                          className={`rounded-full border px-2 py-0.5 text-xs font-medium ${TIER_CLASSES[r.tier] ?? ""}`}
                        >
                          {t(TIER_LABEL_KEYS[r.tier] ?? "tierFrio")}
                        </span>
                      )}
                    </span>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
