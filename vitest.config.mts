import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { include: ["tests/**/*.test.ts"], testTimeout: 600_000 },
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
});
