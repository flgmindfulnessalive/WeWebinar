// Build estático de /X39 → dist/
//   dist/X39.html            página (servida en /X39 con URLs limpias)
//   dist/X39/assets/…        CSS/JS con hash, fuentes, imágenes
//   dist/_redirects, _headers (Cloudflare Pages / Netlify)
// Uso: npm run build            (vista previa, noindex)
//      SITE_MODE=production npm run build
import { promises as fs } from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

import config from "../site.config.mjs";
import { renderPage } from "../src/page.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const basePath = config.site.path; // "/X39"
const assetsUrl = `${basePath}/assets`;
const assetsOut = path.join(dist, basePath.slice(1), "assets");

// --- Utilidades -------------------------------------------------------
const hash = (buf) => crypto.createHash("sha256").update(buf).digest("hex").slice(0, 10);

function webpSize(buf) {
  if (buf.toString("ascii", 0, 4) !== "RIFF" || buf.toString("ascii", 8, 12) !== "WEBP") throw new Error("No es WebP");
  const chunk = buf.toString("ascii", 12, 16);
  if (chunk === "VP8X") return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
  if (chunk === "VP8 ") return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
  if (chunk === "VP8L") {
    const b = buf.readUInt32LE(21);
    return { w: 1 + (b & 0x3fff), h: 1 + ((b >> 14) & 0x3fff) };
  }
  throw new Error(`Chunk WebP desconocido: ${chunk}`);
}

async function scanImages() {
  const images = {};
  for (const dir of ["img", "video"]) {
    for (const file of await fs.readdir(path.join(root, "assets", dir))) {
      const m = file.match(/^(.+)-(\d+)\.webp$/);
      if (!m) continue;
      const buf = await fs.readFile(path.join(root, "assets", dir, file));
      const { w, h } = webpSize(buf);
      (images[m[1]] ||= { dir, variants: [] }).variants.push({ w, h });
    }
  }
  for (const img of Object.values(images)) img.variants.sort((a, b) => a.w - b.w);
  return images;
}

function minifyCss(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,>])\s*/g, "$1")
    .replace(/;}/g, "}")
    .trim();
}

async function copyDir(src, dest) {
  await fs.mkdir(dest, { recursive: true });
  for (const entry of await fs.readdir(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) await copyDir(s, d);
    else await fs.copyFile(s, d);
  }
}

// --- Build --------------------------------------------------------------
await fs.rm(dist, { recursive: true, force: true });
await fs.mkdir(assetsOut, { recursive: true });

await copyDir(path.join(root, "assets"), assetsOut);

const css = minifyCss(await fs.readFile(path.join(root, "src/styles/main.css"), "utf8"));
const cssName = `app.${hash(css)}.css`;
await fs.writeFile(path.join(assetsOut, cssName), css);

const js = await fs.readFile(path.join(root, "src/client/app.js"), "utf8");
const jsName = `app.${hash(js)}.js`;
await fs.writeFile(path.join(assetsOut, jsName), js);

const ctx = {
  config,
  mode: config.mode,
  assets: assetsUrl,
  cssHref: `${assetsUrl}/${cssName}`,
  jsHref: `${assetsUrl}/${jsName}`,
  images: await scanImages(),
  pending: new Set(),
};

const page = renderPage(ctx);
await fs.writeFile(path.join(dist, `${basePath.slice(1)}.html`), page);

// Redirecciones: una única URL canónica (/X39, sin barra final).
// Las variantes en minúsculas (/x39, /x39/) NO van aquí: algunos hosts
// comparan rutas sin distinguir mayúsculas y se formaría un bucle. Las
// resuelve deploy/worker.js con comparación exacta.
const redirects = [
  `${basePath}/ ${basePath} 301`,
  `${basePath}/index.html ${basePath} 301`,
  // Solo para el despliegue independiente (preview): la raíz lleva a /X39.
  `/ ${basePath} 302`,
];
await fs.writeFile(path.join(dist, "_redirects"), redirects.join("\n") + "\n");
await fs.writeFile(
  path.join(dist, "_headers"),
  [
    `${basePath}/assets/*`,
    "  Cache-Control: public, max-age=604800",
    `${basePath}/assets/app.*`,
    "  Cache-Control: public, max-age=31536000, immutable",
    `${basePath}/assets/fonts/*`,
    "  Cache-Control: public, max-age=31536000, immutable",
    `${basePath}`,
    "  Cache-Control: public, max-age=300, must-revalidate",
    "  X-Content-Type-Options: nosniff",
    "  Referrer-Policy: strict-origin-when-cross-origin",
    "",
  ].join("\n"),
);

// --- Informe --------------------------------------------------------------
const size = Buffer.byteLength(page);
console.log(`✓ ${path.relative(root, path.join(dist, basePath.slice(1) + ".html"))} (${(size / 1024).toFixed(1)} KB) · modo ${ctx.mode}`);
console.log(`✓ ${cssName} (${(css.length / 1024).toFixed(1)} KB) · ${jsName} (${(js.length / 1024).toFixed(1)} KB)`);
try {
  await fs.access(path.join(root, "assets", "og-x39.jpg"));
} catch {
  console.warn("⚠ Falta assets/og-x39.jpg (imagen Open Graph). Generar con: npm run og");
}
if (ctx.pending.size) {
  const verb = ctx.mode === "production" ? "ocultos" : "desactivados (vista previa)";
  console.warn(`⚠ Destinos comerciales pendientes, ${verb}: ${[...ctx.pending].join(", ")}`);
  console.warn("  Completa site.config.mjs antes de publicar.");
}
