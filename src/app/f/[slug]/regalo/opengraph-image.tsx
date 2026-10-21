import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

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
export const alt = "Reclama tu embudo de ventas gratis de por vida.";

// La tarjeta del enlace de regalo.
//
// Hasta ahora heredaba la de la web oficial, que es la de la venta: el
// logotipo, «abre la conversación con un regalo» y el precio de la
// licencia. Quien recibe un enlace de regalo está en el otro lado de esa
// frase -- le están dando algo -- y además todavía no sabe qué es nada de
// esto, así que una marca y una cifra delante solo añaden preguntas.
//
// Por eso aquí no hay nombre de producto. Solo lo que recibe.
export default async function GiftOpengraphImage() {
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

        {/* El símbolo sin el nombre: da sello de que esto es un producto y
            no una captura, y no dice de quién todavía. */}
        <div style={{ display: "flex", position: "relative", alignItems: "center", gap: 18 }}>
          <img src={markDataUrl} alt="" width={96} height={54} />
          <div
            style={{
              display: "flex",
              fontFamily: "IBM Plex Mono",
              fontSize: 25,
              letterSpacing: "0.18em",
              color: CYAN,
            }}
          >
            TE REGALARON ESTO
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: 80,
              fontWeight: 800,
              letterSpacing: "-0.045em",
              lineHeight: 1.02,
              color: TITLE,
            }}
          >
            <div style={{ display: "flex" }}>Reclama tu embudo</div>
            <div
              style={{
                display: "flex",
                backgroundImage: GRADIENT,
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              gratis de por vida.
            </div>
          </div>

          <div
            style={{
              display: "flex",
              marginTop: 24,
              maxWidth: 780,
              fontSize: 32,
              fontWeight: 400,
              lineHeight: 1.45,
              color: BODY,
            }}
          >
            Tu página para captar contactos, tu panel de registros y el curso para
            llevarles tráfico.
          </div>
        </div>

        <div
          style={{ display: "flex", position: "relative", alignItems: "center", gap: 20 }}
        >
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
            Sin tarjeta
          </div>
          <div style={{ display: "flex", fontSize: 25, fontWeight: 400, color: "#8FA4C0" }}>
            Sin mensualidad · Es tuyo para siempre
          </div>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
