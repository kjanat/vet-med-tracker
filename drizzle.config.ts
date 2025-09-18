import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load environment variables
config({ path: ".env.local" });

export default defineConfig({
  schema: "./db/schema.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    // Use unpooled connection for migrations and schema operations
    url: (() => {
      const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
      if (!url) {
        throw new Error("DATABASE_URL environment variable is required");
      }
      return url;
    })(),
  },
  tablesFilter: ["vetmed_*"], // Prefix all tables with vetmed_
  verbose: true,
  strict: true,
  // Optional: Neon project specific tables to include/exclude
  // includeTables: ['users', 'posts'],
  // excludeTables: ['_migrations'],
});
