import { describe, expect, it } from "vitest";

import { parseDirectVideoUrl } from "./direct-video";

describe("parseDirectVideoUrl", () => {
  it("accepts an ordinary https URL", () => {
    expect(parseDirectVideoUrl("https://cdn.example.com/video.mp4")).toBe(
      "https://cdn.example.com/video.mp4"
    );
  });

  it("rejects a non-https URL", () => {
    expect(parseDirectVideoUrl("http://cdn.example.com/video.mp4")).toBeNull();
  });

  it("rejects something that isn't a URL at all", () => {
    expect(parseDirectVideoUrl("not a url")).toBeNull();
  });

  it("rejects an empty string", () => {
    expect(parseDirectVideoUrl("")).toBeNull();
  });

  // WW-P3-012: literal private/loopback/link-local hostnames -- a
  // defense-in-depth check against obviously-wrong input, not a real SSRF
  // guard (no WeWebinars server ever fetches this URL).
  it("rejects localhost and loopback addresses", () => {
    expect(parseDirectVideoUrl("https://localhost/video.mp4")).toBeNull();
    expect(parseDirectVideoUrl("https://127.0.0.1/video.mp4")).toBeNull();
  });

  it("rejects RFC1918 private ranges", () => {
    expect(parseDirectVideoUrl("https://10.0.0.5/video.mp4")).toBeNull();
    expect(parseDirectVideoUrl("https://192.168.1.1/video.mp4")).toBeNull();
    expect(parseDirectVideoUrl("https://172.16.0.1/video.mp4")).toBeNull();
  });

  it("rejects the link-local/cloud-metadata range", () => {
    expect(parseDirectVideoUrl("https://169.254.169.254/video.mp4")).toBeNull();
  });

  it("rejects IPv6 loopback and link-local addresses", () => {
    expect(parseDirectVideoUrl("https://[::1]/video.mp4")).toBeNull();
    expect(parseDirectVideoUrl("https://[fe80::1]/video.mp4")).toBeNull();
  });
});
