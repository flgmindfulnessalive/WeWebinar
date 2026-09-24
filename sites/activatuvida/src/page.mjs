// Composición de la página completa /X39.
import { html, raw } from "./lib/html.mjs";
import * as content from "../content/x39.mjs";
import * as S from "./components/sections.mjs";

function analytics(config) {
  const { plausibleDomain, ga4Id } = config.analytics;
  const out = [];
  if (plausibleDomain) {
    out.push(html`<script defer data-domain="${plausibleDomain}" src="https://plausible.io/js/script.js"></script>`);
  }
  if (ga4Id) {
    out.push(html`<script async src="${`https://www.googletagmanager.com/gtag/js?id=${ga4Id}`}"></script>`);
    out.push(raw(`<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config',${JSON.stringify(ga4Id)},{anonymize_ip:true});</script>`));
  }
  return out;
}

function structuredData(ctx, url) {
  // Solo información real: la página y su autoría independiente.
  const data = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: content.meta.ogTitle,
    description: content.meta.description,
    url,
    inLanguage: "es",
    isPartOf: { "@type": "WebSite", name: ctx.config.site.brand, url: ctx.config.site.origin },
    about: { "@type": "Thing", name: "LifeWave X39" },
  };
  if (ctx.config.distributor.name) {
    data.author = { "@type": "Person", name: ctx.config.distributor.name };
  }
  return raw(`<script type="application/ld+json">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>`);
}

export function renderPage(ctx) {
  const { config } = ctx;
  const url = `${config.site.origin}${config.site.path}`;
  const ogImage = `${config.site.origin}${ctx.assets}/og-x39.jpg`;

  // Primero el cuerpo: así los destinos pendientes quedan registrados
  // antes de pintar el aviso de vista previa.
  const body = html`
    <a class="skip-link" href="#contenido">Saltar al contenido</a>
    ${S.siteHeader(ctx, content.nav)}
    <main id="contenido" tabindex="-1">
      ${S.hero(ctx, content.hero)}
      ${S.intro(ctx, content.intro)}
      ${S.category(ctx, content.category)}
      ${S.technology(ctx, content.technology)}
      ${S.benefits(ctx, content.benefits)}
      ${S.testimonials(ctx, content.testimonials)}
      ${S.usage(ctx, content.usage)}
      ${S.company(ctx, content.company)}
      ${S.offer(ctx, content.offer)}
      ${S.closing(ctx, content.closing)}
    </main>
    ${S.siteFooter(ctx, content.footer)}
    ${S.studiesDialog(ctx, content.studies)}
    ${S.videoDialog()}`;
  const notice = S.previewNotice(ctx);

  return `<!doctype html>
${html`<html lang="${config.site.lang}" class="no-js">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${content.meta.title}</title>
<meta name="description" content="${content.meta.description}">
<link rel="canonical" href="${url}">
${ctx.mode === "preview" ? raw('<meta name="robots" content="noindex, nofollow">') : ""}
<meta name="theme-color" content="#05070b">
<meta name="color-scheme" content="dark">
<meta property="og:type" content="website">
<meta property="og:locale" content="${config.site.ogLocale}">
<meta property="og:site_name" content="${config.site.brand}">
<meta property="og:title" content="${content.meta.ogTitle}">
<meta property="og:description" content="${content.meta.ogDescription}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Parche LifeWave X39 iluminado sobre fondo azul noche">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${`${ctx.assets}/favicon.svg`}" type="image/svg+xml">
<link rel="preload" href="${`${ctx.assets}/fonts/sora-var.woff2`}" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${`${ctx.assets}/fonts/inter-var.woff2`}" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="${`${ctx.assets}/fonts/mono-var.woff2`}" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="${ctx.cssHref}">
<script>document.documentElement.classList.replace('no-js','js')</script>
<script src="${ctx.jsHref}" defer></script>
${structuredData(ctx, url)}
${analytics(config)}
</head>
<body>
${body}
${notice}
</body>
</html>`}
`;
}
