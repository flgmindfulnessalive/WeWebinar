import { ImageResponse } from "next/og";

import { createClient } from "@/lib/supabase/server";
import { kickerOf } from "@/lib/wefunnels/kicker";
import {
  BODY,
  CYAN,
  GRADIENT,
  INK,
  OG_SIZE,
  OgBackdrop,
  TITLE,
  ogFonts,
} from "@/components/wefunnels/og-art";

export const runtime = "nodejs";
export const size = OG_SIZE;
export const contentType = "image/png";
export const alt = "Página personal";

// La tarjeta de una página personal.
//
// Hasta ahora heredaba la de la web oficial, que vende la licencia: quien
// compartía su propia página en un grupo enseñaba un logotipo que no es
// suyo y «199 dólares · Un solo pago», a gente a la que no le está
// vendiendo eso. Aquí va quien comparte: su cara, su nombre y su frase.
//
// Lee con la sesión anónima a propósito. Si la página es un borrador o
// está suspendida, RLS no devuelve la fila y sale la tarjeta neutra: el
// estado de la página de alguien no se cuenta en una vista previa.
const MAX_HEADLINE = 110;

function clamp(value: string, max: number): string {
  const text = value.trim();
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

// Solo las fotos que subió el producto. photo_url sale de una fila que
// escribe su dueño, y esto corre en el servidor: traer cualquier
// dirección que llegue por ahí convertiría esta ruta en un buscador de
// recursos internos para quien sepa editar su propia página.
function isOurStorage(url: string): boolean {
  try {
    const { protocol, hostname } = new URL(url);
    return protocol === "https:" && hostname.endsWith(".supabase.co");
  } catch {
    return false;
  }
}

async function photoDataUrl(url: string | null): Promise<string | null> {
  if (!url || !isOurStorage(url)) return null;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const type = response.headers.get("content-type") ?? "image/jpeg";
    const bytes = Buffer.from(await response.arrayBuffer());
    return `data:${type};base64,${bytes.toString("base64")}`;
  } catch {
    // Una foto que no se puede traer no vale una tarjeta rota: quedan las
    // iniciales, que es lo que ya hace la página cuando no hay foto.
    return null;
  }
}

// Una tarjeta es decoración: si la lectura falla, sale la neutra y no un
// 500. La página de al lado sí tiene que gritar cuando no puede leer --
// ahí la diferencia es decirle a un visitante que la página de otro no
// está publicada -- pero aquí lo único que se pierde es la miniatura.
async function liveSite(slug: string) {
  try {
    const supabase = await createClient();
    const { data: site } = await supabase
      .from("wefunnel_sites")
      .select("*")
      .eq("slug", slug)
      .maybeSingle();

    return site && site.status === "published" && !site.suspended_at ? site : null;
  } catch (err) {
    console.error("[wefunnel] og image: no se pudo leer la página:", slug, err);
    return null;
  }
}

export default async function SiteOpengraphImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const live = await liveSite(slug);
  const [fonts, photo] = await Promise.all([
    ogFonts(),
    photoDataUrl(live?.photo_url ?? null),
  ]);

  const name = live?.display_name?.trim() || "Reclama tu embudo gratis de por vida";
  const headline = live
    ? clamp(live.headline?.trim() || live.description?.trim() || "", MAX_HEADLINE)
    : "Tu página para captar contactos, tu panel de registros y el curso para llevarles tráfico.";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 34,
          position: "relative",
          background: INK,
          fontFamily: "Archivo",
          padding: "68px 72px",
        }}
      >
        <OgBackdrop />

        <div style={{ display: "flex", position: "relative", alignItems: "center", gap: 28 }}>
          {live && (photo ? (
            <img
              src={photo}
              alt=""
              width={132}
              height={132}
              style={{ borderRadius: 66, objectFit: "cover" }}
            />
          ) : (
            <div
              style={{
                display: "flex",
                width: 132,
                height: 132,
                borderRadius: 66,
                alignItems: "center",
                justifyContent: "center",
                background: "#16213a",
                fontSize: 48,
                fontWeight: 700,
                color: CYAN,
              }}
            >
              {initials(name)}
            </div>
          ))}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {live && (
              <div
                style={{
                  display: "flex",
                  fontFamily: "IBM Plex Mono",
                  fontSize: 24,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: CYAN,
                }}
              >
                {kickerOf(live.kicker)}
              </div>
            )}
            <div
              style={{
                display: "flex",
                fontSize: 72,
                fontWeight: 800,
                letterSpacing: "-0.04em",
                lineHeight: 1.05,
                color: TITLE,
              }}
            >
              {name}
            </div>
          </div>
        </div>

        {headline && (
          <div
            style={{
              display: "flex",
              position: "relative",
              maxWidth: 940,
              fontSize: 36,
              fontWeight: 400,
              lineHeight: 1.35,
              color: BODY,
            }}
          >
            {headline}
          </div>
        )}

        <div
          style={{
            display: "flex",
            position: "relative",
            width: 220,
            height: 6,
            borderRadius: 3,
            backgroundImage: GRADIENT,
          }}
        />
      </div>
    ),
    { ...size, fonts }
  );
}
