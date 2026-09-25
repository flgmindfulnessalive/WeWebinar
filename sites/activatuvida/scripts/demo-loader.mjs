// Demo de la pantalla de carga «Activación» (solo para la vista previa).
// Genera dist/X39/assets/demo-loader.html → /X39/assets/demo-loader
// Uso: npm run build && node scripts/demo-loader.mjs && npm run deploy:preview
import { writeFileSync } from "node:fs";
import { loaderCss, loaderHtml } from "../src/components/loader.mjs";

const out = new URL("../dist/X39/assets/demo-loader.html", import.meta.url);
const page = `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="robots" content="noindex">
<title>Demo · pantalla de carga</title>
<style>
@font-face { font-family: Inter; src: url(/X39/assets/fonts/inter-var.woff2) format("woff2"); font-weight: 100 900; }
@font-face { font-family: "JetBrains Mono"; src: url(/X39/assets/fonts/mono-var.woff2) format("woff2"); font-weight: 100 800; }
@font-face { font-family: Sora; src: url(/X39/assets/fonts/sora-var.woff2) format("woff2"); font-weight: 100 800; }
html, body { margin: 0; height: 100%; background: #05070b; color: #eef3fa; font-family: Inter, system-ui, sans-serif; }
.mock { min-height: 100%; display: grid; place-items: center; text-align: center; padding: 16px; }
.mock h1 { font: 800 clamp(2.2rem, 11vw, 5rem)/1 Sora, sans-serif; margin: 0 0 12px;
  background: linear-gradient(105deg, #b36bc4 0%, #6d8cff 30%, #5eb3e6 60%, #9fe8d9 100%); -webkit-background-clip: text; background-clip: text; color: transparent; }
.mock p { color: #b6c2d3; margin: 0; }
.bar { position: fixed; left: 50%; bottom: max(16px, env(safe-area-inset-bottom)); transform: translateX(-50%); z-index: 1001;
  display: flex; gap: 6px; padding: 6px; border-radius: 999px; background: rgba(14,29,53,.85); border: 1px solid rgba(190,215,255,.2); backdrop-filter: blur(8px); }
.bar button { white-space: nowrap; font: 600 .78rem Inter, sans-serif; color: #b6c2d3; background: none; border: 0; border-radius: 999px; padding: 10px 12px; cursor: pointer; }
.bar button[aria-pressed="true"] { background: #eef3fa; color: #05070b; }
${loaderCss}
</style></head>
<body>
<main class="mock"><div><h1>ACTIVA TU VIDA</h1><p>(aquí aparece la página)</p></div></main>
<div id="a">${loaderHtml()}</div>
<div id="b" hidden>${loaderHtml({ message: "Te llevamos a la tienda oficial de LifeWave…", note: "Conexión segura · lifewave.com" })}</div>
<nav class="bar" aria-label="Demo">
  <button type="button" data-mode="a" aria-pressed="true">A · Entrada</button>
  <button type="button" data-mode="b" aria-pressed="false">B · Tienda</button>
  <button type="button" data-replay aria-label="Repetir">↻ Repetir</button>
</nav>
<script>
let mode = "a", timers = [];
const ld = () => document.querySelector("#" + mode + " .ld");
function run() {
  timers.forEach(clearTimeout); timers = [];
  for (const m of ["a", "b"]) document.getElementById(m).hidden = m !== mode;
  const el = ld(); el.classList.remove("is-done", "is-hidden");
  timers.push(setTimeout(() => el.classList.add("is-done"), 3200));
  timers.push(setTimeout(() => el.classList.add("is-hidden"), 3650));
  timers.push(setTimeout(run, 5600));
}
document.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => {
  mode = b.dataset.mode;
  document.querySelectorAll("[data-mode]").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
  run();
}));
document.querySelector("[data-replay]").addEventListener("click", run);
run();
</script>
</body></html>`;
writeFileSync(out, page);
console.log("✓ dist/X39/assets/demo-loader.html");
