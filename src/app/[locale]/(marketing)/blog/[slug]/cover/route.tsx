import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

import { routing } from "@/i18n/routing";
import { getPost } from "@/lib/blog";

// A plain Route Handler rather than Next's opengraph-image.tsx file
// convention: that convention silently 404s here once nested inside a
// route group ((marketing)) plus a dynamic segment ([slug]) -- confirmed
// with a full cache clear and dev-server restart, not a stale-build
// artifact. A Route Handler always serves at its literal folder path in
// both dev and prod, so it sidesteps the issue entirely. Doubles as both
// the real Open Graph image (what WhatsApp/X/LinkedIn show when a post is
// shared, wired manually via generateMetadata's openGraph.images) and the
// cover image rendered in the app itself (blog index cards, post hero) --
// one generated image instead of maintaining separate social and in-app
// assets. Same visual language as the root opengraph-image.tsx (grid,
// blurred brand orbs, thin gradient rule) so the blog reads as the same
// product, not a bolted-on section.
export const runtime = "nodejs";

const SIZE = { width: 1200, height: 630 };
const BRAND = "#4f46e5";
const BRAND_2 = "#c026d3";
const INK = "#18181b";
const MUTED = "#6b6b7b";
const BORDER = "rgba(24,24,27,0.08)";
const TITLE_MAX_LENGTH = 90;

type Locale = (typeof routing.locales)[number];

// Deterministic pseudo-random offset per slug (not Math.random(), which
// would make this image non-reproducible across requests/CDN caching) so
// each post's orb placement shifts slightly instead of every cover
// looking identical.
function seededOffset(slug: string): number {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return (hash % 1000) / 1000;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ locale: string; slug: string }> }
) {
  const { locale, slug } = await params;
  const post = getPost(locale as Locale, slug);
  const rawTitle = post?.title ?? "WeWebinars Blog";
  const title =
    rawTitle.length > TITLE_MAX_LENGTH ? `${rawTitle.slice(0, TITLE_MAX_LENGTH - 1)}…` : rawTitle;

  const offset = seededOffset(slug);
  const orbTop = -140 + offset * 90;
  const orbBottom = -180 + (1 - offset) * 90;

  const fontsDir = join(process.cwd(), "src/app/og-fonts");
  const [bold, regular, mark] = await Promise.all([
    readFile(join(fontsDir, "Geist-Bold.ttf")),
    readFile(join(fontsDir, "Geist-Regular.ttf")),
    readFile(join(process.cwd(), "public/brand/w-mark.png")),
  ]);
  const markDataUrl = `data:image/png;base64,${mark.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "#fcfcfd",
          fontFamily: "Geist",
        }}
      >
        <div
          style={{
            display: "flex",
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(to right, rgba(24,24,27,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(24,24,27,0.05) 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />

        <div
          style={{
            display: "flex",
            position: "absolute",
            top: orbTop,
            left: -80,
            width: 480,
            height: 480,
            borderRadius: 9999,
            background: BRAND,
            opacity: 0.28,
            filter: "blur(90px)",
          }}
        />
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: orbBottom,
            right: -80,
            width: 460,
            height: 460,
            borderRadius: 9999,
            background: BRAND_2,
            opacity: 0.2,
            filter: "blur(90px)",
          }}
        />

        <div
          style={{
            display: "flex",
            position: "absolute",
            inset: 20,
            border: `1px solid ${BORDER}`,
            borderRadius: 18,
          }}
        />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
            width: "100%",
            height: "100%",
            padding: "64px 80px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- satori
                (next/og) render tree, not real DOM; next/image doesn't apply
                here. The sibling opengraph-image.tsx convention files are
                exempted from this rule by the Next.js eslint plugin itself --
                this is a plain Route Handler, so it isn't. */}
            <img src={markDataUrl} alt="" width={44} height={44} />
            <div style={{ display: "flex", fontSize: 26, fontWeight: 700, letterSpacing: "-0.02em" }}>
              <span style={{ display: "flex", color: BRAND }}>We</span>
              <span style={{ display: "flex", color: INK }}>Webinars</span>
            </div>
            <div style={{ display: "flex", color: MUTED, fontSize: 24, marginLeft: 2 }}>/ Blog</div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", maxWidth: 950 }}>
            <div
              style={{
                display: "flex",
                width: 64,
                height: 4,
                marginBottom: 30,
                borderRadius: 999,
                background: `linear-gradient(90deg, ${BRAND}, ${BRAND_2})`,
              }}
            />
            <div
              style={{
                display: "flex",
                fontSize: 58,
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                color: INK,
              }}
            >
              {title}
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...SIZE,
      fonts: [
        { name: "Geist", data: bold, weight: 700, style: "normal" },
        { name: "Geist", data: regular, weight: 400, style: "normal" },
      ],
    }
  );
}
