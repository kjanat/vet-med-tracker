import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [react()],
	test: {
		environment: "jsdom",
		globals: true,
		setupFiles: "./tests/helpers/setup.ts",
		include: ["**/*.test.{ts,tsx}"],
		exclude: [
			"**/node_modules/**",
			"**/dist/**",
			"**/tests/e2e/**", // E2E tests handled by Playwright
		],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules/",
				"tests/",
				"**/*.d.ts",
				"**/*.config.*",
				"**/mockData.ts",
				"app/**/*.tsx", // Exclude Next.js pages/routes
			],
		},
		env: {
			DATABASE_URL_POOLED: "postgresql://test:test@localhost:5432/vetmed_test",
			DATABASE_URL_UNPOOLED:
				"postgresql://test:test@localhost:5432/vetmed_test",
			DATABASE_URL: "postgresql://test:test@localhost:5432/vetmed_test",
			AUTH_SECRET: "test-secret-key-for-testing",
			AUTH_REDIRECT_PROXY_URL: "http://localhost:3000/api/auth",
			OPENAUTH_CLIENT_ID: "test-client-id",
			OPENAUTH_CLIENT_SECRET: "test-client-secret",
			OPENAUTH_ISSUER: "https://auth.example.com",
		},
	},
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "./"),
		},
	},
});
