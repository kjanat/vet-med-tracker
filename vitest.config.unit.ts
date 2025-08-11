import path from "node:path";
import { loadEnvConfig } from "@next/env";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Load environment variables using Next.js env loader
const projectDir = process.cwd();
loadEnvConfig(projectDir);

export default defineConfig({
	plugins: [react()],
	test: {
		name: "unit",
		environment: "jsdom",
		globals: true,
		setupFiles: ["./tests/helpers/setup.ts"],
		// No globalSetup for unit tests - no database needed
		include: [
			"tests/unit/**/*.test.{ts,tsx}",
			"src/**/*.test.{ts,tsx}",
			"components/**/*.test.{ts,tsx}",
			"lib/**/*.test.{ts,tsx}",
			"hooks/**/*.test.{ts,tsx}",
		],
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/.next/**",
			"tests/integration/**",
			"tests/e2e/**",
		],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html", "lcov"],
			exclude: [
				"node_modules/",
				"tests/",
				"**/*.d.ts",
				"**/*.config.*",
				"**/mockData.ts",
				"app/**/*.tsx", // Exclude Next.js pages/routes
				".next/**",
				"scripts/**",
			],
		},
		reporters: process.env.GITHUB_ACTIONS
			? ["dot", "github-actions"]
			: ["default"],
		env: {
			NODE_ENV: "test",
		},
		testTimeout: 10000,
		hookTimeout: 10000,
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./"),
			"@/trpc": path.resolve(__dirname, "./server/trpc/"),
		},
	},
});
