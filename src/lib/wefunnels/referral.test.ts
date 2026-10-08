import { afterEach, describe, expect, it, vi } from "vitest";

import { REFERRAL_WINDOW_DAYS, parseTouch, serializeTouch } from "./referral";

const DAY = 86_400_000;

afterEach(() => {
  vi.useRealTimers();
});

describe("parseTouch", () => {
  it("round-trips a fresh touch", () => {
    const touchedAt = new Date("2026-10-01T10:00:00Z");
    vi.useFakeTimers().setSystemTime(new Date("2026-10-05T10:00:00Z"));

    const parsed = parseTouch(serializeTouch("carlosmedina", touchedAt));

    expect(parsed).toEqual({ slug: "carlosmedina", touchedAt });
  });

  it("keeps a touch on the last day of the window", () => {
    const now = new Date("2026-10-05T10:00:00Z");
    vi.useFakeTimers().setSystemTime(now);
    const touchedAt = new Date(now.getTime() - (REFERRAL_WINDOW_DAYS - 1) * DAY);

    expect(parseTouch(serializeTouch("carlosmedina", touchedAt))?.slug).toBe("carlosmedina");
  });

  // The window is what stops a click from eight months ago beating nobody
  // and earning a commission it did not produce.
  it("drops a touch past the window", () => {
    const now = new Date("2026-10-05T10:00:00Z");
    vi.useFakeTimers().setSystemTime(now);
    const touchedAt = new Date(now.getTime() - (REFERRAL_WINDOW_DAYS + 1) * DAY);

    expect(parseTouch(serializeTouch("carlosmedina", touchedAt))).toBeNull();
  });

  // The value reaches us from the client, so a timestamp in the future is
  // someone extending their own window rather than a clock skew worth
  // accommodating.
  it("drops a touch dated in the future", () => {
    const now = new Date("2026-10-05T10:00:00Z");
    vi.useFakeTimers().setSystemTime(now);
    const touchedAt = new Date(now.getTime() + 2 * DAY);

    expect(parseTouch(serializeTouch("carlosmedina", touchedAt))).toBeNull();
  });

  it("reads nothing as no touch", () => {
    expect(parseTouch(undefined)).toBeNull();
    expect(parseTouch("")).toBeNull();
  });

  it("rejects a malformed cookie", () => {
    expect(parseTouch("carlosmedina")).toBeNull();
    expect(parseTouch("carlosmedina.abc")).toBeNull();
    expect(parseTouch(".123456789")).toBeNull();
    expect(parseTouch("carlosmedina.-1")).toBeNull();
  });

  // A slug that could not have been claimed cannot have referred anyone,
  // and refusing it here keeps anything odd out of the RPC call.
  it("rejects a slug that is not a valid name", () => {
    vi.useFakeTimers().setSystemTime(new Date("2026-10-05T10:00:00Z"));
    const stamp = Date.now();

    expect(parseTouch(`Carlos.${stamp}`)).toBeNull();
    expect(parseTouch(`-carlos.${stamp}`)).toBeNull();
    expect(parseTouch(`carlos_medina.${stamp}`)).toBeNull();
    expect(parseTouch(`ab.${stamp}`)).toBeNull();
  });

  // Slugs cannot contain a dot, so splitting on the last one keeps the
  // parse unambiguous no matter what came before it.
  it("splits on the last dot", () => {
    vi.useFakeTimers().setSystemTime(new Date("2026-10-05T10:00:00Z"));

    expect(parseTouch(`carlos-medina.${Date.now()}`)?.slug).toBe("carlos-medina");
  });
});
