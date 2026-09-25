// Prueba del enrutado de deploy/worker.js con un entorno simulado
// (sin Cloudflare ni red). Uso: npm run test:worker
import assert from "node:assert/strict";
import worker from "../deploy/worker.js";

globalThis.fetch = async (req) => new Response(`ORIGEN ${new URL(req.url).pathname}`);
const env = { ASSETS: { fetch: async (req) => new Response(`ASSET ${new URL(req.url).pathname}`) } };
const run = async (u) => {
  const r = await worker.fetch(new Request(u), env);
  return { status: r.status, location: r.headers.get("location"), body: r.status === 200 ? await r.text() : null };
};

const cases = [
  ["https://activatuvida.life/X39", { status: 200, body: "ASSET /X39" }],
  ["https://activatuvida.life/X39/assets/app.css", { status: 200, body: "ASSET /X39/assets/app.css" }],
  ["https://activatuvida.life/x39", { status: 301, location: "https://activatuvida.life/X39" }],
  ["https://activatuvida.life/x39/?utm_source=wa", { status: 301, location: "https://activatuvida.life/X39?utm_source=wa" }],
  ["https://activatuvida.life/X39/", { status: 301, location: "https://activatuvida.life/X39" }],
  ["https://activatuvida.life/X39/index.html", { status: 301, location: "https://activatuvida.life/X39" }],
  ["https://activatuvida.life/X39otra", { status: 200, body: "ASSET /X39otra" }],
  ["https://activatuvida.life/", { status: 302, location: "https://activatuvida.life/X39" }],
  ["https://activatuvida.life/?utm=1", { status: 302, location: "https://activatuvida.life/X39?utm=1" }],
  ["https://www.activatuvida.life/X39", { status: 301, location: "https://activatuvida.life/X39" }],
  ["https://preview.workers.dev/", { status: 302, location: "https://preview.workers.dev/X39" }],
];
for (const [url, expected] of cases) {
  const got = await run(url);
  for (const [k, v] of Object.entries(expected)) assert.equal(got[k], v, `${url} → ${k}`);
  console.log(`✓ ${url} → ${got.status}${got.location ? ` ${got.location}` : ""}`);
}

// Con CANVA_ORIGIN: el resto del dominio se reenvía al sitio de Canva.
env.CANVA_ORIGIN = "https://demo.my.canva.site/mi-sitio";
globalThis.fetch = async (req) => {
  const u = new URL(req.url);
  if (u.pathname === "/mi-sitio/viejo") return new Response(null, { status: 301, headers: { location: "https://demo.my.canva.site/mi-sitio/nuevo" } });
  return new Response(`CANVA ${u.host}${u.pathname}${u.search}`);
};
const proxied = [
  ["https://activatuvida.life/", { status: 200, body: "CANVA demo.my.canva.site/mi-sitio/" }],
  ["https://activatuvida.life/_assets/a.js?v=1", { status: 200, body: "CANVA demo.my.canva.site/mi-sitio/_assets/a.js?v=1" }],
  ["https://activatuvida.life/viejo", { status: 301, location: "https://activatuvida.life/nuevo" }],
  ["https://activatuvida.life/X39", { status: 200, body: "ASSET /X39" }],
  ["https://activatuvida.life/x39", { status: 301, location: "https://activatuvida.life/X39" }],
];
for (const [url, expected] of proxied) {
  const got = await run(url);
  for (const [k, v] of Object.entries(expected)) assert.equal(got[k], v, `${url} → ${k}`);
  console.log(`✓ [Canva] ${url} → ${got.status}${got.location ? ` ${got.location}` : ""}`);
}
