import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// WW-P2-015: the outbound-webhooks feature only ever checked the URL's
// scheme at creation time (`^https:\/\//i`), which a 302 redirect to a
// private/internal/metadata address bypasses entirely -- Node's default
// fetch follows redirects (including scheme downgrades), so the delivered
// request can land on 169.254.169.254, localhost, or any RFC1918 address
// reachable from wherever the function's egress can reach, with the
// response readable back by the account via webhook_deliveries. This
// resolves and re-checks every hop instead of trusting the origin URL.

const MAX_REDIRECTS = 5;

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true; // link-local, includes the cloud metadata address
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  if (a >= 224) return true; // multicast (224-239) + reserved (240-255)
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === "::1" || normalized === "::") return true;
  if (normalized.startsWith("fe80:")) return true; // link-local
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // unique local
  const mapped = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return false;
}

// Exported for regression testing (see ssrf-guard.test.ts) -- pure and
// synchronous, unlike safeFetch itself which needs a real DNS lookup.
export function isPrivateAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isPrivateIPv4(ip);
  if (version === 6) return isPrivateIPv6(ip);
  return true; // unresolvable/unknown shape -- fail closed
}

export class SsrfBlockedError extends Error {}

// Drop-in replacement for fetch() that resolves the hostname and rejects
// private/loopback/link-local/multicast/reserved ranges before every
// request, including after each redirect hop (redirect: "manual" plus a
// manual follow-loop, so a same-origin-looking 302 can't hand off to an
// unchecked address).
export async function safeFetch(initialUrl: string, init: RequestInit = {}): Promise<Response> {
  let currentUrl = initialUrl;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const parsed = new URL(currentUrl);
    if (parsed.protocol !== "https:") {
      throw new SsrfBlockedError(`blocked non-https url on hop ${hop}`);
    }

    const { address } = await lookup(parsed.hostname);
    if (isPrivateAddress(address)) {
      throw new SsrfBlockedError(`blocked private/reserved address (${address}) on hop ${hop}`);
    }

    const response = await fetch(currentUrl, { ...init, redirect: "manual" });

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) return response;
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    return response;
  }

  throw new SsrfBlockedError("too many redirects");
}
