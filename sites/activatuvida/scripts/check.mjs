// Validación estática del build (sin navegador):
//  - anclas internas → ids existentes
//  - recursos locales (/X39/assets/…) → archivos presentes en dist/
//  - imágenes con alt, iframes ausentes en el HTML inicial
//  - metadatos: canonical, og:*, lang, un único <h1>
//  - enlaces externos (documentos, estudios, patentes): opcionalmente
//    comprobados en red con CHECK_LINKS=1
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import config from "../site.config.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const html = await fs.readFile(path.join(dist, "X39.html"), "utf8");
const problems = [];
const notes = [];
const fail = (m) => problems.push(m);

const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
for (const [, target] of html.matchAll(/href="#([^"]*)"/g)) {
  if (target && !ids.has(target)) fail(`Ancla sin destino: #${target}`);
}
for (const [, target] of html.matchAll(/aria-(?:controls|labelledby)="([^"]+)"/g)) {
  for (const id of target.split(/\s+/)) if (!ids.has(id)) fail(`aria-* apunta a un id inexistente: ${id}`);
}

const local = new Set();
for (const [, url] of html.matchAll(/(?:src|href)="(\/X39\/assets\/[^"]+)"/g)) local.add(url);
for (const [, set] of html.matchAll(/srcset="([^"]+)"/g)) {
  for (const part of set.split(",")) local.add(part.trim().split(/\s+/)[0]);
}
for (const url of local) {
  try { await fs.access(path.join(dist, url.slice(1))); } catch { fail(`Recurso local inexistente: ${url}`); }
}
const cssFile = [...local].find((u) => u.endsWith(".css"));
if (cssFile) {
  const css = await fs.readFile(path.join(dist, cssFile.slice(1)), "utf8");
  for (const [, u] of css.matchAll(/url\("?\.\/([^")]+)"?\)/g)) {
    try { await fs.access(path.join(dist, "X39/assets", u)); } catch { fail(`Recurso del CSS inexistente: ${u}`); }
  }
}

for (const [tag] of html.matchAll(/<img\b[^>]*>/g)) if (!/\salt="/.test(tag)) fail(`Imagen sin alt: ${tag.slice(0, 80)}`);
if (/<iframe\b/.test(html)) fail("Hay iframes en el HTML inicial (los videos deben cargarse a demanda)");
if ((html.match(/<h1\b/g) || []).length !== 1) fail("Debe haber exactamente un <h1>");
const canonical = `${config.site.origin}${config.site.path}`;
if (!html.includes(`<link rel="canonical" href="${canonical}">`)) fail("Canonical ausente o incorrecto");
for (const p of ["og:title", "og:description", "og:image", "og:url", "og:locale"]) if (!html.includes(`property="${p}"`)) fail(`Falta ${p}`);
if (!/<html lang="es"/.test(html)) fail("Falta lang=es");
if (/whythelight\.com\/(?!wp-content\/uploads\/|es\/estudios\/)/.test(html)) fail("Enlace no documental a whythelight.com");
if (/G-SQDBW2C4K3|fbq\(|elementor/i.test(html)) fail("Rastro de scripts del sitio original");
try { await fs.access(path.join(dist, "X39/assets/og-x39.jpg")); } catch { fail("Falta la imagen Open Graph"); }

if (config.mode === "preview" && !html.includes('content="noindex, nofollow"')) fail("La vista previa debe llevar noindex");
if (config.mode === "production" && html.includes("noindex")) fail("Producción no debe llevar noindex");
if (config.mode === "production" && html.includes("btn--pending")) fail("Producción con botones pendientes visibles");

// Enlaces externos declarados en la configuración.
const externals = [
  ...Object.values(config.documents),
  ...Object.values(config.studies),
  config.commerce.officialProductUrl,
  config.commerce.officialCpsUrl,
  config.commerce.purchaseUrl,
].filter(Boolean);
if (process.env.CHECK_LINKS === "1") {
  const ua = { "User-Agent": "Mozilla/5.0 (link-check activatuvida.life/X39)" };
  const get = async (url) => {
    let res = await fetch(url, { method: "HEAD", redirect: "follow", headers: ua });
    if (res.status === 405 || res.status === 403) res = await fetch(url, { redirect: "follow", headers: ua });
    return res.status;
  };
  for (const url of externals) {
    let status;
    try {
      status = await get(url);
      // 429/503 = limitación anti-bot del sitio: un reintento y, si sigue, aviso.
      if (status === 429 || status === 503) {
        await new Promise((r) => setTimeout(r, 2500));
        status = await get(url);
      }
    } catch (e) {
      status = `error (${e.message})`;
    }
    if (status === 429 || status === 503 || typeof status === "string") notes.push(`⚠ ${status} (anti-bot / red, revisar a mano): ${url}`);
    else if (status >= 400) fail(`Enlace externo ${status}: ${url}`);
    else notes.push(`${status} ${url}`);
  }
} else {
  notes.push(`${externals.length} enlaces externos no comprobados (usa CHECK_LINKS=1)`);
}

notes.forEach((n) => console.log(`· ${n}`));
if (problems.length) {
  problems.forEach((p) => console.error(`✗ ${p}`));
  process.exit(1);
}
console.log(`✓ Validación estática superada (${ids.size} ids, ${local.size} recursos locales, modo ${config.mode}).`);
