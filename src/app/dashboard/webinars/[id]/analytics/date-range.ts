import { zonedWallTimeToUtc } from "@/lib/scheduling";

export type AnalyticsRange = "today" | "week" | "month" | "all";

export const ANALYTICS_RANGES: AnalyticsRange[] = ["today", "week", "month", "all"];

export function parseAnalyticsRange(value: string | undefined): AnalyticsRange {
  return ANALYTICS_RANGES.includes(value as AnalyticsRange) ? (value as AnalyticsRange) : "all";
}

function civilDateInZone(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: get("year"), month: get("month"), day: get("day") };
}

// "Today" is the account's own calendar day, not a rolling 24h window --
// otherwise a host checking analytics at 1am would see "today" span into
// yesterday's registrants. "Last 7 days" and "this month" follow the same
// civil-calendar logic, just further back.
export function analyticsRangeToDates(
  range: AnalyticsRange,
  timezone: string,
  now: Date = new Date()
): { start: string | null; end: string | null } {
  if (range === "all") return { start: null, end: null };

  const today = civilDateInZone(now, timezone);

  if (range === "today") {
    const start = zonedWallTimeToUtc({ ...today, hour: 0, minute: 0 }, timezone);
    return { start: start.toISOString(), end: null };
  }

  if (range === "week") {
    const sixDaysAgo = new Date(Date.UTC(today.year, today.month - 1, today.day - 6));
    const start = zonedWallTimeToUtc(
      {
        year: sixDaysAgo.getUTCFullYear(),
        month: sixDaysAgo.getUTCMonth() + 1,
        day: sixDaysAgo.getUTCDate(),
        hour: 0,
        minute: 0,
      },
      timezone
    );
    return { start: start.toISOString(), end: null };
  }

  const start = zonedWallTimeToUtc({ year: today.year, month: today.month, day: 1, hour: 0, minute: 0 }, timezone);
  return { start: start.toISOString(), end: null };
}
