import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "WeWebinars — webinars evergreen para vender tus productos";

const BRAND = "#4f46e5";
const BRAND_2 = "#c026d3";

export default async function OpengraphImage() {
  const fontsDir = join(process.cwd(), "src/app/og-fonts");
  const [bold, semibold, regular] = await Promise.all([
    readFile(join(fontsDir, "Geist-Bold.ttf")),
    readFile(join(fontsDir, "Geist-SemiBold.ttf")),
    readFile(join(fontsDir, "Geist-Regular.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "linear-gradient(135deg, #eef2ff 0%, #ffffff 55%, #fdf4ff 100%)",
          fontFamily: "Geist",
        }}
      >
        {/* Soft brand-color glows, top-left and bottom-right */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: -140,
            left: -140,
            width: 460,
            height: 460,
            borderRadius: 9999,
            background: `linear-gradient(135deg, ${BRAND}, #818cf8)`,
            opacity: 0.22,
          }}
        />
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: -180,
            right: -120,
            width: 520,
            height: 520,
            borderRadius: 9999,
            background: `linear-gradient(135deg, ${BRAND_2}, #f0abfc)`,
            opacity: 0.18,
          }}
        />

        {/* Decorative play glyph, right side */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            right: 110,
            top: 245,
            width: 140,
            height: 140,
            borderRadius: 9999,
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(79,70,229,0.08)",
            border: `2px solid rgba(79,70,229,0.25)`,
          }}
        >
          <svg width="46" height="52" viewBox="0 0 46 52" style={{ marginLeft: 10 }}>
            <polygon points="0,0 46,26 0,52" fill={BRAND} />
          </svg>
        </div>

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            position: "relative",
            width: "100%",
            height: "100%",
            padding: "0 90px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 108,
                height: 108,
                borderRadius: 28,
                background: `linear-gradient(135deg, ${BRAND}, ${BRAND_2})`,
                color: "#ffffff",
                fontSize: 58,
                fontWeight: 700,
              }}
            >
              W
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 76,
                fontWeight: 700,
                color: "#111827",
                letterSpacing: "-0.02em",
              }}
            >
              WeWebinars
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 40,
              fontSize: 34,
              fontWeight: 400,
              color: "#4b5563",
              lineHeight: 1.4,
            }}
          >
            <div style={{ display: "flex" }}>Webinars evergreen</div>
            <div style={{ display: "flex" }}>para vender tus productos, 24/7.</div>
          </div>

          <div style={{ display: "flex", marginTop: 60, alignItems: "center", gap: 14 }}>
            <div style={{ display: "flex", width: 10, height: 10, borderRadius: 9999, background: BRAND }} />
            <div style={{ display: "flex", fontSize: 28, fontWeight: 600, color: "#4338ca" }}>
              wewebinars.com
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Geist", data: bold, weight: 700, style: "normal" },
        { name: "Geist", data: semibold, weight: 600, style: "normal" },
        { name: "Geist", data: regular, weight: 400, style: "normal" },
      ],
    }
  );
}
