// Deterministic-but-organic "N people connected" curve. Pure function of
// (seed, elapsed) — no per-connection server state, per the platform's
// scalability requirement (recomputed on demand, client and server alike).
// Seeding on webinar_id + the concrete session start means every attendee
// of the *same* session sees the same curve, while different sessions (or
// different webinars) get visibly different ones.

export function hash32(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number) {
  let a = seed;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothstep(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  return x * x * (3 - 2 * x);
}

type NoiseComponent = { freq: number; phase: number; amp: number };

function noiseComponents(seed: string, count: number): NoiseComponent[] {
  const rand = mulberry32(hash32(seed));
  return Array.from({ length: count }, () => ({
    freq: 0.05 + rand() * 0.2,
    phase: rand() * Math.PI * 2,
    amp: rand(),
  }));
}

const PRE_SHOW_RAMP_SECONDS = 300; // waiting room counter starts climbing 5 min out
const POST_SHOW_DRAIN_SECONDS = 120; // once it ends, viewers "leave" down to 0 over 2 min

/**
 * @param elapsedSeconds Negative while in the waiting room (seconds until
 *   start), 0..durationSeconds during playback, and can keep growing past
 *   durationSeconds once the webinar has ended (drives the post-show drain
 *   toward 0 below).
 */
export function fakeViewerCount({
  seed,
  elapsedSeconds,
  durationSeconds,
  min,
  max,
}: {
  seed: string;
  elapsedSeconds: number;
  durationSeconds: number;
  min: number;
  max: number;
}): number {
  // Once the webinar has ended, people leave -- keep draining the count
  // down to 0 over POST_SHOW_DRAIN_SECONDS instead of holding forever at
  // wherever the live curve happened to land.
  if (durationSeconds > 0 && elapsedSeconds > durationSeconds) {
    const atEnd = fakeViewerCount({ seed, elapsedSeconds: durationSeconds, durationSeconds, min, max });
    const drainT = smoothstep((elapsedSeconds - durationSeconds) / POST_SHOW_DRAIN_SECONDS);
    return Math.max(0, Math.round(atEnd * (1 - drainT)));
  }

  const range = Math.max(1, max - min);

  let envelope: number;
  if (elapsedSeconds < 0) {
    const t = Math.max(0, 1 + elapsedSeconds / PRE_SHOW_RAMP_SECONDS);
    envelope = 0.15 + 0.55 * smoothstep(t);
  } else if (durationSeconds <= 0) {
    envelope = 0.7;
  } else {
    const t = Math.min(1, elapsedSeconds / durationSeconds);
    if (t < 0.05) {
      envelope = 0.7 + 0.3 * smoothstep(t / 0.05);
    } else if (t < 0.9) {
      envelope = 1;
    } else {
      envelope = 1 - 0.35 * smoothstep((t - 0.9) / 0.1);
    }
  }

  const components = noiseComponents(seed, 3);
  const minutes = elapsedSeconds / 60;
  const noise =
    components.reduce((sum, c) => sum + Math.sin(c.freq * minutes + c.phase) * c.amp, 0) /
    components.length;

  const value = min + envelope * range + noise * range * 0.08;
  return Math.round(Math.max(min, Math.min(max, value)));
}

// Picked once per webinar at creation time (not part of the deterministic
// per-session curve above) so different webinars don't all peak at the same
// "80 conectados" -- each gets its own plausible ceiling instead. The owner
// can still override both numbers afterward from the waiting room settings.
export function randomFakeViewerRange(): { min: number; max: number } {
  const max = 35 + Math.floor(Math.random() * (98 - 35 + 1)); // 35..98
  const min = Math.max(5, Math.round(max * 0.3));
  return { min, max };
}
