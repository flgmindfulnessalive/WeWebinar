import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "WeWebinars — Libérate de tener que realizar sesiones en vivo repetitivas. Automatiza y vende 24/7.";

const BRAND = "#4f46e5";
const BRAND_2 = "#c026d3";
const INK = "#18181b";
const MUTED = "#6b6b7b";
const BORDER = "rgba(24,24,27,0.08)";

// Two small constellations echoing the site's own animated ParticleNetwork
// (satori can't run canvas/JS, so this is a static, hand-placed stand-in),
// tinted the same indigo the real component uses on the marketing hero,
// kept subtle so it reads as texture, not content.
const CLUSTER_A: [number, number][] = [
  [55, 50], [140, 30], [205, 75], [95, 130], [175, 165], [45, 190],
];
const EDGES_A: [number, number][] = [
  [0, 1], [1, 2], [0, 3], [3, 4], [2, 4], [3, 5],
];
const CLUSTER_B: [number, number][] = [
  [950, 435], [1040, 405], [1110, 460], [990, 500], [1080, 540], [1155, 500],
];
const EDGES_B: [number, number][] = [
  [0, 1], [1, 2], [0, 3], [3, 4], [2, 4], [4, 5],
];

function constellationElements(points: [number, number][], edges: [number, number][], keyPrefix: string) {
  const lines = edges.map(([a, b], i) => (
    <line
      key={`${keyPrefix}e${i}`}
      x1={points[a][0]}
      y1={points[a][1]}
      x2={points[b][0]}
      y2={points[b][1]}
      stroke={BRAND}
      strokeWidth={1}
      strokeOpacity={0.22}
    />
  ));
  const dots = points.map(([x, y], i) => (
    <circle key={`${keyPrefix}p${i}`} cx={x} cy={y} r={2.5} fill={BRAND} fillOpacity={0.4} />
  ));
  return [...lines, ...dots];
}

export default async function OpengraphImage() {
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
        {/* Same grid pattern as the real marketing hero's bg-grid-pattern */}
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

        {/* Blurred brand-color orbs, same opacity as the real GradientBlobs on white */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: -140,
            left: -80,
            width: 480,
            height: 480,
            borderRadius: 9999,
            background: BRAND,
            opacity: 0.3,
            filter: "blur(90px)",
          }}
        />
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: -180,
            right: -80,
            width: 460,
            height: 460,
            borderRadius: 9999,
            background: BRAND_2,
            opacity: 0.22,
            filter: "blur(90px)",
          }}
        />

        {/* Constellation texture in the empty corners */}
        <div style={{ display: "flex", position: "absolute", inset: 0 }}>
          <svg width={1200} height={630}>
            {constellationElements(CLUSTER_A, EDGES_A, "a")}
            {constellationElements(CLUSTER_B, EDGES_B, "b")}
          </svg>
        </div>

        {/* Fine inset frame -- a small, premium-print detail */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            inset: 20,
            border: `1px solid ${BORDER}`,
            borderRadius: 18,
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
          <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
            <img src={markDataUrl} alt="" width={184} height={184} />
            <div
              style={{
                display: "flex",
                fontSize: 96,
                fontWeight: 700,
                letterSpacing: "-0.03em",
              }}
            >
              <span style={{ display: "flex", color: BRAND }}>We</span>
              <span style={{ display: "flex", color: INK }}>Webinars</span>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              width: 72,
              height: 3,
              marginTop: 34,
              borderRadius: 999,
              background: `linear-gradient(90deg, ${BRAND}, ${BRAND_2})`,
            }}
          />

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              marginTop: 34,
              fontSize: 42,
              fontWeight: 400,
              color: MUTED,
              lineHeight: 1.15,
            }}
          >
            <div style={{ display: "flex" }}>Libérate de tener que realizar</div>
            <div style={{ display: "flex" }}>sesiones en vivo repetitivas.</div>
            <div
              style={{
                display: "flex",
                marginTop: 16,
                fontWeight: 700,
                color: INK,
              }}
            >
              Automatiza y vende 24/7.
            </div>
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
