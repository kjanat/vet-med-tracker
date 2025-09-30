import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

// Load environment variables
loadEnvConfig(process.cwd());

export default defineConfig({
  schema: "./db/schema",
  out: "./db/migrations/generated",
  dialect: "postgresql",
  dbCredentials: {
    // Use unpooled connection for migrations and schema operations
    url:
      process.env["DATABASE_URL_UNPOOLED"] || process.env["DATABASE_URL"] || "",
  },
  // tablesFilter: ["vetmed_*"], // Prefix all tables with vetmed_
  verbose: true,
  strict: true,
  // Optional: Neon project specific tables to include/exclude
  // includeTables: ['users', 'posts'],
  // excludeTables: ['_migrations'],
});
