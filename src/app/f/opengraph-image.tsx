import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

import { WEFUNNELS_HOST } from "@/lib/wefunnels/host";
import {
  BODY,
  CYAN,
  GRADIENT,
  INK,
  MONO_BG,
  MONO_FG,
  OG_SIZE,
  OgBackdrop,
  TITLE,
  ogFonts,
} from "@/components/wefunnels/og-art";

export const runtime = "nodejs";
export const size = OG_SIZE;
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
//
// El fondo y las tipografías son los de og-art, compartidos con la tarjeta
// del enlace de regalo.

export default async function WeFunnelsOpengraphImage() {
  const [fonts, mark] = await Promise.all([
    ogFonts(),
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
        <OgBackdrop />

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
                backgroundImage: GRADIENT,
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
    { ...size, fonts }
  );
}
