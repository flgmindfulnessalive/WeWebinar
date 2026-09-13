import { describe, expect, it } from "vitest";

import { isPrivateAddress } from "./ssrf-guard";

// WW-P2-015: safeFetch itself needs a real DNS lookup (that's the whole
// point -- resolving the hostname is what defeats a redirect-based
// bypass), so this tests only the pure address-classification function it
// relies on to decide "private or not" once resolved.
describe("isPrivateAddress", () => {
  it("rejects loopback", () => {
    expect(isPrivateAddress("127.0.0.1")).toBe(true);
  });

  it("rejects RFC1918 private ranges", () => {
    expect(isPrivateAddress("10.0.0.5")).toBe(true);
    expect(isPrivateAddress("172.16.0.1")).toBe(true);
    expect(isPrivateAddress("172.31.255.255")).toBe(true);
    expect(isPrivateAddress("192.168.1.1")).toBe(true);
  });

  it("rejects link-local, including the cloud metadata address", () => {
    expect(isPrivateAddress("169.254.169.254")).toBe(true);
    expect(isPrivateAddress("169.254.1.1")).toBe(true);
  });

  it("rejects CGNAT and multicast/reserved ranges", () => {
    expect(isPrivateAddress("100.64.0.1")).toBe(true);
    expect(isPrivateAddress("224.0.0.1")).toBe(true);
    expect(isPrivateAddress("255.255.255.255")).toBe(true);
  });

  it("accepts an ordinary public IPv4 address", () => {
    expect(isPrivateAddress("93.184.216.34")).toBe(false);
    expect(isPrivateAddress("8.8.8.8")).toBe(false);
  });

  it("rejects IPv6 loopback, link-local, and unique-local addresses", () => {
    expect(isPrivateAddress("::1")).toBe(true);
    expect(isPrivateAddress("fe80::1")).toBe(true);
    expect(isPrivateAddress("fd00::1")).toBe(true);
  });

  it("rejects an IPv4-mapped IPv6 private address", () => {
    expect(isPrivateAddress("::ffff:127.0.0.1")).toBe(true);
    expect(isPrivateAddress("::ffff:10.0.0.1")).toBe(true);
  });

  it("accepts an ordinary public IPv6 address", () => {
    expect(isPrivateAddress("2001:4860:4860::8888")).toBe(false);
  });

  it("fails closed on something that isn't a valid IP at all", () => {
    expect(isPrivateAddress("not-an-ip")).toBe(true);
  });
});
