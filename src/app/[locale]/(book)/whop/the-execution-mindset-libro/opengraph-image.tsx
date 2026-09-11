import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Overrides the metadata-level static image (hero-books.webp, set in
// page.tsx's generateMetadata) for social/link previews specifically --
// that one stays as the actual og:image fallback for anything that reads
// metadata without hitting this route (RSS-style scrapers, e.g.), but
// Next resolves this file first for the real <meta property="og:image">
// tag, giving WhatsApp/X/Whop community posts the same dark navy/gold
// "premium imprint" identity as the page itself instead of a plain product
// photo with no context.
export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "The Execution Mindset — Book + Workbook | Francesco Lulli";

const NAVY = "#12141c";
const NAVY_DEEP = "#0b0c12";
const CREAM = "#f5f1e8";
const CREAM_MUTED = "rgba(245,241,232,0.6)";
const GOLD = "#c9973b";
const GOLD_LIGHT = "#e0b563";

const COPY = {
  en: {
    eyebrow: "THE EXECUTION MINDSET",
    headline: "Stop Negotiating With Yourself.",
    body: "A practical system to think better, act with discipline, and build the life you want.",
    priceOld: "$11.94",
    priceNew: "$8",
    priceDiscount: "33% off",
    feature1: "Full book",
    feature2: "Implementation workbook",
    feature3: "Instant access",
  },
  es: {
    eyebrow: "THE EXECUTION MINDSET",
    headline: "Deja De Negociar Contigo Mismo.",
    body: "Un sistema práctico para encontrar dirección, vencer la resistencia y construir la vida que quieres.",
    priceOld: "11,94 US$",
    priceNew: "8 US$",
    priceDiscount: "33% dscto",
    feature1: "Libro completo",
    feature2: "Workbook de implementación",
    feature3: "Acceso inmediato",
  },
};

export default async function ExecutionMindsetOpengraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = locale === "en" ? COPY.en : COPY.es;

  const fontsDir = join(process.cwd(), "src/app/og-fonts");
  const assetsDir = join(process.cwd(), "public/marketing/execution-mindset");
  // PNG, not the site's usual .webp -- satori (next/og's renderer) throws
  // on a base64-embedded webp data URL ("u2 is not iterable"), so this
  // route gets its own PNG copies of the two assets it needs instead of
  // reusing logo-light.webp/hero-books.webp directly.
  const [bold, regular, logo, books] = await Promise.all([
    readFile(join(fontsDir, "Geist-Bold.ttf")),
    readFile(join(fontsDir, "Geist-Regular.ttf")),
    readFile(join(assetsDir, "logo-light-og.png")),
    readFile(join(assetsDir, "hero-books-og.png")),
  ]);
  const logoDataUrl = `data:image/png;base64,${logo.toString("base64")}`;
  const booksDataUrl = `data:image/png;base64,${books.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: `linear-gradient(160deg, ${NAVY}, ${NAVY_DEEP})`,
          fontFamily: "Geist",
        }}
      >
        {/* Same gold ambient glow as the real hero section */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: -160,
            right: -160,
            width: 620,
            height: 620,
            borderRadius: 9999,
            background: GOLD,
            opacity: 0.22,
            filter: "blur(130px)",
          }}
        />

        {/* Left column: identity + pitch */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
            width: "58%",
            padding: "56px 0 56px 72px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src={logoDataUrl} alt="" width={38} height={19} />
            <div
              style={{
                display: "flex",
                fontSize: 20,
                fontWeight: 700,
                letterSpacing: "0.14em",
                color: GOLD_LIGHT,
              }}
            >
              {t.eyebrow}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
            <div
              style={{
                display: "flex",
                fontSize: 52,
                fontWeight: 700,
                lineHeight: 1.15,
                letterSpacing: "-0.02em",
                color: CREAM,
                maxWidth: 620,
              }}
            >
              {t.headline}
            </div>
            <div style={{ display: "flex", fontSize: 22, lineHeight: 1.4, color: CREAM_MUTED, maxWidth: 560 }}>
              {t.body}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ display: "flex", fontSize: 20, color: "rgba(245,241,232,0.4)", textDecoration: "line-through" }}>
                {t.priceOld}
              </div>
              <div style={{ display: "flex", fontSize: 32, fontWeight: 700, color: CREAM }}>{t.priceNew}</div>
              <div
                style={{
                  display: "flex",
                  padding: "5px 14px",
                  borderRadius: 999,
                  background: GOLD,
                  color: NAVY_DEEP,
                  fontSize: 16,
                  fontWeight: 700,
                }}
              >
                {t.priceDiscount}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
              {[t.feature1, t.feature2, t.feature3].map((label, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 17, color: CREAM_MUTED }}>
                  <div style={{ display: "flex", width: 7, height: 7, borderRadius: 999, background: GOLD }} />
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: the actual product shot */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            width: "42%",
            height: "100%",
            padding: "0 40px 0 0",
          }}
        >
          <img src={booksDataUrl} alt="" width={460} height={303} />
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Geist", data: bold, weight: 700, style: "normal" },
        { name: "Geist", data: regular, weight: 400, style: "normal" },
      ],
    }
  );
}
