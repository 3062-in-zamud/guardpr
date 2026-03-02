import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["test/**/*.test.ts"],
    exclude: ["node_modules", "dist"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.ts"],
      exclude: ["src/types/**", "src/index.ts"],
      reporter: ["text", "json", "html"],
    },
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
