// Server-side helpers to turn recurring "fixed" schedules (day-of-week +
// wall-clock time + IANA timezone) into concrete UTC instants. Everything
// here works off Date/UTC math + Intl — no extra timezone library.

type WallTime = {
  year: number;
  month: number; // 1-12
  day: number;
  hour: number;
  minute: number;
};

function getCivilPartsInZone(instant: Date, timeZone: string): WallTime {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(instant);

  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
  };
}

/** Offset (ms) such that `instant.getTime() + offset` equals the same
 * instant read as if its wall-clock parts in `timeZone` were UTC. */
function tzOffsetMs(instant: Date, timeZone: string): number {
  const civil = getCivilPartsInZone(instant, timeZone);
  const asUtc = Date.UTC(civil.year, civil.month - 1, civil.day, civil.hour, civil.minute);
  return asUtc - instant.getTime();
}

/** Converts a wall-clock time meant to be read in `timeZone` into the UTC
 * instant it represents. Self-corrects across a DST boundary in one extra
 * pass, same approach date-fns-tz/Luxon use internally. */
export function zonedWallTimeToUtc(wall: WallTime, timeZone: string): Date {
  const naive = Date.UTC(wall.year, wall.month - 1, wall.day, wall.hour, wall.minute);
  let offset = tzOffsetMs(new Date(naive), timeZone);
  let instant = naive - offset;
  offset = tzOffsetMs(new Date(instant), timeZone);
  instant = naive - offset;

  // WW-P3-002: a wall time that falls inside a DST "spring forward" gap
  // (e.g. 02:30 on the day clocks jump from 02:00 to 03:00) doesn't exist,
  // so the two-pass correction above -- which assumes the offset it finds
  // is stable -- silently converges on the *pre-transition* offset,
  // returning a real instant that reads back an hour earlier than what was
  // actually requested (02:30 becomes 01:30). Detect that mismatch and
  // shift forward by the gap, landing just after the transition instead
  // (02:30 -> 03:30) -- the same convention Luxon/date-fns-tz use. A
  // fall-back "ambiguous" time (occurs twice) isn't a gap and is left as
  // whichever of the two valid instants the two-pass correction already
  // finds -- there's no "wrong" choice there.
  const resolved = getCivilPartsInZone(new Date(instant), timeZone);
  const resolvedMinutes = resolved.hour * 60 + resolved.minute;
  const requestedMinutes = wall.hour * 60 + wall.minute;
  if (
    resolved.year === wall.year &&
    resolved.month === wall.month &&
    resolved.day === wall.day &&
    resolvedMinutes < requestedMinutes
  ) {
    instant += (requestedMinutes - resolvedMinutes) * 60_000;
  }

  return new Date(instant);
}

export type FixedSchedule = {
  id: string;
  day_of_week: number | null; // 0=Sunday..6=Saturday, null = every day
  time_of_day: string; // "HH:MM:SS"
  timezone: string;
  exclude_weekends?: boolean; // only meaningful when day_of_week is null
};

export type UpcomingOccurrence = {
  scheduleId: string;
  startsAt: Date;
};

/** Expands recurring schedules into concrete upcoming UTC instants,
 * looking `daysAhead` calendar days out from `from`, capped at `limit`. */
export function computeUpcomingOccurrences(
  schedules: FixedSchedule[],
  { from = new Date(), daysAhead = 21, limit = 12 }: { from?: Date; daysAhead?: number; limit?: number } = {}
): UpcomingOccurrence[] {
  if (schedules.length === 0) return [];

  const results: UpcomingOccurrence[] = [];

  for (const schedule of schedules) {
    const startCivil = getCivilPartsInZone(from, schedule.timezone);
    const [hh, mm] = schedule.time_of_day.split(":").map(Number);

    for (let d = 0; d < daysAhead; d++) {
      // Calendar-date arithmetic (not instant arithmetic) — timezone-
      // independent, so plain UTC-based Date math is safe here.
      const candidateDate = new Date(Date.UTC(startCivil.year, startCivil.month - 1, startCivil.day + d));
      const weekday = candidateDate.getUTCDay();

      if (schedule.day_of_week !== null && schedule.day_of_week !== weekday) continue;
      if (schedule.exclude_weekends && (weekday === 0 || weekday === 6)) continue;

      const startsAt = zonedWallTimeToUtc(
        {
          year: candidateDate.getUTCFullYear(),
          month: candidateDate.getUTCMonth() + 1,
          day: candidateDate.getUTCDate(),
          hour: hh,
          minute: mm,
        },
        schedule.timezone
      );

      if (startsAt.getTime() >= from.getTime()) {
        results.push({ scheduleId: schedule.id, startsAt });
      }
    }
  }

  results.sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  return results.slice(0, limit);
}
