// Secciones de la página /X39. Solo presentación: los textos llegan desde
// content/x39.mjs y los destinos desde site.config.mjs.
import { html, raw } from "../lib/html.mjs";
import {
  icon, kicker, heading, sectionHead, tags, picture, patchVisual,
  videoPlayer, actionButton, linkButton, docLink,
} from "./ui.mjs";

const reveal = "data-reveal";

// --- Navegación ---------------------------------------------------------
export function siteHeader(ctx, nav) {
  const brand = ctx.config.site.brand;
  return html`<header class="site-header" data-header>
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
        <p class="menu__note">Sitio de un Brand Partner independiente.</p>
      </nav>
    </div>
  </header>`;
}

// --- Hero ---------------------------------------------------------------
export function hero(ctx, c) {
  return html`<section class="hero" id="inicio" aria-labelledby="hero-title">
    <div class="hero__atmos" aria-hidden="true"><span class="beam"></span><span class="beam beam--2"></span><span class="halo"></span></div>
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
          <div class="hero__patch">${patchVisual({ cls: "patch--hero" })}</div>
        </div>
        <p class="hero__caption">Parche LifeWave X39 · representación ilustrativa</p>
      </div>
    </div>
    <div class="hero__creds wrap">
      <ul class="creds" role="list">
        ${c.credentials.map((cr) => html`<li><strong>${cr.value}</strong><span>${cr.label}</span></li>`)}
      </ul>
      <p class="fineprint">${c.credentialsNote}</p>
    </div>
  </section>`;
}

// --- Introducción: contexto -----------------------------------------------
export function intro(ctx, c, cat) {
  return html`<section class="section intro" id="${c.id}" aria-labelledby="intro-title">
    <div class="wrap intro__grid">
      <div class="intro__media" ${reveal}>
        ${picture(ctx, { ...c.image, sizes: "(min-width: 900px) 42vw, 100vw", cls: "media-img" })}
      </div>
      <div class="intro__copy">
        ${kicker(c.kicker)}
        ${heading(c.title, { id: "intro-title" })}
        ${c.paragraphs.map((p) => html`<p class="body-lg" ${reveal}>${p}</p>`)}
        <ul class="signs" role="list">
          ${c.signs.map((s) => html`<li ${reveal}>${s}</li>`)}
        </ul>
        <p class="intro__question" ${reveal}>${c.question}</p>
      </div>
    </div>
    <div class="wrap category" id="categoria">
      <div class="category__copy">
        ${kicker(cat.kicker)}
        ${heading(cat.title, { cls: "h-statement" })}
        <p class="lead" ${reveal}>${cat.lead}</p>
        <ul class="chips" role="list">${cat.points.map((p) => html`<li>${icon("check")}${p}</li>`)}</ul>
        <p class="tagline" ${reveal}>${cat.tagline}</p>
      </div>
      <div class="category__clip" ${reveal}>
        ${videoPlayer(ctx, { videoKey: cat.clip.video, ratio: "16/9", posterHtml: raw(`<span class="player__art">${patchVisual({ cls: "patch--poster", label: "" })}</span>`) })}
        <p class="caption">${cat.clip.caption}</p>
      </div>
    </div>
  </section>`;
}

// --- Video principal -----------------------------------------------------
export function mainVideo(ctx, c) {
  return html`<section class="section video-section" id="${c.id}" aria-labelledby="video-title">
    <div class="wrap">
      ${sectionHead({ kicker: c.kicker, title: c.title, id: "video-title", align: "center" })}
      <div class="video-section__frame" ${reveal}>
        ${videoPlayer(ctx, { videoKey: c.video, poster: c.poster, cls: "player--main" })}
      </div>
      <p class="caption caption--center">${c.note}</p>
    </div>
  </section>`;
}

// --- Tecnología ------------------------------------------------------------
function lightDiagram() {
  return raw(`<svg class="diagram" viewBox="0 0 520 300" role="img" aria-labelledby="dg-t dg-d">
  <title id="dg-t">Esquema conceptual del funcionamiento del parche</title>
  <desc id="dg-d">La piel emite calor infrarrojo hacia el parche, que refleja longitudes de onda específicas de vuelta hacia puntos de la piel.</desc>
  <defs>
    <linearGradient id="dg-skin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1b2a44"/><stop offset="1" stop-color="#0b1222"/></linearGradient>
    <linearGradient id="dg-up" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#ff9a6b" stop-opacity=".0"/><stop offset="1" stop-color="#ffb38a" stop-opacity=".9"/></linearGradient>
    <linearGradient id="dg-down" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#8fe9ff" stop-opacity=".95"/><stop offset="1" stop-color="#8fe9ff" stop-opacity="0"/></linearGradient>
  </defs>
  <rect x="0" y="210" width="520" height="90" fill="url(#dg-skin)"/>
  <path d="M0 210h520" stroke="#6f86a8" stroke-opacity=".5"/>
  <text x="16" y="286" class="dg-label">Piel</text>
  <g class="dg-waves">
    <path d="M150 205c-8-18 8-30 0-48s8-30 0-48" stroke="url(#dg-up)" stroke-width="2" fill="none"/>
    <path d="M190 205c-8-18 8-30 0-48s8-30 0-48" stroke="url(#dg-up)" stroke-width="2" fill="none"/>
    <text x="96" y="80" class="dg-label">1 · Calor infrarrojo</text>
  </g>
  <g transform="translate(260 150)">
    <ellipse cx="0" cy="0" rx="92" ry="26" fill="#cfe6ff" fill-opacity=".10" stroke="#fff" stroke-opacity=".6"/>
    <ellipse cx="0" cy="-2" rx="46" ry="12" fill="#f3f7fc"/>
    <text x="40" y="-48" text-anchor="start" class="dg-label">2 · El parche capta</text>
  </g>
  <g class="dg-rays">
    <path d="M320 178l40 30" stroke="url(#dg-down)" stroke-width="2"/>
    <path d="M338 170l58 38" stroke="url(#dg-down)" stroke-width="2"/>
    <path d="M300 182l22 26" stroke="url(#dg-down)" stroke-width="2"/>
    <circle cx="362" cy="210" r="4" fill="#8fe9ff"/>
    <circle cx="398" cy="210" r="4" fill="#8fe9ff"/>
    <text x="372" y="236" class="dg-label">3 · Refleja</text>
    <text x="372" y="254" class="dg-label dg-label--muted">longitudes de onda</text>
  </g>
</svg>`);
}

export function technology(ctx, c) {
  return html`<section class="section tech" id="${c.id}" aria-labelledby="tech-title">
    <div class="wrap tech__grid">
      <div class="tech__copy">
        ${kicker(c.kicker)}
        ${heading(c.title, { id: "tech-title" })}
        ${c.paragraphs.map((p) => html`<p class="body-lg" ${reveal}>${p}</p>`)}
      </div>
      <figure class="tech__diagram" ${reveal}>
        ${lightDiagram()}
        <figcaption class="concept-note">${icon("info", "icon icon--sm")}${c.diagramNote}</figcaption>
      </figure>
    </div>
    <div class="wrap">
      <ol class="steps-row" role="list">
        ${c.steps.map((s) => html`<li class="step" ${reveal}><span class="step__n">${s.n}</span><h3 class="h-card">${s.title}</h3><p>${s.text}</p></li>`)}
      </ol>
      <p class="statement" ${reveal}>${c.closing}</p>
    </div>
  </section>`;
}

// --- GHK-Cu ---------------------------------------------------------------
export function ghk(ctx, c) {
  return html`<section class="section ghk" id="${c.id}" aria-labelledby="ghk-title">
    <div class="wrap ghk__top">
      <div>
        ${kicker(c.kicker)}
        ${heading(c.title, { id: "ghk-title" })}
        <p class="lead">${c.lead}</p>
      </div>
      <div class="ghk__media" ${reveal}>${picture(ctx, { ...c.image, sizes: "(min-width: 900px) 34vw, 100vw", cls: "media-img" })}</div>
    </div>
    <div class="wrap ghk__panels">
      <article class="panel" ${reveal}>
        <p class="panel__label">${c.research.label}</p>
        <p class="panel__caveat">${icon("info", "icon icon--sm")}${c.research.caveat}</p>
        ${c.research.paragraphs.map((p) => html`<p>${p}</p>`)}
        <ul class="list-check" role="list">${c.research.findings.map((f) => html`<li>${icon("check")}${f}</li>`)}</ul>
        ${docLink(ctx, { key: c.research.source.doc, label: c.research.source.label })}
      </article>
      <article class="panel panel--accent" ${reveal}>
        <p class="panel__label">${c.patch.label}</p>
        <p class="panel__caveat">${icon("info", "icon icon--sm")}${c.patch.caveat}</p>
        <ul class="measured" role="list">
          ${c.patch.items.map((it) => html`<li><p>${it.text}</p>${docLink(ctx, { key: it.study, group: "studies", label: it.tag })}</li>`)}
        </ul>
      </article>
    </div>
    <div class="wrap"><p class="statement statement--sm" ${reveal}>${c.closing}</p></div>
  </section>`;
}

// --- Beneficios -------------------------------------------------------------
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
        <p class="panel__label">${c.official.label}</p>
        <ul class="list-check list-check--lg" role="list">${c.official.items.map((b) => html`<li>${icon("check")}${b}</li>`)}</ul>
        <p class="benefits__aspiration">${c.aspiration}</p>
      </div>
    </div>
    <p class="sr-only">${c.image.alt}</p>
  </section>`;
}

// --- Evidencia --------------------------------------------------------------
export function evidence(ctx, c) {
  return html`<section class="section evidence" id="${c.id}" aria-labelledby="evidence-title">
    <div class="wrap">
      ${sectionHead({ kicker: c.kicker, title: c.title, lead: c.lead, id: "evidence-title" })}
      <div class="accordion">
        ${c.groups.map((g, gi) => html`<details class="acc" ${gi === 0 ? raw("open") : ""}>
          <summary class="acc__summary"><span class="acc__title">${g.title}</span><span class="acc__count">${g.studies.length} documentos</span><span class="acc__icon" aria-hidden="true"></span></summary>
          <ul class="study-list" role="list">
            ${g.studies.map((s) => html`<li class="study">
              <div><h3 class="h-card">${s.title}</h3><p>${s.summary}</p>${tags(s.tags)}</div>
              ${docLink(ctx, { key: s.study, group: "studies", label: "PDF", cls: "doc-link doc-link--pill" })}
            </li>`)}
          </ul>
        </details>`)}
      </div>
      <div class="patents" ${reveal}>
        <div class="patents__head">
          <h3 class="h-sub">${c.patents.title}</h3>
          <p>${c.patents.lead}</p>
        </div>
        <ul class="patent-list" role="list">
          ${c.patents.items.map((p) => html`<li class="patent">
            <p class="patent__code">${p.code}</p>
            <p class="patent__name" lang="en">${p.name}</p>
            <p>${p.text}</p>
            <div class="patent__links">${docLink(ctx, { key: p.doc, label: "Google Patents" })}${docLink(ctx, { key: p.pdf, label: "PDF" })}</div>
          </li>`)}
        </ul>
        <p class="fineprint">${c.patents.list}</p>
      </div>
      <p class="fineprint evidence__disclaimer">${c.disclaimer}</p>
      <p>${docLink(ctx, { key: c.more.doc, label: c.more.label, cls: "doc-link doc-link--quiet" })}</p>
    </div>
  </section>`;
}

// --- Experiencias -------------------------------------------------------------
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
    <div class="wrap">
      <p class="fineprint">${c.langNote} ${c.disclaimer}</p>
    </div>
  </section>`;
}

// --- Uso ----------------------------------------------------------------------
export function usage(ctx, c) {
  const placementUrl = ctx.config.commerce[c.placement.url];
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
        <details class="warnings">
          <summary>${icon("shield")}<span>${c.warningsTitle}</span><span class="acc__icon" aria-hidden="true"></span></summary>
          <ul role="list">${c.warnings.map((w) => html`<li>${w}</li>`)}</ul>
        </details>
      </div>
      <div class="usage__media" ${reveal}>
        ${picture(ctx, { ...c.image, sizes: "(min-width: 900px) 40vw, 100vw", cls: "media-img" })}
      </div>
    </div>
  </section>`;
}

// --- Expectativas ----------------------------------------------------------------
export function expectations(ctx, c) {
  return html`<section class="section expect" id="${c.id}" aria-labelledby="expect-title">
    <div class="wrap expect__grid">
      <div class="expect__head">
        ${sectionHead({ kicker: c.kicker, title: c.title, lead: c.lead, id: "expect-title" })}
        <p class="note-card">${c.note}</p>
      </div>
      <ol class="timeline" role="list">
        ${c.milestones.map((m) => html`<li class="timeline__item" ${reveal}>
          <p class="timeline__when">${m.when}</p>
          <div class="timeline__body">
            <p>${m.what}</p>
            ${docLink(ctx, { key: m.study, group: "studies", label: m.meta, cls: "doc-link doc-link--quiet" })}
          </div>
        </li>`)}
      </ol>
    </div>
  </section>`;
}

// --- Empresa --------------------------------------------------------------------
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
          ${linkButton({ href: c.patentsLink.href, label: c.patentsLink.label, variant: "ghost", iconName: "arrow" })}
          ${docLink(ctx, { key: c.award.doc, label: c.award.label, cls: "doc-link doc-link--quiet" })}
        </div>
      </div>
    </div>
  </section>`;
}

// --- Opciones y garantía ----------------------------------------------------------
function packagesDetail(ctx, c) {
  const p = ctx.config.commerce;
  const prices = p.showReferencePrices
    ? html`<div class="ref-prices"><p class="panel__label">Precio de referencia · X39</p>
        <p>Compra única: <strong>${p.referencePrices.x39Retail}</strong> · Suscripción mensual: <strong>${p.referencePrices.x39Subscription}</strong></p>
        <p class="fineprint">${p.referencePrices.market}. Consultado el ${p.referencePrices.checkedOn}.</p></div>`
    : "";
  return html`<ul class="modes" role="list">${c.modes.map((m) => html`<li><strong>${m.name}</strong><span>${m.text}</span></li>`)}</ul>
    ${prices}
    <p class="fineprint">${c.pricesNote}</p>`;
}

export function offer(ctx, c) {
  return html`<section class="section offer" id="${c.id}" aria-labelledby="offer-title">
    <div class="wrap">
      ${sectionHead({ kicker: c.kicker, title: c.title, lead: c.lead, id: "offer-title", align: "center" })}
      <ul class="packages" role="list">
        ${c.packages.map((p) => html`<li class="${`package${p.highlight ? " package--highlight" : ""}`}" ${reveal}>
          ${p.highlight ? html`<p class="package__flag">Sistema oficial LifeWave</p>` : ""}
          <p class="package__tier">${p.tier}</p>
          <h3 class="package__name">${p.name}</h3>
          <p class="package__verbs">${p.verbs}</p>
          <p>${p.text}</p>
        </li>`)}
      </ul>
      <div class="offer__actions">
        <button class="btn btn--ghost" type="button" data-dialog-open="dlg-packages">${icon("info")}<span>${c.dialogCta}</span></button>
        ${actionButton(ctx, "buy", { label: "Comprar X39" })}
      </div>
      <div class="guarantee" ${reveal}>
        <div class="guarantee__visual" aria-hidden="true">
          ${patchVisual({ cls: "patch--guarantee", label: "" })}
          <p class="guarantee__badge"><strong>${c.guarantee.badge}</strong><span>garantía</span></p>
        </div>
        <div class="guarantee__copy">
          <h3 class="h-sub">${c.guarantee.title}</h3>
          <p class="body-lg">${c.guarantee.text}</p>
          <details class="warnings warnings--plain">
            <summary><span>Condiciones</span><span class="acc__icon" aria-hidden="true"></span></summary>
            <ul role="list">${c.guarantee.details.map((d) => html`<li>${d}</li>`)}</ul>
            <p class="fineprint">${c.guarantee.source}</p>
          </details>
        </div>
      </div>
    </div>
    <dialog class="dialog" id="dlg-packages" aria-labelledby="dlg-packages-title">
      <div class="dialog__panel">
        <button class="icon-btn dialog__close" type="button" data-dialog-close aria-label="Cerrar">${icon("close")}</button>
        ${kicker("Paquetes y precios")}
        <h2 class="h-sub" id="dlg-packages-title">${c.modesTitle}</h2>
        ${packagesDetail(ctx, c)}
        <div class="btn-row">
          ${actionButton(ctx, "buy", { label: "Ir a la tienda" })}
          ${actionButton(ctx, "whatsapp", { label: "Consultar por WhatsApp", variant: "ghost" })}
        </div>
      </div>
    </dialog>
  </section>`;
}

// --- Cierre -------------------------------------------------------------------------
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

// --- Footer ---------------------------------------------------------------------------
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
        <a href="${ctx.config.commerce.officialProductUrl}" target="_blank" rel="noopener">Ficha oficial LifeWave X39</a>
        <a href="#evidencia">Estudios y patentes</a>
        <a href="#uso">Instrucciones y advertencias</a>
        ${email ? html`<a href="${`mailto:${email}`}">${email}</a>` : ""}
      </nav>
      <div class="site-footer__legal">${c.legal.map((l) => html`<p>${l}</p>`)}</div>
      <p class="site-footer__copy">© ${year} ${brand}${d.name ? ` · ${d.name}` : ""}. Brand Partner independiente de LifeWave.</p>
    </div>
  </footer>`;
}

// --- Diálogos compartidos ---------------------------------------------------------------
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
