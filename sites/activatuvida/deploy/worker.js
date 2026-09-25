// Cloudflare Worker para activatuvida.life (sirve /X39 y conserva el
// sitio actual de Canva en el resto de rutas).
// ------------------------------------------------------------------
// La raíz de activatuvida.life es hoy un sitio de Canva, alojado en la
// infraestructura de Canva (Cloudflare for SaaS). Canva exige que sus
// registros DNS no estén «proxied», así que no se puede poner lógica de
// Cloudflare solo delante de /X39 mientras el dominio apunte a Canva.
//
// Solución: el Worker atiende TODO el dominio y
//   1. normaliza /x39, /x39/, /X39/, /X39/index.html → /X39 (301);
//   2. sirve /X39 y /X39/assets/* desde dist/ (Workers Static Assets);
//   3. reenvía cualquier otra ruta al sitio de Canva publicado en su
//      dominio gratuito (variable CANVA_ORIGIN, p. ej.
//      https://activatuvida.my.canva.site).
// Sin CANVA_ORIGIN (modo actual: el dominio es solo de esta página),
// «/» lleva a /X39 (302, para poder usar la raíz más adelante),
// www.activatuvida.life redirige al dominio sin www y cualquier otra
// ruta devuelve 404. Lo mismo en *.workers.dev (vista previa).

const CANONICAL = "/X39";

export function canonicalRedirect(pathname) {
  if (pathname === CANONICAL) return null;
  const lower = pathname.toLowerCase();
  if (lower === "/x39" || lower === "/x39/" || lower === "/x39/index.html" || lower === "/x39.html") return CANONICAL;
  return null;
}

export function isSitePath(pathname) {
  return pathname === CANONICAL || pathname.startsWith(`${CANONICAL}/assets/`);
}

async function proxyToCanva(request, origin) {
  const incoming = new URL(request.url);
  const base = new URL(origin);
  // Si el sitio de Canva vive bajo una ruta (p. ej. /mi-sitio), se antepone.
  const prefix = base.pathname.replace(/\/$/, "");
  const target = new URL(prefix + incoming.pathname + incoming.search, base.origin);
  const res = await fetch(new Request(target, request), { redirect: "manual" });
  // Reescribir redirecciones hacia el dominio público.
  const location = res.headers.get("location");
  if (location) {
    const loc = new URL(location, target);
    if (loc.host === base.host) {
      const headers = new Headers(res.headers);
      const path = prefix && loc.pathname.startsWith(prefix) ? loc.pathname.slice(prefix.length) || "/" : loc.pathname;
      headers.set("location", `${incoming.origin}${path}${loc.search}`);
      return new Response(res.body, { status: res.status, headers });
    }
  }
  return res;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const canva = env.CANVA_ORIGIN || null;

    if (url.hostname.startsWith("www.")) {
      url.hostname = url.hostname.slice(4);
      return Response.redirect(url.toString(), 301);
    }

    const target = canonicalRedirect(url.pathname);
    if (target) {
      url.pathname = target;
      return Response.redirect(url.toString(), 301);
    }

    if (isSitePath(url.pathname)) {
      const res = await env.ASSETS.fetch(request);
      if (url.pathname === CANONICAL && res.ok) {
        const headers = new Headers(res.headers);
        headers.set("Cache-Control", "public, max-age=300, must-revalidate");
        headers.set("X-Content-Type-Options", "nosniff");
        headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
        return new Response(res.body, { status: res.status, headers });
      }
      return res;
    }

    if (canva) return proxyToCanva(request, canva);

    if (url.pathname === "/") {
      url.pathname = CANONICAL;
      return Response.redirect(url.toString(), 302);
    }
    return env.ASSETS.fetch(request);
  },
};
