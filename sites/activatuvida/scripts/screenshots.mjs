// Validación en navegador real (Playwright/Chromium) + capturas.
// Uso: npm run build && npm run screenshots
// Requiere Playwright instalado (global o local); no descarga navegadores.
import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "docs", "capturas");
const PORT = 4181;
const BASE = `http://localhost:${PORT}`;

async function loadPlaywright() {
  const candidates = ["playwright", "/opt/node22/lib/node_modules/playwright/index.js"];
  for (const c of candidates) {
    try {
      const req = createRequire(import.meta.url);
      return req(c);
    } catch { /* siguiente */ }
  }
  const global = path.join(process.execPath, "..", "..", "lib", "node_modules", "playwright", "index.js");
  return import(pathToFileURL(global).href);
}

const { chromium } = await loadPlaywright();
const server = spawn(process.execPath, [path.join(root, "scripts/serve.mjs")], { env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 600));

const results = [];
const ok = (name, pass, detail = "") => results.push({ name, pass, detail });

const launchOpts = process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {};
const browser = await chromium.launch(launchOpts);
await fs.mkdir(outDir, { recursive: true });

try {
  // --- Redirecciones y aislamiento --------------------------------------
  for (const [from, expectStatus, expectLoc] of [
    ["/X39", 200, null], ["/x39", 301, "/X39"], ["/X39/", 301, "/X39"], ["/x39/", 301, "/X39?utm=1"], ["/X39/index.html", 301, "/X39"], ["/otra-ruta", 404, null],
  ]) {
    const u = from === "/x39/" ? `${from}?utm=1` : from;
    const res = await fetch(BASE + u, { redirect: "manual" });
    const loc = res.headers.get("location");
    ok(`HTTP ${u}`, res.status === expectStatus && (!expectLoc || loc === expectLoc), `${res.status}${loc ? ` → ${loc}` : ""}`);
  }

  // --- Capturas y comprobaciones por ancho --------------------------------
  for (const width of [360, 390, 768, 1440]) {
    const ctx = await browser.newContext({ viewport: { width, height: width < 700 ? 780 : 900 }, deviceScaleFactor: width < 700 ? 2 : 1 });
    const page = await ctx.newPage();
    const errors = [];
    const external = new Set();
    page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/*", (route) => {
      const u = new URL(route.request().url());
      if (u.hostname !== "localhost") { external.add(u.hostname); return route.abort(); }
      return route.continue();
    });
    await page.goto(`${BASE}/X39`, { waitUntil: "networkidle" });
    // Forzar la aparición de todo antes de capturar la página completa.
    // Recorrer la página como un visitante (dispara la carga diferida).
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight * 0.8) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 120));
      }
      document.querySelectorAll('img[loading="lazy"]').forEach((img) => { img.loading = "eager"; });
      await Promise.all([...document.images].map((img) => (img.complete ? null : new Promise((r) => { img.onload = img.onerror = r; }))));
      document.querySelectorAll("[data-reveal]").forEach((el) => el.classList.add("is-in"));
      document.querySelectorAll(".h-section, .h-statement").forEach((el) => el.classList.add("is-words"));
      document.querySelectorAll(".section").forEach((el) => el.classList.add("is-lit"));
      window.scrollTo(0, 0);
    });
    const broken = await page.$$eval("img", (imgs) => imgs.filter((i) => !i.naturalWidth).map((i) => i.currentSrc || i.src));
    ok(`${width}px imágenes cargadas`, broken.length === 0, broken.slice(0, 3).join(", "));
    await page.waitForTimeout(900);

    if (width === 390) {
      await page.goto(`${BASE}/X39`, { waitUntil: "networkidle" });
      await page.$eval("#offer-title", (el) => el.scrollIntoView({ block: "center" }));
      await page.waitForTimeout(1500);
      const op = await page.$eval("#offer-title .w", (el) => getComputedStyle(el).opacity);
      ok("Títulos palabra a palabra se revelan al hacer scroll", parseFloat(op) > 0.95, `opacidad ${op}`);
      await page.evaluate(() => window.scrollTo(0, 0));
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(`${width}px sin scroll horizontal`, overflow <= 0, `exceso ${overflow}px`);
    ok(`${width}px sin peticiones externas al cargar`, external.size === 0, [...external].join(", "));

    await page.screenshot({ path: path.join(outDir, `x39-${width}-full.jpg`), fullPage: true, type: "jpeg", quality: 70 });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outDir, `x39-${width}-hero.jpg`), type: "jpeg", quality: 82 });

    if (width < 1024) {
      await page.click("[data-menu-toggle]");
      const open = await page.$eval("[data-menu]", (m) => !m.hidden);
      const focusInMenu = await page.evaluate(() => document.activeElement?.closest("[data-menu]") !== null);
      await page.screenshot({ path: path.join(outDir, `x39-${width}-menu.jpg`), type: "jpeg", quality: 80 });
      await page.keyboard.press("Escape");
      const closed = await page.$eval("[data-menu]", (m) => m.hidden);
      const focusBack = await page.evaluate(() => document.activeElement?.matches("[data-menu-toggle]"));
      ok(`${width}px menú móvil (abrir/foco/Esc/foco)`, open && focusInMenu && closed && focusBack);
      await page.click("[data-menu-toggle]");
      await page.click('.menu__link[href="#uso"]');
      await page.waitForTimeout(2200);
      const usoTop = await page.$eval("#uso", (el) => Math.round(el.getBoundingClientRect().top));
      ok(`${width}px ancla del menú (#uso)`, Math.abs(usoTop) < 120, `top ${usoTop}px`);
    }

    // Diálogo de paquetes
    await page.click('[data-dialog-open="dlg-packages"]');
    const dlgOpen = await page.$eval("#dlg-packages", (d) => d.open);
    if (width === 390) await page.screenshot({ path: path.join(outDir, `x39-${width}-dialogo.jpg`), type: "jpeg", quality: 80 });
    await page.keyboard.press("Escape");
    const dlgClosed = await page.$eval("#dlg-packages", (d) => !d.open);
    ok(`${width}px diálogo de paquetes`, dlgOpen && dlgClosed);

    // Carrusel manual
    const before = await page.$eval("[data-carousel-status]", (s) => s.textContent);
    await page.click("[data-carousel-next]");
    await page.waitForTimeout(900);
    const after = await page.$eval("[data-carousel-status]", (s) => s.textContent);
    ok(`${width}px carrusel (siguiente)`, before !== after, `${before} → ${after}`);

    // Video a demanda: el iframe solo aparece tras el clic
    const iframesBefore = await page.$$eval("iframe", (f) => f.length);
    await page.click("#video .player__poster");
    const src = await page.$eval("#video iframe", (f) => f.src).catch(() => "");
    // Ventana de estudios
    await page.click('#ghk-cu [data-dialog-open="dlg-studies"]');
    const stOpen = await page.$eval("#dlg-studies", (d) => d.open);
    const stLinks = await page.$$eval("#dlg-studies a[href$='.pdf']", (a) => a.length);
    if (width === 390) await page.screenshot({ path: path.join(outDir, `x39-${width}-estudios.jpg`), type: "jpeg", quality: 80 });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    ok(`${width}px ventana de estudios (${stLinks} PDF)`, stOpen && stLinks === 14);
    ok(`${width}px video bajo demanda`, iframesBefore === 0 && src.includes("player.vimeo.com/video/1133177065"), src.slice(0, 60));

    // Testimonio en diálogo
    await page.click(".t-card__btn");
    const tSrc = await page.$eval("#dlg-video iframe", (f) => f.src).catch(() => "");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    const tCleared = await page.$$eval("#dlg-video iframe", (f) => f.length === 0);
    ok(`${width}px testimonio en diálogo (abre y detiene)`, tSrc.includes("player.vimeo.com") && tCleared, `src=${tSrc.slice(0, 40)} cerrado=${tCleared}`);

    ok(`${width}px sin errores de consola`, errors.filter((e) => !/ERR_FAILED|net::/.test(e)).length === 0, errors.join(" | ").slice(0, 200));
    await ctx.close();
  }

  // --- Movimiento reducido y teclado ------------------------------------------
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, reducedMotion: "reduce" });
  const page = await ctx.newPage();
  await page.route("**/*", (r) => (new URL(r.request().url()).hostname === "localhost" ? r.continue() : r.abort()));
  await page.goto(`${BASE}/X39`, { waitUntil: "networkidle" });
  const hidden = await page.$$eval("[data-reveal]", (els) => els.filter((e) => getComputedStyle(e).opacity !== "1").length);
  ok("prefers-reduced-motion: contenido visible sin animación", hidden === 0, `${hidden} ocultos`);
  await page.keyboard.press("Tab");
  const skip = await page.evaluate(() => document.activeElement?.className);
  ok("Teclado: primer Tab = «Saltar al contenido»", skip === "skip-link");
  await ctx.close();

  // --- Sin JavaScript --------------------------------------------------------
  const nojs = await browser.newContext({ viewport: { width: 390, height: 780 }, javaScriptEnabled: false });
  const p2 = await nojs.newPage();
  await p2.goto(`${BASE}/X39`);
  const visible = await p2.$eval("#tech-title", (el) => getComputedStyle(el.closest("section")).opacity);
  ok("Sin JavaScript: contenido visible", visible === "1");
  await nojs.close();
} finally {
  await browser.close();
  server.kill();
}

const failed = results.filter((r) => !r.pass);
for (const r of results) console.log(`${r.pass ? "✓" : "✗"} ${r.name}${r.detail ? ` — ${r.detail}` : ""}`);
console.log(`\n${results.length - failed.length}/${results.length} comprobaciones superadas. Capturas en docs/capturas/`);
await fs.writeFile(path.join(root, "docs", "capturas", "resultados.json"), JSON.stringify(results, null, 2));
process.exit(failed.length ? 1 : 0);
