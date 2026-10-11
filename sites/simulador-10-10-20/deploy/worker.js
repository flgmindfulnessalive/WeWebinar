// Worker del simulador: sirve la app (una sola página) desde los archivos
// incrustados. Rutas de la app con # (hash), así que todo lo demás → 404.
import { FILES } from "./.inline/manifest.mjs";

const SECURITY = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Robots-Tag": "noindex, nofollow",
  "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'",
};

export default {
  async fetch(request) {
    const url = new URL(request.url);
    if (!["GET", "HEAD"].includes(request.method)) return new Response("Método no permitido", { status: 405 });
    const path = url.pathname === "/" ? "/index.html" : url.pathname;
    const f = FILES[path];
    if (!f) return new Response("No encontrado", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8", ...SECURITY } });
    const headers = new Headers({ "Content-Type": f.type, ETag: f.etag, ...SECURITY,
      "Cache-Control": path.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "public, max-age=60, must-revalidate" });
    if (request.headers.get("If-None-Match") === f.etag) return new Response(null, { status: 304, headers });
    return new Response(request.method === "HEAD" ? null : f.body, { headers });
  },
};
