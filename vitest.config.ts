import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Unit tests only (plain TS/logic, no DOM) -- Playwright stays the tool
// for anything that needs a real browser. Kept separate from next.config.ts
// on purpose: this project has no other Vite consumer, so there's nothing
// to share config with.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
