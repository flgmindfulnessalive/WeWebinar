import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "WeWebinars — webinars evergreen, configúralos en minutos y déjalos vendiendo las 24 horas";

const BRAND = "#4f46e5";
const BRAND_2 = "#c026d3";
const ACCENT = "#8b7bf0";

export default async function OpengraphImage() {
  const fontsDir = join(process.cwd(), "src/app/og-fonts");
  const [bold, regular, badge] = await Promise.all([
    readFile(join(fontsDir, "Geist-Bold.ttf")),
    readFile(join(fontsDir, "Geist-Regular.ttf")),
    readFile(join(process.cwd(), "public/brand/w-badge.png")),
  ]);
  const badgeDataUrl = `data:image/png;base64,${badge.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          background: "linear-gradient(135deg, #0d0a1a 0%, #06040c 100%)",
          fontFamily: "Geist",
        }}
      >
        {/* Blurred brand-color orbs, same visual language as the Home hero mockup */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: -120,
            left: -100,
            width: 480,
            height: 480,
            borderRadius: 9999,
            background: BRAND,
            opacity: 0.55,
            filter: "blur(90px)",
          }}
        />
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: -160,
            right: -100,
            width: 460,
            height: 460,
            borderRadius: 9999,
            background: BRAND_2,
            opacity: 0.45,
            filter: "blur(90px)",
          }}
        />
        <div
          style={{
            display: "flex",
            position: "absolute",
            right: 220,
            top: 60,
            width: 300,
            height: 300,
            borderRadius: 9999,
            background: ACCENT,
            opacity: 0.4,
            filter: "blur(80px)",
          }}
        />
        <div
          style={{
            display: "flex",
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(120% 100% at 50% 40%, transparent 35%, rgba(0,0,0,.55) 100%)",
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            width: "100%",
            height: "100%",
            padding: "0 90px",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 26 }}>
            <img
              src={badgeDataUrl}
              alt=""
              width={108}
              height={108}
              style={{ borderRadius: 28 }}
            />
            <div
              style={{
                display: "flex",
                fontSize: 76,
                fontWeight: 700,
                letterSpacing: "-0.02em",
              }}
            >
              <span style={{ display: "flex", color: BRAND }}>We</span>
              <span style={{ display: "flex", color: "#ffffff" }}>Webinars</span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: 76,
              fontSize: 34,
              fontWeight: 400,
              color: "rgba(255,255,255,0.68)",
              lineHeight: 1.5,
            }}
          >
            <div style={{ display: "flex" }}>Webinars evergreen,</div>
            <div style={{ display: "flex" }}>configúralos en minutos y</div>
            <div style={{ display: "flex" }}>déjalos vendiendo las 24 horas.</div>
          </div>
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
