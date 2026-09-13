import { describe, expect, it } from "vitest";

import { sanitizeRedirectPath } from "./safe-redirect";

describe("sanitizeRedirectPath", () => {
  it("passes through an ordinary relative path", () => {
    expect(sanitizeRedirectPath("/dashboard/webinars")).toBe("/dashboard/webinars");
  });

  it("falls back when next is missing", () => {
    expect(sanitizeRedirectPath(null)).toBe("/dashboard");
    expect(sanitizeRedirectPath(undefined)).toBe("/dashboard");
    expect(sanitizeRedirectPath("")).toBe("/dashboard");
  });

  it("rejects an absolute external URL", () => {
    expect(sanitizeRedirectPath("https://evil.example.com")).toBe("/dashboard");
  });

  it("rejects a protocol-relative URL", () => {
    expect(sanitizeRedirectPath("//evil.example.com")).toBe("/dashboard");
  });

  it("rejects a value embedding a second scheme", () => {
    expect(sanitizeRedirectPath("/redirect?to=https://evil.example.com")).toBe("/dashboard");
  });

  it("rejects a value not starting with a slash", () => {
    expect(sanitizeRedirectPath("evil.example.com")).toBe("/dashboard");
    expect(sanitizeRedirectPath("javascript:alert(1)")).toBe("/dashboard");
  });

  it("honors a custom fallback", () => {
    expect(sanitizeRedirectPath("https://evil.example.com", "/login")).toBe("/login");
  });
});
