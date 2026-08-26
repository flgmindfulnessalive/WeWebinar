// wewebinars.com and www.wewebinars.com both serve the app, and are
// different cookie scopes by default -- a session/PKCE cookie set while one
// host handled a request isn't visible once the other host handles the
// next one (e.g. sign up on one, click the email confirmation link that
// opens on the other). Scoping the cookie to the parent domain makes it
// visible on both. Only applies to the real production deployment; preview
// deployments and local dev keep the default host-scoped cookie, since a
// mismatched Domain attribute makes browsers reject the cookie outright.
export function getSupabaseCookieDomain(): string | undefined {
  if (process.env.VERCEL_ENV !== "production") return undefined;

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return undefined;

  try {
    const root = new URL(appUrl).hostname.replace(/^www\./, "");
    return `.${root}`;
  } catch {
    return undefined;
  }
}
