import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Sitios estáticos independientes (p. ej. sites/activatuvida → /X39):
    // tienen su propio build y validación, fuera de la app Next.js.
    "sites/**",
  ]),
]);

export default eslintConfig;
