import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Load environment variables using Next.js env loader
// This respects NODE_ENV and loads the appropriate .env files
const projectDir = process.cwd();
loadEnvConfig(projectDir);

// Use unpooled connection for migrations
const databaseUrl =
	process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!databaseUrl) {
	const env = process.env.NODE_ENV || "production";
	throw new Error(
		`DATABASE_URL_UNPOOLED is not set. Check your .env.${env} file.\n` +
			`Current NODE_ENV: ${env}\n` +
			`To use development database, run: NODE_ENV=development pnpm db:push`,
	);
}

export default defineConfig({
	schema: "./server/db/schema/*.ts",
	out: "./drizzle",
	dialect: "postgresql",
	dbCredentials: {
		url: databaseUrl,
	},
	tablesFilter: ["vetmed_*"], // Prefix all tables with vetmed_
	verbose: true,
	strict: true,
});
