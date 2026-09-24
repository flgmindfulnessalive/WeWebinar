// Servidor local de vista previa. Emula el enrutado de producción
// (deploy/worker.js + URLs limpias): /X39 sirve dist/X39.html, las
// variantes redirigen con 301 y cualquier otra ruta responde como el
// sitio existente (aquí, un 404 simulado de «Canva»).
// Uso: npm run preview  →  http://localhost:4173/X39
import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { canonicalRedirect, isSitePath } from "../deploy/worker.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
const port = Number(process.env.PORT || 4173);
const TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".webp": "image/webp", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".png": "image/png",
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const target = canonicalRedirect(url.pathname);
  if (target) {
    res.writeHead(301, { Location: target + url.search });
    return res.end();
  }
  if (url.pathname === "/") {
    res.writeHead(302, { Location: "/X39" });
    return res.end();
  }
  if (!isSitePath(url.pathname)) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    return res.end("Ruta del sitio existente (Canva): no la gestiona /X39.");
  }
  const file = url.pathname === "/X39" ? "X39.html" : decodeURIComponent(url.pathname.slice(1));
  const abs = path.join(root, file);
  if (!abs.startsWith(root)) {
    res.writeHead(403);
    return res.end();
  }
  try {
    const body = await fs.readFile(abs);
    res.writeHead(200, { "Content-Type": TYPES[path.extname(abs)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("No encontrado");
  }
});

server.listen(port, () => console.log(`Vista previa: http://localhost:${port}/X39`));
