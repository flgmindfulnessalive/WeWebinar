import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Unit tests only (plain TS/logic, no DOM) -- Playwright stays the tool
// for anything that needs a real browser. Kept separate from next.config.ts
// on purpose: this project has no other Vite consumer, so there's nothing
// to share config with.
export default defineConfig({
  plugins: [tsconfigPaths()],
  resolve: {
    alias: {
      // Next's webpack build resolves this marker package to empty.js via
      // the "react-server" export condition; outside that bundler its
      // plain `main` unconditionally throws. Vitest has no such condition,
      // so anything that transitively imports a server-only module (e.g.
      // src/lib/ai's AnthropicProvider, guarding the API key from ever
      // reaching a client bundle) would otherwise crash at import time
      // even when the test never calls the guarded code. Same fix Next's
      // own bundler applies, just replicated for Vitest -- aliased to the
      // file's real path on disk (not the "server-only/empty.js" specifier)
      // because the package's own `exports` map only declares ".", so a
      // subpath import is rejected before the alias even gets a say.
      "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
