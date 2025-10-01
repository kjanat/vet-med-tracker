#!/usr/bin/env bun
import { loadEnvConfig } from "@next/env";
import { Command } from "commander";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { dbUnpooled } from "@/db/drizzle";
import { applyManualMigrations } from "@/db/ops/manual-migrator";
import type { DatabaseExecutor } from "@/db/ops/utils";

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const program = new Command();

program
  .option(
    "-d, --directory <path>",
    "Path to generated migrations",
    "db/migrations/generated",
  )
  .option("--skip-manual", "Skip manual migrations");

program.parse(process.argv);

const options = program.opts<{ directory: string; skipManual?: boolean }>();

async function main() {
  console.log(`Applying Drizzle migrations from ${options.directory}...`);
  await migrate(dbUnpooled, { migrationsFolder: options.directory });
  console.log("Generated migrations applied successfully.");

  if (options.skipManual) {
    console.log("Skipping manual migrations (flag set).");
    return;
  }

  console.log("Applying manual migrations...");
  await applyManualMigrations(dbUnpooled as unknown as DatabaseExecutor);
  console.log("Manual migrations applied successfully.");
}

main().catch((error) => {
  console.error("Migration script failed:", error);
  process.exitCode = 1;
});
