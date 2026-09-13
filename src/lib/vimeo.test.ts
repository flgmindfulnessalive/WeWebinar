import { describe, expect, it } from "vitest";

import { extractVimeoVideoId } from "./vimeo";

describe("extractVimeoVideoId", () => {
  it("accepts a bare numeric id", () => {
    expect(extractVimeoVideoId("123456789")).toBe("123456789");
  });

  it("accepts a plain vimeo.com URL", () => {
    expect(extractVimeoVideoId("https://vimeo.com/123456789")).toBe("123456789");
  });

  it("accepts a vimeo.com URL with a valid privacy hash", () => {
    expect(extractVimeoVideoId("https://vimeo.com/123456789/abcDEF123")).toBe(
      "123456789:abcDEF123"
    );
  });

  it("accepts a player.vimeo.com URL with a valid ?h= hash", () => {
    expect(extractVimeoVideoId("https://player.vimeo.com/video/123456789?h=abcDEF123")).toBe(
      "123456789:abcDEF123"
    );
  });

  // WW-P2-008: a malformed hash used to be silently dropped, returning the
  // bare id -- the wizard would then save a "hidden" video with no hash at
  // all, which 403s live instead of failing the save with a clear error.
  it("rejects a vimeo.com URL whose hash segment fails the pattern", () => {
    expect(extractVimeoVideoId("https://vimeo.com/123456789/abc-def")).toBeNull();
  });

  it("rejects a player.vimeo.com URL whose ?h= hash fails the pattern", () => {
    expect(extractVimeoVideoId("https://player.vimeo.com/video/123456789?h=abc-def")).toBeNull();
  });

  it("rejects an invalid id", () => {
    expect(extractVimeoVideoId("not-a-video")).toBeNull();
  });

  it("rejects an unrecognized host", () => {
    expect(extractVimeoVideoId("https://example.com/123456789")).toBeNull();
  });
});
