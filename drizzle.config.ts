import "./envConfig.ts";
import {defineConfig} from "drizzle-kit";

export default defineConfig({
    out: "./drizzle",
    schema: "./db/schema.ts",
    dialect: "postgresql",
    dbCredentials: {
        // Use unpooled connection for migrations and schema operations
        url: (() => {
            const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
            if (!url) {
                throw new Error('DATABASE_URL environment variable is required');
            }
            return url;
        })(),
    },
    tablesFilter: ["vetmed_*"], // Prefix all tables with vetmed_
    verbose: true,
    strict: true,
});
