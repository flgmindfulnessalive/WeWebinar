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
