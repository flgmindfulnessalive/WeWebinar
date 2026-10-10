import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

import { WEFUNNELS_HOST } from "@/lib/wefunnels/host";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt =
  "WeFunnels — Abre la conversación con un regalo. Regala funnels profesionales a otros constructores.";

// La tarjeta que sale al compartir la web oficial. Hasta ahora no existía
// y el enlace heredaba la del host de la app: quien pegaba
// wefunnels.wewebinars.com en WhatsApp veía una tarjeta de WeWebinars, con
// su título, su descripción y su imagen. Otra marca, otro producto y
// ninguna pista de lo que se estaba compartiendo.
//
// Vive bajo /f, así que en el host de WeFunnels se sirve en
// /opengraph-image (el proxy antepone /f a todo lo que llega a ese host).
// Por eso page.tsx la declara con esa dirección absoluta y no con la ruta
// relativa: resuelta contra metadataBase saldría en el host de la app.

// El fondo aprobado, y el degradado de marca de la portada.
const INK = "#050913";
const TITLE = "#F3F7FF";
const BODY = "#C1D1E6";
const CYAN = "#43E2EE";
const MONO_BG = "#182237";
const MONO_FG = "#C1D3E7";

// Las dos tramas del hero. En la web son dos repeating-linear-gradient
// enmascarados; satori no resuelve ni lo uno ni lo otro, así que aquí son
// líneas explícitas y la atenuación es un velo del propio color de fondo
// encima -- el mismo dibujo, por otro camino.
const RAY = "rgba(130, 102, 201, 0.33)";
const RING = "rgba(56, 216, 235, 0.27)";
const GRID_LEFT = 540;
const RING_STEP = 141;
const RAY_SLOPE = Math.tan((30 * Math.PI) / 180);
const RAY_STEP = 140 / Math.cos((30 * Math.PI) / 180);

function gridLines() {
  const lines = [];

  for (let x = GRID_LEFT; x <= size.width; x += RING_STEP) {
    lines.push(
      <line key={`v${x}`} x1={x} y1={0} x2={x} y2={size.height} stroke={RING} strokeWidth={1} />
    );
  }

  // y = x·tan(30°) + c, con c recorriendo lo suficiente para cruzar el
  // rectángulo entero por las dos esquinas.
  const first = -Math.ceil((size.width * RAY_SLOPE) / RAY_STEP) * RAY_STEP;
  for (let c = first; c <= size.height + RAY_STEP; c += RAY_STEP) {
    lines.push(
      <line
        key={`d${c}`}
        x1={GRID_LEFT}
        y1={GRID_LEFT * RAY_SLOPE + c}
        x2={size.width}
        y2={size.width * RAY_SLOPE + c}
        stroke={RAY}
        strokeWidth={1}
      />
    );
  }

  return lines;
}

export default async function WeFunnelsOpengraphImage() {
  const fontsDir = join(process.cwd(), "src/app/og-fonts");
  const [regular, bold, extraBold, mono, mark] = await Promise.all([
    readFile(join(fontsDir, "Archivo-Regular.ttf")),
    readFile(join(fontsDir, "Archivo-Bold.ttf")),
    readFile(join(fontsDir, "Archivo-ExtraBold.ttf")),
    readFile(join(fontsDir, "IBMPlexMono-Regular.ttf")),
    readFile(join(process.cwd(), "public/brand/wefunnels-mark.png")),
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
          background: INK,
          fontFamily: "Archivo",
          padding: "68px 72px",
        }}
      >
        {/* El halo del hero, en el mismo sitio y con el mismo color. */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse at 95% 50%, rgba(48,32,90,0.53), transparent 55%)",
          }}
        />

        <div style={{ display: "flex", position: "absolute", inset: 0 }}>
          <svg width={size.width} height={size.height}>
            {gridLines()}
          </svg>
        </div>

        {/* El velo que apaga la trama antes de que llegue al texto. */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 0,
            left: 0,
            width: 830,
            height: size.height,
            background: `linear-gradient(90deg, ${INK} 46%, rgba(5,9,19,0) 100%)`,
          }}
        />

        <div style={{ display: "flex", position: "relative", alignItems: "center", gap: 18 }}>
          <img src={markDataUrl} alt="" width={96} height={54} />
          <div
            style={{
              display: "flex",
              fontSize: 44,
              fontWeight: 700,
              letterSpacing: "-0.04em",
            }}
          >
            <span style={{ display: "flex", color: CYAN }}>We</span>
            <span style={{ display: "flex", color: TITLE }}>Funnels</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 82,
              fontWeight: 800,
              letterSpacing: "-0.045em",
              lineHeight: 1.02,
              color: TITLE,
            }}
          >
            <div style={{ display: "flex" }}>Abre la conversación</div>
            <div
              style={{
                display: "flex",
                backgroundImage: "linear-gradient(90deg, #41E5EC 0%, #83B5FF 36%, #BD8BFF 86%)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              con un regalo.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 24,
              maxWidth: 760,
              fontSize: 32,
              fontWeight: 400,
              lineHeight: 1.45,
              color: BODY,
            }}
          >
            Regala funnels profesionales a otros constructores.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            position: "relative",
            alignItems: "center",
            gap: 20,
          }}
        >
          {/* La dirección con el nombre de la persona: el motivo del
              producto, y lo único para lo que existe la mono. */}
          <div
            style={{
              display: "flex",
              padding: "14px 22px",
              borderRadius: 10,
              background: MONO_BG,
              fontFamily: "IBM Plex Mono",
              fontSize: 25,
              color: MONO_FG,
            }}
          >
            {WEFUNNELS_HOST}/tu-nombre
          </div>
          <div style={{ display: "flex", fontSize: 25, fontWeight: 400, color: "#8FA4C0" }}>
            199 dólares · Un solo pago
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Archivo", data: regular, weight: 400, style: "normal" },
        { name: "Archivo", data: bold, weight: 700, style: "normal" },
        { name: "Archivo", data: extraBold, weight: 800, style: "normal" },
        { name: "IBM Plex Mono", data: mono, weight: 400, style: "normal" },
      ],
    }
  );
}
