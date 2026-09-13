import { describe, expect, it } from "vitest";

import { zonedWallTimeToUtc } from "./scheduling";

// Node's Intl carries the real IANA tz database, so DST transitions are
// deterministic here -- no live system or "real" clock needed to verify
// this (WW-P3-002 was previously flagged as needing live testing before a
// fix; that turned out not to be true for this specific bug class).
describe("zonedWallTimeToUtc", () => {
  it("converts an ordinary wall time correctly", () => {
    const result = zonedWallTimeToUtc({ year: 2024, month: 7, day: 15, hour: 14, minute: 0 }, "America/New_York");
    expect(result.toISOString()).toBe("2024-07-15T18:00:00.000Z"); // EDT, UTC-4
  });

  // WW-P3-002: 2024-03-10 in America/New_York is a DST "spring forward"
  // day -- clocks jump from 02:00 to 03:00, so 02:30 never happens.
  it("shifts a nonexistent spring-forward wall time forward past the gap", () => {
    const result = zonedWallTimeToUtc(
      { year: 2024, month: 3, day: 10, hour: 2, minute: 30 },
      "America/New_York"
    );
    // Before the fix this silently returned 01:30 EST (an hour earlier
    // than requested); it should land just after the transition instead.
    expect(result.toISOString()).toBe("2024-03-10T07:30:00.000Z");
  });

  it("leaves a wall time just before the spring-forward gap untouched", () => {
    const result = zonedWallTimeToUtc(
      { year: 2024, month: 3, day: 10, hour: 1, minute: 59 },
      "America/New_York"
    );
    expect(result.toISOString()).toBe("2024-03-10T06:59:00.000Z");
  });

  it("leaves a wall time exactly at/after the spring-forward gap untouched", () => {
    const result = zonedWallTimeToUtc(
      { year: 2024, month: 3, day: 10, hour: 3, minute: 0 },
      "America/New_York"
    );
    expect(result.toISOString()).toBe("2024-03-10T07:00:00.000Z");
  });

  it("handles a spring-forward gap in a different (Southern Hemisphere) timezone", () => {
    // Australia/Sydney springs forward in October, not March.
    const result = zonedWallTimeToUtc(
      { year: 2024, month: 10, day: 6, hour: 2, minute: 30 },
      "Australia/Sydney"
    );
    expect(result.toISOString()).toBe("2024-10-05T16:30:00.000Z");
  });

  // 2024-11-03 in America/New_York is the DST "fall back" day -- 01:30
  // occurs twice. Both readings are real instants; this just locks in
  // that the function returns *a* valid one rather than throwing/drifting.
  it("returns a valid instant for an ambiguous fall-back wall time", () => {
    const result = zonedWallTimeToUtc(
      { year: 2024, month: 11, day: 3, hour: 1, minute: 30 },
      "America/New_York"
    );
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hourCycle: "h23",
      hour: "2-digit",
      minute: "2-digit",
    }).formatToParts(result);
    const hour = Number(parts.find((p) => p.type === "hour")?.value);
    const minute = Number(parts.find((p) => p.type === "minute")?.value);
    expect(hour).toBe(1);
    expect(minute).toBe(30);
  });

  it("handles a timezone with no DST at all", () => {
    const result = zonedWallTimeToUtc({ year: 2024, month: 3, day: 10, hour: 2, minute: 30 }, "UTC");
    expect(result.toISOString()).toBe("2024-03-10T02:30:00.000Z");
  });
});
