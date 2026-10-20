import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src") } },
  test: { env: { ENFORCE_STOCK_LIMITS: "true" }, environment: "node", include: ["src/**/*.test.ts"], testTimeout: 60000, hookTimeout: 120000 },
});
