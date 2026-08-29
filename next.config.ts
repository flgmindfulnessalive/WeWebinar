import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

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
