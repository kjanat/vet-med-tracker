import "./envConfig.ts";
import {defineConfig} from "drizzle-kit";

export default defineConfig({
    out: "./drizzle",
    schema: "./db/schema.ts",
    dialect: "postgresql",
    dbCredentials: {
        // Use unpooled connection for migrations and schema operations
        url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL!,
    },
    tablesFilter: ["vetmed_*"], // Prefix all tables with vetmed_
    verbose: true,
    strict: true,
});
