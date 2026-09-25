// Pantalla de carga «Activación»: el parche del Hero con dos anillos de luz
// que giran en sentidos opuestos y destellos que el parche absorbe.
// Solo CSS + SVG, sin imágenes ni librerías.
// Estados: .ld (visible) · .ld.is-done (destello de salida y fundido).
import { raw } from "../lib/html.mjs";
import { patchVisual } from "./ui.mjs";

// Destellos absorbidos: [ángulo °, retraso s]
const FALLS = [[20, 0], [140, -0.55], [255, -1.1], [320, -0.3]];

export const loaderCss = `
.ld { position: fixed; inset: 0; z-index: 1000; display: grid; place-items: center; align-content: center; gap: 28px;
  background: radial-gradient(120% 80% at 50% 45%, #0e1d35 0%, #0a1426 35%, #05070b 75%); color: #eef3fa;
  transition: opacity .45s cubic-bezier(.2,.7,.1,1), visibility .45s; }
.ld.is-hidden { opacity: 0; visibility: hidden; pointer-events: none; }
.ld__stage { position: relative; width: min(64vw, 280px); aspect-ratio: 1; }
.ld__stage > *, .ld__ring { position: absolute; display: block; }
.ld__halo { inset: 8%; border-radius: 50%; background: radial-gradient(closest-side, rgba(150,210,255,.38), rgba(109,140,255,.14) 55%, transparent 72%);
  filter: blur(6px); animation: ld-breathe 1.6s ease-in-out infinite; }
.ld__patch { inset: 24%; animation: ld-absorb 1.6s ease-in-out infinite; filter: drop-shadow(0 0 18px rgba(150,210,255,.45)); }
.ld__patch .patch { width: 100%; height: 100%; }
.ld__ring { inset: 12%; border-radius: 50%; }
.ld__ring::before { content: ""; position: absolute; inset: 0; border-radius: 50%; border: 1px solid rgba(190,215,255,.12); }
.ld__ring::after { content: ""; position: absolute; inset: 0; border-radius: 50%;
  background: conic-gradient(from 0deg, transparent 0 62%, var(--c1) 90%, #fff 100%);
  -webkit-mask: radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px));
          mask: radial-gradient(farthest-side, transparent calc(100% - 2.5px), #000 calc(100% - 2px)); }
.ld__ring i { position: absolute; left: 50%; top: 0; width: 7px; height: 7px; margin: -3.5px 0 0 -3.5px; border-radius: 50%;
  background: #fff; box-shadow: 0 0 10px 3px var(--c1), 0 0 26px 8px var(--c2); }
.ld__ring--a { --c1: #74e4ff; --c2: rgba(116,228,255,.45); animation: ld-spin 2.4s linear infinite; }
.ld__ring--b { inset: 1%; --c1: #b36bc4; --c2: rgba(109,140,255,.5); transform: rotateX(68deg); }
.ld__tilt { inset: 0; perspective: 700px; }
.ld__tilt .ld__ring--b { animation: ld-spin-tilt 3.6s linear infinite reverse; }
.ld__fall { inset: 0; transform: rotate(var(--a)); }
.ld__fall b { position: absolute; left: 50%; top: 0; width: 6px; height: 6px; margin-left: -3px; border-radius: 50%; background: #fff;
  box-shadow: 0 0 8px 2px #74e4ff; animation: ld-fall 1.6s cubic-bezier(.55,0,.8,.4) infinite; animation-delay: var(--dl); }
.ld__wave { inset: 24%; border-radius: 50%; border: 2px solid rgba(214,236,255,.9); opacity: 0; box-shadow: 0 0 30px rgba(150,210,255,.6); }
.ld__text { text-align: center; font: 500 .72rem/1.6 "JetBrains Mono", ui-monospace, Menlo, monospace; letter-spacing: .34em; text-transform: uppercase; }
.ld__brand { background: linear-gradient(105deg, #b36bc4 0%, #6d8cff 30%, #5eb3e6 60%, #9fe8d9 100%); -webkit-background-clip: text; background-clip: text; color: transparent;
  animation: ld-shimmer 2.4s ease-in-out infinite; }
.ld__msg { display: block; font: 400 .95rem/1.5 Inter, system-ui, sans-serif; letter-spacing: 0; text-transform: none; color: #b6c2d3; margin-top: 10px; }
.ld__msg small { display: block; font-size: .72rem; color: #9aa7bc; margin-top: 4px; }
.ld.is-done .ld__wave { animation: ld-wave .7s cubic-bezier(.2,.7,.1,1) forwards; }
.ld.is-done .ld__patch { animation: ld-flash .7s cubic-bezier(.2,.7,.1,1) forwards; }
.ld.is-done .ld__ring, .ld.is-done .ld__fall, .ld.is-done .ld__text { transition: opacity .35s; opacity: 0; }
@keyframes ld-spin { to { transform: rotate(360deg); } }
@keyframes ld-spin-tilt { from { transform: rotateX(68deg) rotate(0); } to { transform: rotateX(68deg) rotate(360deg); } }
@keyframes ld-breathe { 0%,100% { opacity: .65; transform: scale(.94); } 85% { opacity: 1; transform: scale(1.06); } }
@keyframes ld-absorb { 0%,70%,100% { transform: scale(1); filter: drop-shadow(0 0 16px rgba(150,210,255,.4)) brightness(1); }
  86% { transform: scale(1.045); filter: drop-shadow(0 0 34px rgba(170,225,255,.85)) brightness(1.12); } }
@keyframes ld-fall { 0% { transform: translateY(0) scale(.4); opacity: 0; } 25% { opacity: 1; transform: translateY(8%) scale(1); }
  100% { transform: translateY(calc(var(--stage) * .38)) scale(.2); opacity: 0; } }
@keyframes ld-wave { from { opacity: .95; transform: scale(1); } to { opacity: 0; transform: scale(3.2); } }
@keyframes ld-flash { 40% { transform: scale(1.18); filter: drop-shadow(0 0 60px rgba(200,235,255,1)) brightness(1.35); } 100% { transform: scale(.9); opacity: 0; } }
@keyframes ld-shimmer { 0%,100% { opacity: .7; } 50% { opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .ld *, .ld *::before, .ld *::after { animation: none !important; }
  .ld__fall { display: none; }
}
`;

// Contenedores de la página: .ld-boot (A, al cargar /X39) aparece solo si la
// carga tarda más de 0,3 s y se oculta sola a los 8 s si el JS no llega;
// .ld-go (B, al ir a la tienda) se muestra desde app.js.
export const loaderPageCss = `
.ld-boot, .ld-go { position: fixed; inset: 0; z-index: 1000; }
.ld-boot { animation: ld-in .35s .3s both, ld-safety 0s 8s forwards; }
.no-js .ld-boot, .ld-go[hidden] { display: none; }
@keyframes ld-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes ld-safety { to { visibility: hidden; } }
`;

export function loaderHtml({ message = "", note = "" } = {}) {
  const falls = FALLS.map(([a, dl]) => `<span class="ld__fall" style="--a:${a}deg"><b style="--dl:${dl}s"></b></span>`).join("");
  return raw(`<div class="ld" role="status" aria-live="polite" aria-label="${message || "Cargando"}">
  <div class="ld__stage" aria-hidden="true" style="--stage:min(64vw,280px)">
    <span class="ld__halo"></span>
    <span class="ld__tilt"><span class="ld__ring ld__ring--b"><i></i></span></span>
    <span class="ld__ring ld__ring--a"><i></i></span>
    ${falls}
    <span class="ld__wave"></span>
    <span class="ld__patch">${patchVisual({ label: "" })}</span>
  </div>
  <p class="ld__text"><span class="ld__brand">Activa tu vida · X39</span>${message ? `<span class="ld__msg">${message}${note ? `<small>${note}</small>` : ""}</span>` : ""}</p>
</div>`);
}
