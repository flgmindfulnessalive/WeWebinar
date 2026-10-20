// Efectos visuales: tipografías, fondo de ondas, halo del cursor, cifras que
// cuentan, inclinación 3D y botones magnéticos. Todo respeta «reducir
// movimiento» y los efectos de mouse solo existen con puntero fino.
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent } from "react";
import manrope from "@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2?url";
import unbounded from "@fontsource-variable/unbounded/files/unbounded-latin-wght-normal.woff2?url";

export const reducedMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
export const finePointer = () => typeof matchMedia === "function" && matchMedia("(hover: hover) and (pointer: fine)").matches;

export function loadFonts() {
  if (typeof FontFace === "undefined") return;
  for (const [family, url] of [["Manrope", manrope], ["Unbounded", unbounded]] as const) {
    const f = new FontFace(family, `url(${url}) format("woff2")`, { weight: "200 900", display: "swap" });
    f.load().then((x) => document.fonts.add(x)).catch(() => { /* se queda la tipografía del sistema */ });
  }
}

/** Energía del fondo (0 = calma). La calculadora la sube con tu total. */
let energy = 0.4;
export const setWaveEnergy = (x: number) => { energy = Math.max(0.25, Math.min(2.2, x)); };

/** Fondo de ondas de luz a pantalla completa. */
export function startWaves(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  let w = 0, h = 0, raf = 0, t = 0, amp = energy;
  const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
  const resize = () => {
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  const LINES = 12;
  // Colores de las ondas desde el tema (--wave: "r,g,b|r,g,b|r,g,b|intensidad").
  let pal = { a: "60,224,255", b: "143,183,255", c: "255,194,74", k: 1 };
  const readPal = () => {
    const v = getComputedStyle(document.documentElement).getPropertyValue("--wave").trim();
    const [a, b, c, k] = v.split("|");
    if (a && b && c) pal = { a, b, c, k: Number(k) || 1 };
  };
  readPal();
  const mo = new MutationObserver(() => { readPal(); draw(); });
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  const draw = () => {
    ctx.clearRect(0, 0, w, h);
    amp += (energy - amp) * 0.035;
    const base = h * 0.58, step = Math.max(8, Math.round(w / 140));
    for (let i = 0; i < LINES; i++) {
      const k = i / (LINES - 1);
      ctx.beginPath();
      for (let x = 0; x <= w + step; x += step) {
        const y = base + Math.sin(x * 0.0042 + t + i * 0.38) * (22 + i * 7) * amp + Math.sin(x * 0.011 - t * 0.7 + i) * 9 * amp + i * 16;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      const g = ctx.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, `rgba(${pal.a},${(0.05 + k * 0.28) * pal.k})`);
      g.addColorStop(0.6, `rgba(${pal.b},${(0.04 + k * 0.18) * pal.k})`);
      g.addColorStop(1, `rgba(${pal.c},${(0.03 + k * 0.22) * pal.k})`);
      ctx.strokeStyle = g; ctx.lineWidth = 1 + k * 1.4; ctx.stroke();
    }
  };
  const loop = () => { t += 0.01; draw(); raf = requestAnimationFrame(loop); };
  const still = reducedMotion();
  const onVis = () => { cancelAnimationFrame(raf); if (!document.hidden && !still) loop(); };
  resize(); draw();
  addEventListener("resize", resize);
  document.addEventListener("visibilitychange", onVis);
  if (!still) loop();
  // Con movimiento reducido, se redibuja solo al cambiar la energía.
  const iv = still ? setInterval(() => { amp = energy; draw(); }, 500) : 0;
  return () => { mo.disconnect(); cancelAnimationFrame(raf); clearInterval(iv); removeEventListener("resize", resize); document.removeEventListener("visibilitychange", onVis); };
}

/** Halo de luz que sigue al cursor (variables --mx y --my en <html>). */
export function startSpotlight() {
  if (!finePointer()) return () => {};
  const root = document.documentElement;
  let raf = 0, x = 0, y = 0;
  const on = (e: PointerEvent) => {
    x = e.clientX; y = e.clientY;
    if (!raf) raf = requestAnimationFrame(() => { root.style.setProperty("--mx", `${x}px`); root.style.setProperty("--my", `${y}px`); raf = 0; });
  };
  root.classList.add("has-spot");
  addEventListener("pointermove", on, { passive: true });
  return () => { removeEventListener("pointermove", on); root.classList.remove("has-spot"); };
}

/** Número que cuenta suavemente hasta su nuevo valor. */
export function useTween(value: number, ms = 700) {
  const [shown, setShown] = useState(value);
  const from = useRef(value);
  useEffect(() => {
    if (reducedMotion() || from.current === value) { from.current = value; setShown(value); return; }
    const a = from.current, t0 = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3);
      const v = a + (value - a) * e;
      from.current = v; setShown(v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, ms]);
  return shown;
}

/** Inclinación 3D y brillo del borde siguiendo al cursor. */
export const tilt = {
  onPointerMove(e: RPointerEvent<HTMLElement>) {
    if (e.pointerType !== "mouse" || reducedMotion()) return;
    const el = e.currentTarget, r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${(0.5 - py) * 6}deg`);
    el.style.setProperty("--ry", `${(px - 0.5) * 8}deg`);
    el.style.setProperty("--gx", `${px * 100}%`);
    el.style.setProperty("--gy", `${py * 100}%`);
  },
  onPointerLeave(e: RPointerEvent<HTMLElement>) {
    const el = e.currentTarget;
    el.style.removeProperty("--rx"); el.style.removeProperty("--ry");
  },
};

/** Botón que se acerca un poco al cursor. */
export const magnetic = {
  onPointerMove(e: RPointerEvent<HTMLElement>) {
    if (e.pointerType !== "mouse" || reducedMotion()) return;
    const el = e.currentTarget, r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate(${dx * 0.22}px, ${dy * 0.22}px)`;
  },
  onPointerLeave(e: RPointerEvent<HTMLElement>) { e.currentTarget.style.transform = ""; },
};

/** Tema: el que eligió el visitante, o el del sistema (claro u oscuro). ?tema=claro|oscuro lo fuerza. */
export type Theme = "light" | "dark";
const THEME_KEY = "sim101020:tema";
export function initialTheme(): Theme {
  const q = new URLSearchParams(location.search).get("tema");
  if (q === "claro") return "light";
  if (q === "oscuro") return "dark";
  try { const v = localStorage.getItem(THEME_KEY); if (v === "light" || v === "dark") return v; } catch { /* sin almacenamiento */ }
  return typeof matchMedia === "function" && matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
}
export function applyTheme(t: Theme, remember = false) {
  const root = document.documentElement;
  if (t === "light") root.dataset.theme = "light"; else delete root.dataset.theme;
  root.style.colorScheme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", t === "light" ? "#f4f5f9" : "#0a0e1a");
  if (remember) try { localStorage.setItem(THEME_KEY, t); } catch { /* sin almacenamiento */ }
}
