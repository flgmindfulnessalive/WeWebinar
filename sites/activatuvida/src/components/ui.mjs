// Componentes base reutilizables. Cada función recibe `ctx` (config,
// rutas y metadatos de imágenes) y devuelve HTML seguro.
import { html, raw, attrs } from "../lib/html.mjs";

// --- Iconos (trazo fino, heredan currentColor) ---------------------------
const ICONS = {
  play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor" stroke="none"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  down: '<path d="M12 5v14M6 13l6 6 6-6"/>',
  external: '<path d="M14 5h5v5M19 5l-8 8M18 14v5H5V6h5"/>',
  doc: '<path d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  menu: '<path d="M4 8h16M4 16h16"/>',
  prev: '<path d="M15 5l-7 7 7 7"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  bag: '<path d="M6 8h12l-1 12H7zM9 8V6a3 3 0 016 0v2"/>',
  spark: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6.3 6.3l2.8 2.8M14.9 14.9l2.8 2.8M6.3 17.7l2.8-2.8M14.9 9.1l2.8-2.8"/>',
  mail: '<path d="M4 6h16v12H4zM4 7l8 6 8-6"/>',
  chat: '<path d="M5 19l1.4-3.6A7.5 7.5 0 1119.5 12 7.5 7.5 0 018.7 18.3z"/>',
  shield: '<path d="M12 3l7 3v5c0 5-3.2 8.3-7 10-3.8-1.7-7-5-7-10V6z"/><path d="M9 12l2 2 4-4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
};

export function icon(name, cls = "icon") {
  return raw(
    `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name]}</svg>`,
  );
}

// --- Texto -------------------------------------------------------------
export function kicker(text) {
  return html`<p class="kicker">${text}</p>`;
}

export function heading(title, { level = 2, cls = "h-section", id } = {}) {
  const lines = Array.isArray(title) ? title : [title];
  const inner = lines.map((l, i) => html`${i ? raw("<br>") : ""}<span>${l}</span>`);
  return raw(`<h${level} class="${cls}"${id ? ` id="${id}"` : ""}>${inner.map(String).join("")}</h${level}>`);
}

export function sectionHead({ kicker: k, title, lead, id, align = "start" }) {
  return html`<header class="section-head section-head--${align}">
    ${k ? kicker(k) : ""}
    ${heading(title, { id })}
    ${lead ? html`<p class="lead">${lead}</p>` : ""}
  </header>`;
}

export function tags(list = []) {
  return html`<ul class="tags" role="list">${list.map((t) => html`<li>${t}</li>`)}</ul>`;
}

// --- Imágenes responsive ------------------------------------------------
export function picture(ctx, { src, alt, sizes = "100vw", cls = "", loading = "lazy", priority = false }) {
  const meta = ctx.images[src];
  if (!meta) throw new Error(`Imagen no encontrada: ${src}`);
  const srcset = meta.variants.map((v) => `${ctx.assets}/${meta.dir}/${src}-${v.w}.webp ${v.w}w`).join(", ");
  const fallback = meta.variants[Math.min(1, meta.variants.length - 1)];
  return html`<img${attrs({
    class: cls || null,
    src: `${ctx.assets}/${meta.dir}/${src}-${fallback.w}.webp`,
    srcset,
    sizes,
    width: fallback.w,
    height: fallback.h,
    alt,
    loading: priority ? "eager" : loading,
    decoding: "async",
    fetchpriority: priority ? "high" : null,
  })}>`;
}

// --- Parche X39 (render vectorial fiel: disco circular, exterior
//     transparente y centro blanco) ----------------------------------
let patchSeq = 0;
export function patchVisual({ cls = "", label = "Representación del parche LifeWave X39: disco circular transparente con centro blanco" } = {}) {
  const id = `p${++patchSeq}`;
  const a11y = label ? `role="img" aria-label="${label}"` : 'aria-hidden="true" focusable="false"';
  return raw(`<svg class="patch ${cls}" viewBox="0 0 400 400" ${a11y}>
  <defs>
    <radialGradient id="${id}-glass" cx="50%" cy="46%" r="52%">
      <stop offset="0" stop-color="#eaf4ff" stop-opacity=".03"/>
      <stop offset=".6" stop-color="#cfe6ff" stop-opacity=".05"/>
      <stop offset=".88" stop-color="#e6f3ff" stop-opacity=".16"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity=".42"/>
    </radialGradient>
    <radialGradient id="${id}-core" cx="44%" cy="38%" r="70%">
      <stop offset="0" stop-color="#ffffff"/>
      <stop offset=".7" stop-color="#eef3f9"/>
      <stop offset="1" stop-color="#d9e2ee"/>
    </radialGradient>
    <linearGradient id="${id}-spec" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#fff" stop-opacity=".85"/>
      <stop offset=".35" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="${id}-rim" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity=".95"/>
      <stop offset=".5" stop-color="#cfe6ff" stop-opacity=".25"/>
      <stop offset="1" stop-color="#ffffff" stop-opacity=".7"/>
    </linearGradient>
    <filter id="${id}-fabric" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="1.35" numOctaves="2" seed="7" result="n"/>
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.6  0 0 0 0 0.7  0 0 0 .22 0"/>
      <feComposite in2="SourceGraphic" operator="in"/>
    </filter>
    <filter id="${id}-soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="6"/></filter>
  </defs>
  <circle cx="200" cy="200" r="182" fill="url(#${id}-glass)"/>
  <circle cx="200" cy="200" r="181.5" fill="none" stroke="url(#${id}-rim)" stroke-width="1.6"/>
  <circle cx="200" cy="200" r="172" fill="none" stroke="#bfe3ff" stroke-opacity=".18" stroke-width="1"/>
  <circle cx="200" cy="206" r="96" fill="#9fc8ff" opacity=".16" filter="url(#${id}-soft)"/>
  <circle cx="200" cy="200" r="94" fill="url(#${id}-core)"/>
  <circle cx="200" cy="200" r="94" fill="#fff" filter="url(#${id}-fabric)"/>
  <circle cx="200" cy="200" r="93.5" fill="none" stroke="#ffffff" stroke-opacity=".9" stroke-width="1"/>
  <path d="M58 150a150 150 0 0 1 120-110" fill="none" stroke="url(#${id}-spec)" stroke-width="10" stroke-linecap="round" opacity=".6"/>
  <ellipse cx="150" cy="120" rx="60" ry="18" transform="rotate(-38 150 120)" fill="#fff" opacity=".07"/>
</svg>`);
}

// --- Reproductor de video a demanda ------------------------------------
export function videoPlayer(ctx, { videoKey, videoId, title, duration, poster, posterHtml, ratio = "16/9", cls = "", sizes = "(min-width: 1100px) 1000px, 100vw", autoplayInView = false }) {
  const v = videoKey ? ctx.config.videos[videoKey] : { id: videoId, title, duration };
  const t = title || v.title;
  const d = duration || v.duration;
  return html`<figure class="player ${cls}" data-player data-vimeo="${v.id}" data-title="${t}"${raw(autoplayInView ? " data-autoplay-inview" : "")} style="--ratio:${ratio}">
    <button class="player__poster" type="button" aria-label="${`Reproducir video: ${t} (${d})`}">
      ${poster ? picture(ctx, { src: poster, alt: "", sizes, cls: "player__img" }) : ""}
      ${posterHtml || ""}
      <span class="player__play" aria-hidden="true">${icon("play")}</span>
      <span class="player__meta" aria-hidden="true"><span>${t}</span><span class="player__time">${d}</span></span>
    </button>
    <figcaption class="player__alt">¿No se reproduce? <a href="https://vimeo.com/${v.id}" target="_blank" rel="noopener">Ábrelo en Vimeo</a></figcaption>
  </figure>`;
}

// --- Acciones comerciales (resueltas desde la configuración) -----------
export function resolveAction(ctx, kind) {
  const { commerce, contact } = ctx.config;
  if (kind === "buy") return commerce.purchaseUrl || null;
  if (kind === "join") return commerce.joinUrl || null;
  if (kind === "whatsapp") {
    if (contact.whatsappUrl) return contact.whatsappUrl;
    if (!contact.whatsapp) return null;
    const num = String(contact.whatsapp).replace(/\D/g, "");
    return `https://wa.me/${num}?text=${encodeURIComponent(contact.whatsappMessage || "")}`;
  }
  if (kind === "email") {
    if (!contact.email) return null;
    return `mailto:${contact.email}?subject=${encodeURIComponent("LifeWave X39 · Información")}`;
  }
  return null;
}

const ACTION_META = {
  buy: { icon: "bag", setting: "commerce.purchaseUrl", external: true },
  join: { icon: "spark", setting: "commerce.joinUrl", external: true },
  whatsapp: { icon: "chat", setting: "contact.whatsappUrl", external: true },
  email: { icon: "mail", setting: "contact.email", external: false },
};

export function actionButton(ctx, kind, { label, variant = "primary", cls = "" }) {
  const href = resolveAction(ctx, kind);
  const meta = ACTION_META[kind];
  if (!href) {
    ctx.pending.add(meta.setting);
    if (ctx.mode === "production") return "";
    return html`<span class="btn btn--${variant} btn--pending ${cls}" aria-disabled="true" title="${`Configurar ${meta.setting} en site.config.mjs`}">
      ${icon(meta.icon)}<span>${label}</span><small class="pending-tag">Pendiente</small>
    </span>`;
  }
  return html`<a class="btn btn--${variant} ${cls}"${attrs({
    href,
    target: meta.external ? "_blank" : null,
    rel: meta.external ? "noopener" : null,
    "data-track": `cta_${kind}`,
  })}>${icon(meta.icon)}<span>${label}</span></a>`;
}

export function linkButton({ href, label, variant = "primary", iconName = "arrow", cls = "", external = false, track }) {
  return html`<a class="btn btn--${variant} ${cls}"${attrs({
    href,
    target: external ? "_blank" : null,
    rel: external ? "noopener" : null,
    "data-track": track || null,
  })}><span>${label}</span>${iconName ? icon(iconName) : ""}</a>`;
}

export function docLink(ctx, { key, group = "documents", label, cls = "doc-link" }) {
  const href = ctx.config[group][key];
  if (!href) throw new Error(`Enlace no configurado: ${group}.${key}`);
  return html`<a class="${cls}" href="${href}" target="_blank" rel="noopener">${icon("doc")}<span>${label}</span>${icon("external", "icon icon--sm")}</a>`;
}

// --- Trama de puntos (sello de marca) ---------------------------------
// Media luna de puntos que nace en la esquina superior derecha, inspirada
// en la identidad gráfica de LifeWave pero generada aquí (no es su gráfico).
export function halftone({ w = 300, h = 234, max = 6.5 } = {}) {
  const cx = w * 1.02;
  const cy = -h * 0.18;
  const R0 = w * 0.66;
  const band = w * 0.26;
  const step = max * 2.35;
  let dots = "";
  for (let y = step / 2, r = 0; y < h; y += step * 0.866, r++) {
    for (let x = (r % 2 ? step / 2 : 0) + step / 2; x < w; x += step) {
      const d = Math.hypot(x - cx, y - cy);
      let f = Math.exp(-(((d - R0) / band) ** 2));
      f *= Math.min(1, x / (w * 0.85)) ** 1.3;
      f *= Math.max(0, 1 - (y / h) ** 1.6);
      const rad = max * f;
      if (rad < 0.45) continue;
      dots += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad.toFixed(2)}"/>`;
    }
  }
  return raw(`<svg class="halftone" viewBox="0 0 ${w} ${h}" aria-hidden="true" focusable="false">${dots}</svg>`);
}
