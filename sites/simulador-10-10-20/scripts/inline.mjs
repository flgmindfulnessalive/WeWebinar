// Incrusta dist/ en el script del Worker (deploy/.inline/manifest.mjs).
// Motivo: desde el entorno de Claude Code la subida de Workers Static Assets
// falla (el proxy sustituye el JWT de subida). La app pesa ~120 KB gzip.
import { createHash } from "node:crypto";
import { mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { extname, join, relative } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");
const out = join(root, "deploy/.inline");
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".svg": "image/svg+xml", ".json": "application/json", ".woff2": "font/woff2", ".jpg": "image/jpeg" };
const BINARY = new Set([".woff2", ".jpg"]);
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p]; });
const entries = [];
for (const f of walk(dist).sort()) {
  const ext = extname(f);
  if (!TYPES[ext]) throw new Error(`Tipo sin definir: ${f}`);
  const buf = readFileSync(f);
  const path = "/" + relative(dist, f);
  entries.push(`  ${JSON.stringify(path)}: { type: ${JSON.stringify(TYPES[ext])}, etag: ${JSON.stringify(`"${createHash("sha256").update(buf).digest("hex").slice(0, 16)}"`)}, ${BINARY.has(ext) ? `b64: ${JSON.stringify(buf.toString("base64"))}` : `body: ${JSON.stringify(buf.toString("utf8"))}`} },`);
}
// /en: la misma app con las etiquetas para compartir en inglés.
{
  const U = "https://simulador-10-10-20.activatuvida.life";
  const T = "10·10·20 Simulator · Calculate your earnings";
  const D = "Change your numbers and instantly see how much Level Earning, the Binary Bonus, the Mentor Match and your customers add up to. Independent tool, not official.";
  const meta = (attr, key, val) => [new RegExp(`(<meta ${attr}="${key}" content=")[^"]*(")`), `$1${val}$2`];
  let html = readFileSync(join(dist, "index.html"), "utf8");
  for (const [re, to] of [
    [/<html lang="es">/, '<html lang="en">'],
    [/<title>[^<]*<\/title>/, `<title>${T}</title>`],
    meta("name", "description", D),
    meta("property", "og:url", `${U}/en`), meta("property", "og:title", T), meta("property", "og:description", D),
    meta("property", "og:image", `${U}/og-simulador-en-v1.jpg`),
    meta("property", "og:image:alt", "10·10·20 Simulator: calculate your earnings. Independent tool, not affiliated with LifeWave."),
    meta("property", "og:locale", "en_US"),
    meta("name", "twitter:title", T), meta("name", "twitter:description", D), meta("name", "twitter:image", `${U}/og-simulador-en-v1.jpg`),
  ]) {
    if (!re.test(html)) throw new Error(`/en: no se encontró ${re}`);
    html = html.replace(re, to);
  }
  const buf = Buffer.from(html, "utf8");
  entries.push(`  "/en": { type: "text/html; charset=utf-8", etag: ${JSON.stringify(`"${createHash("sha256").update(buf).digest("hex").slice(0, 16)}"`)}, body: ${JSON.stringify(html)} },`);
}
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "manifest.mjs"), `// Generado por scripts/inline.mjs — no editar.\nexport const FILES = {\n${entries.join("\n")}\n};\n`);
console.log(`✓ deploy/.inline/manifest.mjs · ${entries.length} archivos`);
