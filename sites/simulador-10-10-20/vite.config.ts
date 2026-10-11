import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Sitio estático independiente: todo se sirve bajo /plan/ (ver deploy/).
export default defineConfig({
  base: "./",
  plugins: [react()],
  build: { outDir: "dist", assetsDir: "assets", sourcemap: false, target: "es2020" },
  test: { include: ["tests/**/*.test.ts"], environment: "node" },
});
