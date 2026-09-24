// Secciones de la página /X39 (versión simplificada: 8 bloques).
// Solo presentación: textos en content/x39.mjs, destinos en site.config.mjs.
import { html, raw } from "../lib/html.mjs";
import {
  icon, kicker, heading, sectionHead, picture, patchVisual,
  videoPlayer, actionButton, linkButton, docLink,
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
        ${kicker(c.eyebrow)}
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
      <div class="intro__media" ${reveal}>
        ${picture(ctx, { ...c.image, sizes: "(min-width: 900px) 42vw, 100vw", cls: "media-img" })}
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
  const placementUrl = ctx.config.commerce[c.placement.url];
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
          ${linkButton({ href: placementUrl, label: c.placement.label, variant: "ghost", iconName: "external", external: true, track: "placement_official" })}
        </div>
      </div>
      <div class="usage__media" ${reveal}>
        ${picture(ctx, { ...c.image, sizes: "(min-width: 900px) 40vw, 100vw", cls: "media-img" })}
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
  </section>`;
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
      ${who ? html`<p class="closing__who">Te atiende: <strong>${who}</strong>${d.lifewaveId ? ` · Brand Partner ${d.lifewaveId}` : ""}</p>` : ""}
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
        <p class="site-footer__identity">${c.identity}</p>
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
      <p>${docLink(ctx, { key: s.more.doc, label: s.more.label, cls: "doc-link doc-link--quiet" })}</p>
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
