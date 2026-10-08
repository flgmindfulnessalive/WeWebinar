import { describe, expect, it } from "vitest";

import { isLikelyBot, visitCookieName } from "./visits";

describe("isLikelyBot", () => {
  it("does not count link-preview crawlers or missing user agents", () => {
    expect(isLikelyBot("facebookexternalhit/1.1")).toBe(true);
    expect(isLikelyBot("WhatsApp/2.23.20.0")).toBe(true);
    expect(isLikelyBot("Mozilla/5.0 (compatible; Googlebot/2.1)")).toBe(true);
    expect(isLikelyBot("Mozilla/5.0 HeadlessChrome/120.0")).toBe(true);
    expect(isLikelyBot(null)).toBe(true);
  });

  it("counts ordinary browsers", () => {
    expect(
      isLikelyBot("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148")
    ).toBe(false);
    expect(isLikelyBot("Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/129.0 Safari/537.36")).toBe(false);
  });
});

describe("visitCookieName", () => {
  it("is one cookie per page and slug", () => {
    expect(visitCookieName("funnel", "ana-torres")).toBe("wfv_funnel_ana-torres");
    expect(visitCookieName("gift", "ana-torres")).toBe("wfv_gift_ana-torres");
  });

  it("never carries characters outside the slug alphabet", () => {
    expect(visitCookieName("funnel", "ana;torres=1")).toBe("wfv_funnel_anatorres1");
  });
});
