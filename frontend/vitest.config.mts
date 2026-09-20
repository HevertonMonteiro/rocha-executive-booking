import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname),
      "server-only": path.resolve(import.meta.dirname, "node_modules/server-only/empty.js"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    env: {
      // Padrao: Postgres em memoria (PGlite). Com TEST_DATABASE_URL a suite roda no driver real `postgres`.
      DATABASE_URL: process.env.TEST_DATABASE_URL ?? "pglite:memory",
      JWT_SECRET: "segredo-de-teste-com-mais-de-trinta-e-dois-caracteres",
      SITE_URL: "http://localhost:3000",
      NODE_ENV: "test",
      SUMUP_API_KEY: "chave-de-teste",
    },
  },
});
