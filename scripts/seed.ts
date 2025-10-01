#!/usr/bin/env bun
import { loadEnvConfig } from "@next/env";
import { Command } from "commander";
import { dbUnpooled } from "@/db/drizzle";
import { seedMedicationCatalog } from "@/db/ops/seed-medications";

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const program = new Command();

program.option("--silent", "Hide step-by-step logging");

program.parse(process.argv);

const options = program.opts<{ silent?: boolean }>();

async function main() {
  const logger = options.silent
    ? null
    : (message: string) => console.log(message);

  const result = await seedMedicationCatalog(dbUnpooled, { logger });

  if (options.silent) {
    console.log(
      `Seed summary: inserted=${result.inserted}, skipped=${result.skipped}, totalBefore=${result.totalBefore}, totalAfter=${result.totalAfter}`,
    );
  }
}

main().catch((error) => {
  console.error("Seed script failed:", error);
  process.exitCode = 1;
});
