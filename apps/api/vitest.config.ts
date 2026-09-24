import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "src/**/*.test.ts"],
    passWithNoTests: true,
    setupFiles: ["tests/setup-env.ts"],
    hookTimeout: 30000,
    testTimeout: 30000,
    fileParallelism: false,
    env: {
      NODE_ENV: "test",
    },
  },
});
