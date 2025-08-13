import path from "node:path";
import { loadEnvConfig } from "@next/env";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Load environment variables using Next.js env loader
// NODE_ENV should already be set by vitest, but ensure we load test env
const projectDir = process.cwd();
loadEnvConfig(projectDir);

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/helpers/setup.ts"],
    globalSetup: ["./tests/setup/database.ts"],
    include: ["tests/**/*.test.{ts,tsx}", "**/*.test.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/tests/e2e/**", // E2E tests handled by Playwright
      "**/.next/**",
    ],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "tests/e2e/",
        "**/*.d.ts",
        "**/*.config.*",
        "**/mockData.ts",
        "app/**/*.tsx", // Exclude Next.js pages/routes
      ],
    },
    reporters: process.env.GITHUB_ACTIONS
      ? ["dot", "github-actions"]
      : ["default"],
    // Set NODE_ENV to test for environment variable loading
    env: {
      NODE_ENV: "test",
      // Test database configuration
      TEST_DB_HOST: "localhost",
      TEST_DB_PORT: "5432",
      TEST_DB_USER: "postgres",
      TEST_DB_PASSWORD: "postgres",
      TEST_DB_NAME: "vet_med_test",
    },
    // Environment variables are already loaded from .env.development via @next/env above
    // No need to duplicate them here - just use process.env directly
    // Increase timeout for database operations
    testTimeout: 30000,
    hookTimeout: 30000,
    // Allow each test suite to reset database state
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true, // Use single fork for database consistency
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
      "@/trpc": "@/server/trpc/",
    },
  },
});
