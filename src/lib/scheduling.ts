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
  return new Date(instant);
}

export type FixedSchedule = {
  id: string;
  day_of_week: number | null; // 0=Sunday..6=Saturday, null = every day
  time_of_day: string; // "HH:MM:SS"
  timezone: string;
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
