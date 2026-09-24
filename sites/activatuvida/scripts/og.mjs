// Genera assets/og-x39.jpg (1200×630) a partir del hero real de la página.
// Uso: npm run build && npm run og && npm run build
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const req = createRequire(import.meta.url);
let pw;
for (const c of ["playwright", "/opt/node22/lib/node_modules/playwright/index.js"]) {
  try { pw = req(c); break; } catch { /* siguiente */ }
}
if (!pw) throw new Error("Playwright no está disponible");

const PORT = 4182;
const server = spawn(process.execPath, [path.join(root, "scripts/serve.mjs")], { env: { ...process.env, PORT: String(PORT) }, stdio: "ignore" });
await new Promise((r) => setTimeout(r, 600));
const browser = await pw.chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, reducedMotion: "reduce" });
  await page.goto(`http://localhost:${PORT}/X39`, { waitUntil: "networkidle" });
  await page.addStyleTag({
    content: `.site-header,.preview-pill,.hero__creds,.btn-row,.hero__lead,.hero__caption{display:none!important}
      .hero{min-height:630px!important;padding:40px 0!important}.hero__inner{grid-template-columns:1.2fr .8fr!important}
      .hero .h-display{font-size:88px!important}`,
  });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(root, "assets", "og-x39.jpg"), type: "jpeg", quality: 84 });
  console.log("✓ assets/og-x39.jpg");
} finally {
  await browser.close();
  server.kill();
}
