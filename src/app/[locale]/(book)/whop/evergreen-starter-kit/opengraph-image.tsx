import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

// Overrides the generic root opengraph-image.tsx for this route segment --
// what gets shared to WhatsApp/X/Whop community posts is the VSL's own
// dark violet/pink identity (see globals.css' .starter-kit-vsl-theme)
// instead of generic light WeWebinars branding.
export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Free Evergreen Webinar Starter Kit — WeWebinars";

const BG = "#08080f";
const BRAND = "#6c4cff";
const BRAND_2 = "#ff4ecd";
const INK = "#f5f4fb";
const INK_MUTED = "rgba(245,244,251,0.6)";

const COPY = {
  en: {
    eyebrow: "FREE — INSTANT ACCESS",
    titleStart: "Stop Giving The Same Presentation Over And Over.",
    titleHighlight: "Turn It Into A Webinar That Sells For You 24/7.",
    feature1: "5-step framework",
    feature2: "~50 minutes",
    feature3: "100% free, no card",
  },
  es: {
    eyebrow: "GRATIS — ACCESO INSTANTÁNEO",
    titleStart: "Deja De Dar La Misma Presentación Una Y Otra Vez.",
    titleHighlight: "Conviértela En Un Webinar Que Vende Por Ti 24/7.",
    feature1: "Sistema de 5 pasos",
    feature2: "~50 minutos",
    feature3: "100% gratis, sin tarjeta",
  },
};

export default async function StarterKitVslOpengraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = locale === "en" ? COPY.en : COPY.es;

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
          flexDirection: "column",
          justifyContent: "space-between",
          position: "relative",
          background: BG,
          fontFamily: "Geist",
          padding: "64px 90px",
        }}
      >
        {/* Blurred brand-color orbs, same feel as the real page's ambient glow */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: -160,
            right: -120,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background: BRAND,
            opacity: 0.35,
            filter: "blur(120px)",
          }}
        />
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: -200,
            left: -100,
            width: 480,
            height: 480,
            borderRadius: 9999,
            background: BRAND_2,
            opacity: 0.22,
            filter: "blur(120px)",
          }}
        />

        {/* Top row: mark + eyebrow pill */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <img src={markDataUrl} alt="" width={44} height={44} />
            <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color: INK }}>WeWebinars</div>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "10px 22px",
              borderRadius: 999,
              background: "rgba(255,78,205,0.14)",
              border: `1px solid rgba(255,78,205,0.4)`,
              color: BRAND_2,
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: "0.04em",
            }}
          >
            {t.eyebrow}
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            position: "relative",
            fontSize: 58,
            fontWeight: 700,
            lineHeight: 1.18,
            letterSpacing: "-0.02em",
            maxWidth: 980,
          }}
        >
          <span style={{ display: "flex", color: INK }}>{t.titleStart}</span>
          <span style={{ display: "flex", color: BRAND_2, marginTop: 6 }}>{t.titleHighlight}</span>
        </div>

        {/* Feature chips */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, position: "relative" }}>
          {[t.feature1, t.feature2, t.feature3].map((label, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 22px",
                borderRadius: 999,
                background: "rgba(245,244,251,0.06)",
                border: "1px solid rgba(245,244,251,0.14)",
                color: INK_MUTED,
                fontSize: 22,
                fontWeight: 400,
              }}
            >
              <div style={{ display: "flex", width: 8, height: 8, borderRadius: 999, background: BRAND }} />
              {label}
            </div>
          ))}
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
