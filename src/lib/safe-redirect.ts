// Both the OAuth callback route and the email-confirmation client page take
// a `next` query param and redirect the browser there after a successful
// login. That param is attacker-controlled (it round-trips through a login
// link an attacker can construct and send to a victim), so it must never be
// used as-is -- only a same-origin relative path is safe. A value like
// "https://evil.example.com" or "//evil.example.com" would otherwise send an
// authenticated user's browser straight off-platform immediately after a
// real, successful login, which is far more convincing than an ordinary
// phishing link.
export function sanitizeRedirectPath(
  next: string | null | undefined,
  fallback = "/dashboard"
): string {
  if (!next) return fallback;
  // Must start with exactly one "/" (rules out "//host/path" and
  // "/\evil.example.com", both of which browsers can treat as
  // protocol-relative) and must not contain "://" anywhere (rules out
  // "/redirect?to=https://evil.example.com" style values reaching a second
  // hop, and a bare "javascript:"/"data:" scheme).
  if (!next.startsWith("/") || next.startsWith("//") || next.includes("://")) {
    return fallback;
  }
  return next;
}
