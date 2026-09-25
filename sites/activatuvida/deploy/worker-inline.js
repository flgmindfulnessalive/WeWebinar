// Variante de worker.js con los archivos de dist/ incrustados en el script
// (ver scripts/inline-assets.mjs). Sustituye el binding ASSETS por un objeto
// equivalente: mismo enrutado, tipos MIME, reglas de _headers y ETag/304.
import worker from "./worker.js";
import { FILES, HEADER_RULES } from "./.inline/manifest.mjs";

const matches = (pattern, path) =>
  pattern.endsWith("*") ? path.startsWith(pattern.slice(0, -1)) : path === pattern;

export function makeAssets(files = FILES, rules = HEADER_RULES) {
  return {
    async fetch(input) {
      const request = input instanceof Request ? input : new Request(input);
      const { pathname } = new URL(request.url);
      const file = files[pathname];
      if (!file || !["GET", "HEAD"].includes(request.method)) {
        return new Response("Not found", { status: 404, headers: { "Content-Type": "text/plain; charset=utf-8" } });
      }
      const headers = new Headers({ "Content-Type": file.type, ETag: file.etag });
      for (const rule of rules) {
        if (matches(rule.pattern, pathname)) for (const [k, v] of Object.entries(rule.headers)) headers.set(k, v);
      }
      if (request.headers.get("If-None-Match") === file.etag) return new Response(null, { status: 304, headers });
      return new Response(request.method === "HEAD" ? null : file.body, { status: 200, headers });
    },
  };
}

const ASSETS = makeAssets();

export default {
  fetch(request, env, ctx) {
    return worker.fetch(request, { ...env, ASSETS }, ctx);
  },
};
