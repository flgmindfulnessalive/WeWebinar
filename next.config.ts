import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

// Short vanity links for places a full URL doesn't fit or doesn't get
// clicked: an Instagram bio, a DM, a QR code, a slide. One slug per
// distribution channel, because the suffix is what makes the arrival
// attributable: growth-beacon.tsx reads utm_source/utm_medium/
// utm_campaign off the *landing* URL, so the UTMs have to travel with
// the redirect. Without them the channel lives only in the slug, the
// visit lands as direct traffic, and /growth/analytics can't tell where
// it came from.
//
// These slugs sit outside proxy.ts's isLocaleRoutedPath() allowlist on
// purpose -- a short link is one fixed destination, not a localized
// route, so it must never pick up an /en prefix of its own.
const SHORT_LINKS = [
  {
    slug: "wstartk-ig",
    destination: "/en/whop/evergreen-starter-kit",
    utm: { source: "instagram", medium: "social", campaign: "evergreen-starter-kit" },
  },
] as const;

const nextConfig: NextConfig = {
  // Skip auto-generating AGENTS.md/CLAUDE.md on every `next dev` — this
  // repo already has its own README/CLAUDE conventions.
  agentRules: false,

  // The PDF report route reads these TTFs via fs at request time (not
  // `import`), so Vercel's build-time file tracer can't discover them on
  // its own -- without this they'd be missing from the serverless bundle.
  outputFileTracingIncludes: {
    "/api/webinars/[id]/report/route": ["./public/fonts/report/**/*"],
  },

  // Baseline security headers. No page in this app embeds itself (or
  // needs to be embeddable) in an iframe -- the only <iframe> anywhere is
  // the YouTube player's own, a different origin, unaffected by
  // X-Frame-Options -- so DENY is safe. A full Content-Security-Policy is
  // deliberately left out for now: getting it right for the live YouTube
  // embed, Google OAuth, and Supabase without silently breaking the
  // player needs real testing, not a first pass shipped right before
  // founding members start using the product.
  async redirects() {
    return SHORT_LINKS.map(({ slug, destination, utm }) => ({
      source: `/${slug}`,
      destination: `${destination}?utm_source=${utm.source}&utm_medium=${utm.medium}&utm_campaign=${utm.campaign}`,
      // Temporary (307) on purpose, not permanent. A bio link gets
      // repointed at whatever the current offer is, and browsers cache a
      // permanent redirect indefinitely -- everyone who ever clicked the
      // old one would keep landing on the retired page with no way to
      // fix it from our side. Nothing here is meant to be indexed, so
      // there's no SEO equity to preserve either.
      permanent: false,
    }));
  },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default withNextIntl(nextConfig);
