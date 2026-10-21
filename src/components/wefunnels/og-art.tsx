import { readFile } from "node:fs/promises";
import { join } from "node:path";

// El decorado de las tarjetas que salen al compartir un enlace de
// WeFunnels. Vive aquí, y no dentro de una de ellas, porque hay dos con el
// mismo mundo visual y distinto mensaje: la de la web oficial, que vende la
// licencia, y la del enlace de regalo, que no nombra ninguna marca.
//
// Lo que comparten es el fondo -- el halo, la trama y el velo -- y la
// tipografía. Lo que las separa es todo lo demás, y por eso cada una
// escribe su propio contenido.

export const OG_SIZE = { width: 1200, height: 630 };

export const INK = "#050913";
export const TITLE = "#F3F7FF";
export const BODY = "#C1D1E6";
export const CYAN = "#43E2EE";
export const MONO_BG = "#182237";
export const MONO_FG = "#C1D3E7";
export const GRADIENT = "linear-gradient(90deg, #41E5EC 0%, #83B5FF 36%, #BD8BFF 86%)";

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

  for (let x = GRID_LEFT; x <= OG_SIZE.width; x += RING_STEP) {
    lines.push(
      <line key={`v${x}`} x1={x} y1={0} x2={x} y2={OG_SIZE.height} stroke={RING} strokeWidth={1} />
    );
  }

  // y = x·tan(30°) + c, con c recorriendo lo suficiente para cruzar el
  // rectángulo entero por las dos esquinas.
  const first = -Math.ceil((OG_SIZE.width * RAY_SLOPE) / RAY_STEP) * RAY_STEP;
  for (let c = first; c <= OG_SIZE.height + RAY_STEP; c += RAY_STEP) {
    lines.push(
      <line
        key={`d${c}`}
        x1={GRID_LEFT}
        y1={GRID_LEFT * RAY_SLOPE + c}
        x2={OG_SIZE.width}
        y2={OG_SIZE.width * RAY_SLOPE + c}
        stroke={RAY}
        strokeWidth={1}
      />
    );
  }

  return lines;
}

// Las tres capas del fondo, en orden de pintado: el halo del hero, la
// trama, y el velo que la apaga antes de que llegue al texto.
export function OgBackdrop() {
  return (
    <>
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
        <svg width={OG_SIZE.width} height={OG_SIZE.height}>
          {gridLines()}
        </svg>
      </div>
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: 0,
          left: 0,
          width: 830,
          height: OG_SIZE.height,
          background: `linear-gradient(90deg, ${INK} 46%, rgba(5,9,19,0) 100%)`,
        }}
      />
    </>
  );
}

// Las tipografías se leen del disco en cada petición: son de la carpeta de
// la aplicación, así que viajan con el despliegue, y satori las necesita
// como bytes.
export async function ogFonts() {
  const dir = join(process.cwd(), "src/app/og-fonts");
  const [regular, bold, extraBold, mono] = await Promise.all([
    readFile(join(dir, "Archivo-Regular.ttf")),
    readFile(join(dir, "Archivo-Bold.ttf")),
    readFile(join(dir, "Archivo-ExtraBold.ttf")),
    readFile(join(dir, "IBMPlexMono-Regular.ttf")),
  ]);

  return [
    { name: "Archivo", data: regular, weight: 400 as const, style: "normal" as const },
    { name: "Archivo", data: bold, weight: 700 as const, style: "normal" as const },
    { name: "Archivo", data: extraBold, weight: 800 as const, style: "normal" as const },
    { name: "IBM Plex Mono", data: mono, weight: 400 as const, style: "normal" as const },
  ];
}
