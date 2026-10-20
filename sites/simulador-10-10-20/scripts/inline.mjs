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
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "manifest.mjs"), `// Generado por scripts/inline.mjs — no editar.\nexport const FILES = {\n${entries.join("\n")}\n};\n`);
console.log(`✓ deploy/.inline/manifest.mjs · ${entries.length} archivos`);
