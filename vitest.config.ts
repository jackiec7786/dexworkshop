import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: { "@": root.replace(/\/$/, "") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // session.ts signs/verifies JWTs with this secret during tests.
    env: { AUTH_SECRET: "test-secret-test-secret-test-secret-0123456789" },
  },
});
