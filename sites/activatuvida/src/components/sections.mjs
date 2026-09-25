// Secciones de la página /X39 (versión simplificada: 8 bloques).
// Solo presentación: textos en content/x39.mjs, destinos en site.config.mjs.
import { html, raw } from "../lib/html.mjs";
import {
  icon, kicker, heading, sectionHead, picture, patchVisual,
  videoPlayer, actionButton, linkButton, docLink, halftone,
} from "./ui.mjs";

const reveal = "data-reveal";

// --- Navegación ---------------------------------------------------------
export function siteHeader(ctx, nav) {
  const brand = ctx.config.site.brand;
  return html`<header class="site-header" data-header>
    <span class="scroll-progress" data-progress aria-hidden="true"></span>
    <div class="site-header__inner wrap">
      <a class="wordmark" href="#inicio" aria-label="${`${brand} · inicio`}">
        <span class="wordmark__main">${brand}</span><span class="wordmark__sub">X39</span>
      </a>
      <nav class="nav" aria-label="Secciones">
        <ul class="nav__list" role="list">
          ${nav.map((item) => html`<li><a class="nav__link" href="${item.href}">${item.label}</a></li>`)}
        </ul>
      </nav>
      <a class="btn btn--ghost btn--sm site-header__cta" href="#contacto">Hablemos</a>
      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="menu" data-menu-toggle>
        <span class="sr-only" data-menu-label>Abrir menú</span>${icon("menu", "icon icon--menu")}${icon("close", "icon icon--close")}
      </button>
    </div>
    <div class="menu" id="menu" data-menu hidden>
      <nav aria-label="Menú">
        <ul class="menu__list" role="list">
          ${nav.map((item, i) => html`<li style="${`--i:${i}`}"><a class="menu__link" href="${item.href}">${item.label}</a></li>`)}
          <li style="${`--i:${nav.length}`}"><a class="menu__link" href="#empresa">LifeWave</a></li>
        </ul>
        <a class="btn btn--primary menu__cta" href="#contacto">ACTIVA TU VIDA HOY ${icon("arrow")}</a>
      </nav>
    </div>
  </header>`;
}

// --- 1 · Hero -------------------------------------------------------------
export function hero(ctx, c) {
  return html`<section class="hero" id="inicio" aria-labelledby="hero-title">
    <div class="hero__atmos" aria-hidden="true">
      <span class="orb orb--sky"></span><span class="orb orb--mint"></span><span class="orb orb--violet"></span>
      <canvas class="lightfield" data-lightfield></canvas>
      <span class="beam"></span><span class="beam beam--2"></span><span class="halo"></span>
    </div>
    <div class="hero__inner wrap">
      <div class="hero__copy">
        <p class="kicker kicker--stack"><span class="kicker__lines">${c.eyebrow.map((l) => html`<span>${l}</span>`)}</span></p>
        ${heading(c.title, { level: 1, cls: "h-display", id: "hero-title" })}
        <p class="hero__lead">${c.lead}</p>
        <div class="btn-row">
          ${linkButton({ href: c.primary.href, label: c.primary.label, iconName: "play", track: "hero_primary" })}
          ${linkButton({ href: c.secondary.href, label: c.secondary.label, variant: "ghost", iconName: "down", track: "hero_secondary" })}
        </div>
      </div>
      <div class="hero__visual">
        <div class="hero__stage">
          <span class="hero__cone" aria-hidden="true"></span>
          <span class="hero__floor" aria-hidden="true"></span>
          <div class="hero__patch">${patchVisual({ cls: "patch--hero", label: "Parche LifeWave X39: disco circular transparente con centro blanco" })}</div>
        </div>
      </div>
    </div>
    <a class="scroll-cue" href="#contexto"><span>Desliza para explorar</span><i aria-hidden="true"></i></a>
  </section>`;
}

// --- 2 · El problema --------------------------------------------------------
export function intro(ctx, c) {
  return html`<section class="section intro" id="${c.id}" aria-labelledby="intro-title">
    <div class="wrap intro__grid">
      <div class="intro__media has-halftone" ${reveal}>
        ${picture(ctx, { ...c.image, sizes: "(min-width: 900px) 42vw, 100vw", cls: "media-img" })}
        ${halftone()}
      </div>
      <div class="intro__copy">
        ${kicker(c.kicker)}
        ${heading(c.title, { id: "intro-title" })}
        ${c.paragraphs.map((p) => html`<p class="body-lg" ${reveal}>${p}</p>`)}
        <ul class="signs" role="list">${c.signs.map((s) => html`<li ${reveal}>${s}</li>`)}</ul>
        <p class="intro__question" ${reveal}>${c.question}</p>
      </div>
    </div>
  </section>`;
}

// --- 3 · Categoría nueva + video principal --------------------------------------
export function category(ctx, c) {
  return html`<section class="section video-section" id="${c.id}" aria-labelledby="cat-title">
    <div class="wrap">
      <div class="category__copy">
        ${kicker(c.kicker)}
        ${heading(c.title, { cls: "h-statement", id: "cat-title" })}
        <p class="lead" ${reveal}>${c.lead}</p>
        <ul class="chips" role="list">${c.points.map((p) => html`<li>${icon("check")}${p}</li>`)}</ul>
      </div>
      <div class="video-section__frame" ${reveal}>
        ${videoPlayer(ctx, { videoKey: c.video, poster: c.poster, cls: "player--main" })}
      </div>
      <p class="tagline" ${reveal}>${c.tagline}</p>
      <p class="tagline-sub">${c.taglineSub}</p>
      <p class="motto" aria-label="${c.motto.join(", ")}">${c.motto.map((m, i) => html`${i ? raw('<span class="motto__dot" aria-hidden="true">·</span>') : ""}<span>${m}</span>`)}</p>
    </div>
  </section>`;
}

// --- 4 · Cómo funciona + GHK-Cu --------------------------------------------------
export function technology(ctx, c) {
  return html`<section class="section tech" id="${c.id}" aria-labelledby="tech-title">
    <div class="wrap tech__grid">
      <div class="tech__copy">
        ${kicker(c.kicker)}
        ${heading(c.title, { id: "tech-title" })}
        ${c.paragraphs.map((p) => html`<p class="body-lg" ${reveal}>${p}</p>`)}
      </div>
      <div class="tech__clip" ${reveal}>
        ${videoPlayer(ctx, { videoKey: c.clip.video, ratio: "16/9", posterHtml: raw(`<span class="player__art">${patchVisual({ cls: "patch--poster", label: "" })}</span>`) })}
      </div>
    </div>
    <div class="wrap">
      <ol class="steps-row" role="list">
        ${c.steps.map((s) => html`<li class="step" ${reveal}><span class="step__n">${s.n}</span><h3 class="h-card">${s.title}</h3><p>${s.text}</p></li>`)}
      </ol>
      <div class="ghk-band" id="ghk-cu" ${reveal}>
        <div>
          ${kicker(c.ghk.kicker)}
          <h3 class="h-sub" id="ghk-title">${c.ghk.title}</h3>
        </div>
        <div>
          <p class="body-lg">${c.ghk.text}</p>
          <button class="btn btn--ghost" type="button" data-dialog-open="dlg-studies">${icon("doc")}<span>${c.ghk.cta}</span></button>
        </div>
      </div>
    </div>
  </section>`;
}

// --- 5 · Beneficios ---------------------------------------------------------------
export function benefits(ctx, c) {
  return html`<section class="section benefits" id="${c.id}" aria-labelledby="benefits-title">
    <div class="benefits__bg" aria-hidden="true">${picture(ctx, { ...c.image, alt: "", sizes: "100vw", cls: "bg-img" })}</div>
    <div class="wrap benefits__inner">
      <div class="benefits__copy">
        ${kicker(c.kicker)}
        ${heading(c.title, { id: "benefits-title" })}
        <p class="lead">${c.lead}</p>
      </div>
      <div class="benefits__card glass" ${reveal}>
        <ul class="list-check list-check--lg" role="list">${c.items.map((b) => html`<li>${icon("check")}${b}</li>`)}</ul>
        <p class="benefits__aspiration">${c.aspiration}</p>
      </div>
    </div>
  </section>`;
}

// --- 6 · Experiencias ----------------------------------------------------------------
export function testimonials(ctx, c) {
  const items = c.items.filter((t) => t.enabled);
  return html`<section class="section testimonials" id="${c.id}" aria-labelledby="t-title">
    <div class="wrap testimonials__head">
      ${sectionHead({ kicker: c.kicker, title: c.title, lead: c.lead, id: "t-title" })}
      <div class="carousel-controls" data-carousel-controls>
        <button class="icon-btn" type="button" data-carousel-prev aria-controls="t-track" aria-label="Anterior">${icon("prev")}</button>
        <p class="carousel-status" aria-live="polite" data-carousel-status>1 / ${items.length}</p>
        <button class="icon-btn" type="button" data-carousel-next aria-controls="t-track" aria-label="Siguiente">${icon("next")}</button>
      </div>
    </div>
    <div class="carousel" data-carousel>
      <ul class="carousel__track" id="t-track" role="list" tabindex="0" aria-label="Experiencias en video. Desliza o usa las flechas.">
        ${items.map((t, i) => html`<li class="t-card" data-carousel-item>
          <button class="t-card__btn" type="button" data-video-dialog="${t.video}" data-video-title="${t.label}" aria-label="${`Ver experiencia ${i + 1} de ${items.length}: ${t.label} (${t.duration})`}">
            ${picture(ctx, { src: t.poster, alt: "", sizes: "(min-width: 900px) 260px, 62vw", cls: "t-card__img" })}
            <span class="t-card__play" aria-hidden="true">${icon("play")}</span>
            <span class="t-card__meta" aria-hidden="true"><span>${t.label}</span><span class="t-card__time">${t.duration}</span></span>
          </button>
        </li>`)}
      </ul>
    </div>
  </section>`;
}

// --- 7 · Uso + garantía -------------------------------------------------------------------
export function usage(ctx, c) {
  const g = c.guarantee;
  return html`<section class="section usage" id="${c.id}" aria-labelledby="usage-title">
    <div class="wrap usage__grid">
      <div class="usage__copy">
        ${kicker(c.kicker)}
        ${heading(c.title, { id: "usage-title" })}
        <ol class="usage-steps" role="list">
          ${c.steps.map((s) => html`<li class="usage-step" ${reveal}><span class="usage-step__n" aria-hidden="true">${s.n}</span><div><h3 class="h-card">${s.title}</h3><p>${s.text}</p></div></li>`)}
        </ol>
        <p class="note-line">${icon("info", "icon icon--sm")}${c.hydration}</p>
        <div class="btn-row">
          <button class="btn btn--ghost" type="button" data-dialog-open="dlg-placement" data-track="placement_dialog"><span>${c.placement.label}</span>${icon("arrow")}</button>
        </div>
      </div>
      <div class="usage__media has-halftone" ${reveal}>
        ${picture(ctx, { ...c.image, sizes: "(min-width: 900px) 40vw, 100vw", cls: "media-img" })}
        ${halftone()}
      </div>
    </div>
    <div class="wrap">
      <div class="guarantee" ${reveal}>
        <div class="guarantee__visual" aria-hidden="true">
          ${patchVisual({ cls: "patch--guarantee", label: "" })}
          <p class="guarantee__badge"><strong>${g.badge}</strong><span>garantía</span></p>
        </div>
        <div class="guarantee__copy">
          <h3 class="h-sub">${g.title}</h3>
          <p class="body-lg">${g.text}</p>
          <p class="fineprint">${g.note}</p>
        </div>
      </div>
    </div>
  </section>`;
}

// --- 8a · Empresa --------------------------------------------------------------------------
export function company(ctx, c) {
  return html`<section class="section company" id="${c.id}" aria-labelledby="company-title">
    <div class="wrap company__grid">
      <div class="company__video" ${reveal}>
        ${videoPlayer(ctx, { videoKey: c.founder.video, poster: c.founder.poster, sizes: "(min-width: 900px) 50vw, 100vw" })}
        <p class="founder"><strong>${c.founder.name}</strong><span>${c.founder.role}</span></p>
      </div>
      <div class="company__copy">
        ${kicker(c.kicker)}
        ${heading(c.title, { id: "company-title" })}
        ${c.paragraphs.map((p) => html`<p ${reveal}>${p}</p>`)}
        <div class="btn-row">
          <button class="btn btn--ghost" type="button" data-dialog-open="dlg-studies">${icon("doc")}<span>${c.studiesCta}</span></button>
        </div>
      </div>
    </div>
    <div class="wrap award" ${reveal}>
      <div class="award__stage">
        <span class="award__halo" aria-hidden="true"></span>
        ${trophy(ctx)}
        <span class="award__floor" aria-hidden="true"></span>
      </div>
      <div class="award__copy">
        ${kicker(c.award.kicker)}
        <h3 class="award__title">${c.award.title}</h3>
        <p class="award__sub">${c.award.sub}</p>
      </div>
    </div>
  </section>`;
}

// Trofeo de cristal facetado (vectorial, con los colores del sitio)
function trophy(ctx) {
  const O = [[146, 8], [244, 118], [266, 252], [232, 384], [66, 384], [34, 262], [66, 112]];
  const I = [[147, 44], [220, 128], [238, 250], [212, 360], [86, 360], [60, 262], [86, 124]];
  const pts = (a) => a.map((p) => p.join(",")).join(" ");
  const shades = [0.2, 0.08, 0.14, 0.04, 0.1, 0.18, 0.26];
  let facets = "";
  for (let i = 0; i < O.length; i++) {
    const j = (i + 1) % O.length;
    facets += `<polygon points="${pts([O[i], O[j], I[j], I[i]])}" fill="#dff1ff" fill-opacity="${shades[i]}" stroke="#ffffff" stroke-opacity=".35" stroke-width=".8"/>`;
  }
  return raw(`<svg class="trophy" viewBox="0 0 300 410" role="img" aria-label="Trofeo de cristal BioTech Breakthrough Award 2025 de LifeWave, Stem Cell Innovation of the Year">
  <defs>
    <linearGradient id="tr-face" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e8f5ff" stop-opacity=".22"/>
      <stop offset=".5" stop-color="#9fd0f5" stop-opacity=".06"/>
      <stop offset="1" stop-color="#9fe8d9" stop-opacity=".16"/>
    </linearGradient>
    <linearGradient id="tr-shine" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/>
      <stop offset=".5" stop-color="#fff" stop-opacity=".55"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="tr-base" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#dff1ff" stop-opacity=".45"/>
      <stop offset="1" stop-color="#5eb3e6" stop-opacity=".12"/>
    </linearGradient>
    <clipPath id="tr-clip"><polygon points="${pts(O)}"/></clipPath>
  </defs>
  <polygon points="${pts(O)}" fill="#0b1830" fill-opacity=".35"/>
  <polygon points="${pts(I)}" fill="url(#tr-face)"/>
  ${facets}
  <image href="${ctx.assets}/img/premio-biotech.webp" x="72" y="130" width="156" height="147" preserveAspectRatio="xMidYMid meet" opacity=".96"/>
  <text x="150" y="298" text-anchor="middle" class="tr-t4">LifeWave</text>
  <text x="150" y="318" text-anchor="middle" class="tr-t5">Stem Cell</text>
  <text x="150" y="332" text-anchor="middle" class="tr-t5">Innovation of the Year</text>
  <g clip-path="url(#tr-clip)"><rect class="tr-shine" x="-120" y="-20" width="90" height="460" fill="url(#tr-shine)" transform="skewX(-18)"/></g>
  <polyline points="${pts([O[6], O[0], O[1]])}" fill="none" stroke="#fff" stroke-opacity=".85" stroke-width="1.4" stroke-linejoin="round"/>
  <polygon points="${pts(O)}" fill="none" stroke="#cfe9ff" stroke-opacity=".55" stroke-width="1"/>
  <rect x="58" y="386" width="182" height="16" rx="3" fill="url(#tr-base)" stroke="#fff" stroke-opacity=".3"/>
  <g class="tr-sparks" fill="#fff"><circle cx="146" cy="10" r="2.2"/><circle cx="244" cy="118" r="1.6"/><circle cx="66" cy="112" r="1.4"/></g>
</svg>`);
}

// --- 8b · Opciones -------------------------------------------------------------------------
export function offer(ctx, c) {
  return html`<section class="section offer" id="${c.id}" aria-labelledby="offer-title">
    <div class="wrap">
      ${sectionHead({ kicker: c.kicker, title: c.title, id: "offer-title", align: "center" })}
      <ul class="packages" role="list">
        ${c.packages.map((p) => html`<li class="${`package${p.highlight ? " package--highlight" : ""}`}" ${reveal}>
          <p class="package__tier">${p.tier}</p>
          <h3 class="package__name">${p.name}</h3>
          <p class="package__verbs">${p.verbs}</p>
        </li>`)}
      </ul>
      <div class="offer__actions">
        <button class="btn btn--ghost" type="button" data-dialog-open="dlg-packages">${icon("info")}<span>${c.dialogCta}</span></button>
        ${actionButton(ctx, "buy", { label: "Comprar X39" })}
      </div>
    </div>
    <dialog class="dialog" id="dlg-packages" aria-labelledby="dlg-packages-title">
      <div class="dialog__panel">
        <button class="icon-btn dialog__close" type="button" data-dialog-close aria-label="Cerrar">${icon("close")}</button>
        ${kicker("Paquetes y precios")}
        <h2 class="h-sub" id="dlg-packages-title">${c.modesTitle}</h2>
        <ul class="modes" role="list">${c.modes.map((m) => html`<li><strong>${m.name}</strong><span>${m.text}</span></li>`)}</ul>
        ${pricesBlock(ctx)}
        <p class="fineprint">${c.pricesNote}</p>
        <div class="btn-row">
          ${actionButton(ctx, "buy", { label: "Ir a la tienda" })}
          ${actionButton(ctx, "whatsapp", { label: "Consultar por WhatsApp", variant: "ghost" })}
        </div>
      </div>
    </dialog>
  </section>`;
}

function pricesBlock(ctx) {
  const p = ctx.config.commerce;
  if (!p.showReferencePrices) return "";
  return html`<div class="ref-prices"><p class="panel__label">X39</p>
    <p>Compra única: <strong>${p.referencePrices.x39Retail}</strong> · Suscripción mensual: <strong>${p.referencePrices.x39Subscription}</strong></p></div>`;
}

// --- 8c · Cierre ---------------------------------------------------------------------------
export function closing(ctx, c) {
  const d = ctx.config.distributor;
  const who = [d.name, d.location].filter(Boolean).join(" · ");
  return html`<section class="section closing" id="${c.id}" aria-labelledby="closing-title">
    <div class="closing__bg" aria-hidden="true">${picture(ctx, { ...c.image, alt: "", sizes: "100vw", cls: "bg-img" })}</div>
    <div class="wrap closing__inner">
      ${kicker(c.kicker)}
      ${heading(c.title, { cls: "h-display h-display--closing", id: "closing-title" })}
      <p class="lead">${c.lead}</p>
      <div class="btn-row btn-row--center">
        ${actionButton(ctx, "buy", { label: "Comprar X39" })}
        ${actionButton(ctx, "whatsapp", { label: "WhatsApp", variant: "ghost" })}
        ${actionButton(ctx, "email", { label: "Correo", variant: "ghost" })}
      </div>
      ${who ? html`<p class="closing__who">Te atiende: <strong>${who}</strong>${d.lifewaveId ? ` · ID# ${d.lifewaveId}` : ""}</p>` : ""}
    </div>
  </section>`;
}

// --- Footer ----------------------------------------------------------------------------------
export function siteFooter(ctx, c) {
  const brand = ctx.config.site.brand;
  const d = ctx.config.distributor;
  const email = ctx.config.contact.email;
  const year = new Date().getFullYear();
  return html`<footer class="site-footer">
    <div class="wrap">
      <div class="site-footer__top">
        <a class="wordmark wordmark--lg" href="#inicio"><span class="wordmark__main">${brand}</span></a>
        <p class="site-footer__identity">${[d.name, d.lifewaveId && `ID# ${d.lifewaveId}`].filter(Boolean).map((t) => `${t} · `).join("")}${c.identity}</p>
      </div>
      <nav class="site-footer__links" aria-label="Enlaces">
        <a href="${ctx.config.commerce.officialProductUrl}" target="_blank" rel="noopener">LifeWave X39</a>
        <a href="#uso">Cómo usarlo</a>
        ${email ? html`<a href="${`mailto:${email}`}">${email}</a>` : ""}
      </nav>
      <div class="site-footer__legal">${c.legal.map((l) => html`<p>${l}</p>`)}</div>
      <p class="site-footer__copy">© ${year} ${brand}${d.name ? ` · ${d.name}` : ""}</p>
    </div>
  </footer>`;
}

// --- Diálogos compartidos -------------------------------------------------------------------
export function studiesDialog(ctx, s) {
  return html`<dialog class="dialog dialog--wide" id="dlg-studies" aria-labelledby="dlg-studies-title">
    <div class="dialog__panel">
      <button class="icon-btn dialog__close" type="button" data-dialog-close aria-label="Cerrar">${icon("close")}</button>
      ${kicker(s.kicker)}
      <h2 class="h-sub" id="dlg-studies-title">${s.title}</h2>
      ${s.groups.map((g) => html`<div class="st-group">
        <h3 class="st-group__title">${g.title}</h3>
        <ul class="st-list" role="list">
          ${g.items.map((it) => html`<li class="st-item">
            <a href="${ctx.config.studies[it.study]}" target="_blank" rel="noopener">
              <span class="st-item__title">${it.title}</span>
              <span class="st-item__meta">${it.meta} · PDF</span>
            </a>
          </li>`)}
        </ul>
      </div>`)}
      <div class="st-group">
        <h3 class="st-group__title">Patentes</h3>
        <ul class="st-list" role="list">
          ${s.patents.map((p) => html`<li class="st-item">
            <a href="${ctx.config.documents[p.doc]}" target="_blank" rel="noopener">
              <span class="st-item__title">${p.code}</span><span class="st-item__meta">${p.name} · PDF</span>
            </a>
          </li>`)}
        </ul>
        <p class="fineprint">${s.patentList}</p>
      </div>
      <p class="st-more">${docLink(ctx, { key: s.pubmed.doc, label: s.pubmed.label, cls: "doc-link doc-link--quiet" })}${docLink(ctx, { key: s.more.doc, label: s.more.label, cls: "doc-link doc-link--quiet" })}</p>
    </div>
  </dialog>`;
}

export function videoDialog() {
  return html`<dialog class="dialog dialog--video" id="dlg-video" aria-label="Experiencia en video">
    <div class="dialog__panel dialog__panel--video">
      <button class="icon-btn dialog__close" type="button" data-dialog-close aria-label="Cerrar video">${icon("close")}</button>
      <p class="dialog__video-title" data-video-dialog-title></p>
      <div class="dialog__frame" data-video-dialog-frame></div>
      <p class="player__alt"><a href="#" target="_blank" rel="noopener" data-video-dialog-link>Ábrelo en Vimeo</a></p>
    </div>
  </dialog>`;
}

export function previewNotice(ctx) {
  if (ctx.mode !== "preview") return "";
  return html`<aside class="preview-pill" data-preview-pill>
    <span><strong>Vista previa</strong> · ${ctx.pending.size} destinos pendientes<span class="preview-pill__detail">: ${[...ctx.pending].join(", ")}</span></span>
    <button type="button" class="icon-btn icon-btn--sm" data-preview-dismiss aria-label="Ocultar aviso de vista previa">${icon("close")}</button>
  </aside>`;
}

// --- Guía de ubicaciones (ventana) ------------------------------------------------------------
const BODY = "M88,64 L88,80 C72,84 63,89 61,101 C60,130 65,160 67,190 C64,206 62,222 64,238 L71,330 L73,408 C66,414 70,424 84,424 L92,424 L95,330 L100,248 L105,330 L108,424 L116,424 C130,424 134,414 127,408 L129,330 L136,238 C138,222 136,206 133,190 C135,160 140,130 139,101 C137,89 128,84 112,80 L112,64 Z";
const ARMS = "M62,96 C52,100 48,110 47,124 L42,196 C41,210 40,222 42,232 C43,240 52,240 53,232 L56,200 L63,140 L66,118 Z M138,96 C148,100 152,110 153,124 L158,196 C159,210 160,222 158,232 C157,240 148,240 147,232 L144,200 L137,140 L134,118 Z";

function figure(side, spot, label) {
  const details = side === "front"
    ? '<path d="M84,90 Q92,95 98,92 M116,90 Q108,95 102,92" /><path d="M93,36 q3,2 6,0 M101,36 q3,2 6,0 M95,50 q5,3 10,0" />'
    : '<path d="M100,98 L100,200" /><path d="M78,112 C80,124 84,132 88,138 M122,112 C120,124 116,132 112,138" /><path d="M76,236 Q88,244 100,238 Q112,244 124,236" />';
  const [x, y] = spot;
  return `<figure class="pl-fig">
    <svg viewBox="0 0 200 440" role="img" aria-label="${label}">
      <defs><radialGradient id="pl-g-${side}"><stop offset="0" stop-color="#bfe6ff" stop-opacity=".75"/><stop offset=".45" stop-color="#5eb3e6" stop-opacity=".22"/><stop offset="1" stop-color="#5eb3e6" stop-opacity="0"/></radialGradient></defs>
      <g class="pl-body"><path d="${ARMS}"/><path d="${BODY}"/><ellipse cx="100" cy="40" rx="21" ry="26"/></g>
      <g class="pl-lines">${details}</g>
      <g class="pl-spot" transform="translate(${x} ${y})">
        <circle r="30" fill="url(#pl-g-${side})"/>
        <circle class="pl-pulse" r="13"/>
        <circle r="11" class="pl-ring"/>
        <circle r="5.5" fill="#ffffff"/>
      </g>
    </svg>
  </figure>`;
}

export function placementDialog(ctx, p) {
  return html`<dialog class="dialog dialog--wide" id="dlg-placement" aria-labelledby="dlg-placement-title">
    <div class="dialog__panel">
      <button class="icon-btn dialog__close" type="button" data-dialog-close aria-label="Cerrar">${icon("close")}</button>
      ${kicker(p.kicker)}
      <h2 class="h-sub" id="dlg-placement-title">${p.title}</h2>
      <div class="pl-grid">
        <div class="pl-col">
          ${raw(figure("front", [100, 212], `${p.front.view}: ${p.front.spot}`))}
          <p class="pl-cap"><span>${p.front.view}</span><strong>${p.front.spot}</strong></p>
        </div>
        <div class="pl-col">
          ${raw(figure("back", [100, 72], `${p.back.view}: ${p.back.spot}`))}
          <p class="pl-cap"><span>${p.back.view}</span><strong>${p.back.spot}</strong></p>
        </div>
      </div>
      <ul class="pl-tips" role="list">${p.tips.map((t) => html`<li>${icon("check")}${t}</li>`)}</ul>
    </div>
  </dialog>`;
}
