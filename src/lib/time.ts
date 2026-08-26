// mm:ss <-> seconds helpers for timeline UIs (chat timestamps, CTA windows).

export function secondsToClock(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function clockToSeconds(clock: string): number | null {
  const match = clock.trim().match(/^(\d+):([0-5]?\d)$/);
  if (!match) return null;
  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  return minutes * 60 + seconds;
}

// Whole days remaining until `isoDate`, rounded up (1 minute past midnight
// still counts as "1 day left"), floored at 0. Reads the current time, so
// callers in render bodies (Server Components) should call this from a
// plain helper rather than `Date.now()` directly.
export function daysUntil(isoDate: string): number {
  const diffMs = new Date(isoDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diffMs / (24 * 60 * 60 * 1000)));
}
