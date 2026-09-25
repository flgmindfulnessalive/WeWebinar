// Genera deploy/.inline/manifest.mjs: todos los archivos de dist/ dentro del
// propio script del Worker, sin Workers Static Assets.
// Motivo: en el entorno de Claude Code el proxy sustituye la cabecera
// Authorization por el token de API, y el endpoint de subida de assets
// (/workers/assets/upload) exige su propio JWT temporal → 401. Con los
// archivos incrustados, wrangler solo sube el script (una llamada normal).
// Uso: npm run build:production && node scripts/inline-assets.mjs
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, relative, extname } from "node:path";

const root = new URL("..", import.meta.url).pathname;
const dist = join(root, "dist");
const out = join(root, "deploy/.inline");

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".webp": "image/webp",
  ".jpg": "image/jpeg",
};
const TEXT = new Set([".html", ".css", ".js", ".svg"]);

const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

// _headers → [{ pattern, headers }] (se aplican todas las reglas que coinciden).
const headerRules = [];
for (const line of readFileSync(join(dist, "_headers"), "utf8").split("\n")) {
  if (!line.trim()) continue;
  if (!/^\s/.test(line)) headerRules.push({ pattern: line.trim(), headers: {} });
  else {
    const [k, ...v] = line.trim().split(":");
    headerRules.at(-1).headers[k.trim()] = v.join(":").trim();
  }
}

mkdirSync(out, { recursive: true });
const imports = [];
const entries = [];
let total = 0;
for (const file of walk(dist).sort()) {
  const rel = relative(dist, file);
  if (rel === "_headers" || rel === "_redirects") continue;
  const ext = extname(file);
  if (!TYPES[ext]) throw new Error(`Tipo sin definir para ${rel}`);
  const buf = readFileSync(file);
  total += buf.length;
  // /X39 se sirve desde X39.html (html_handling auto-trailing-slash).
  const path = "/" + rel.replace(/\.html$/, "");
  const etag = `"${createHash("sha256").update(buf).digest("hex").slice(0, 16)}"`;
  let body;
  if (TEXT.has(ext)) body = JSON.stringify(buf.toString("utf8"));
  else {
    const id = `f${imports.length}`;
    imports.push(`import ${id} from ${JSON.stringify(relative(out, file))};`);
    body = id;
  }
  entries.push(`  ${JSON.stringify(path)}: { type: ${JSON.stringify(TYPES[ext])}, etag: ${JSON.stringify(etag)}, body: ${body} },`);
}

writeFileSync(join(out, "manifest.mjs"), `// Generado por scripts/inline-assets.mjs — no editar.
${imports.join("\n")}

export const HEADER_RULES = ${JSON.stringify(headerRules)};
export const FILES = {
${entries.join("\n")}
};
`);
console.log(`✓ deploy/.inline/manifest.mjs · ${entries.length} archivos · ${(total / 1024 / 1024).toFixed(2)} MB`);
