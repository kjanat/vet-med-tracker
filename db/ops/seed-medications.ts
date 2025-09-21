import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import type { NewMedicationCatalog } from "@/db/schema";
import { medicationCatalog } from "@/db/schema";
import { commonVeterinaryMedications } from "@/db/seed-data/medications";

export interface SeedMedicationCatalogOptions {
  logger?: ((message: string) => void) | null;
}

export interface SeedMedicationCatalogResult {
  inserted: number;
  skipped: number;
  totalBefore: number;
  totalAfter: number;
}

type DrizzleDatabase = typeof import("@/db/drizzle").db;

function log(message: string, options?: SeedMedicationCatalogOptions) {
  if (options?.logger) {
    options.logger(message);
    return;
  }

  if (options?.logger === null) {
    return;
  }

  console.log(message);
}

export async function seedMedicationCatalog(
  db: DrizzleDatabase,
  options?: SeedMedicationCatalogOptions,
): Promise<SeedMedicationCatalogResult> {
  log("🌱 Starting medication catalog seeding...", options);

  const countResult = await db.execute(
    sql`SELECT COUNT(*)::int AS count FROM ${medicationCatalog}`,
  );
  const totalBefore = Number(
    (countResult as { rows?: Array<{ count?: number }> }).rows?.[0]?.count ?? 0,
  );

  if (totalBefore > 0) {
    log(`📋 Found ${totalBefore} existing medications in catalog`, options);
    log("🔄 Checking for new medications to add...", options);
  }

  let inserted = 0;
  let skipped = 0;

  for (const medication of commonVeterinaryMedications) {
    const existing = await db
      .select()
      .from(medicationCatalog)
      .where(eq(medicationCatalog.genericName, medication.genericName))
      .limit(1);

    const exactMatch = existing.find(
      (med) =>
        med.genericName === medication.genericName &&
        med.strength === medication.strength &&
        med.route === medication.route &&
        med.form === medication.form &&
        med.brandName === medication.brandName,
    );

    if (exactMatch) {
      skipped += 1;
      continue;
    }

    const payload: NewMedicationCatalog = {
      controlledSubstance: medication.controlledSubstance ?? false,
      createdAt: new Date(),
      id: randomUUID(),
      unitType: medication.unitType ?? "mg",
      updatedAt: new Date(),
      ...medication,
    };

    await db.insert(medicationCatalog).values(payload);
    inserted += 1;
    log(
      `✅ Added: ${medication.genericName}${medication.brandName ? ` (${medication.brandName})` : ""} ${medication.strength} ${medication.form}`,
      options,
    );
  }

  const totalAfter = totalBefore + inserted;

  log("\n📊 Seeding Summary:", options);
  log(`✨ Successfully inserted: ${inserted} medications`, options);
  log(`⏭️  Skipped (duplicates): ${skipped} medications`, options);
  log(`📦 Total medications in catalog: ${totalAfter}`, options);

  if (inserted > 0) {
    log("\n🎉 Medication catalog seeding completed successfully!", options);
    log(
      "💡 You can now search for medications when creating regimens!",
      options,
    );
  } else {
    log("\n✅ Medication catalog is already up to date!", options);
  }

  return {
    inserted,
    skipped,
    totalAfter,
    totalBefore,
  };
}
