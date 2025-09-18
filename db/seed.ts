#!/usr/bin/env tsx

import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { medicationCatalog } from "./schema";
import { commonVeterinaryMedications } from "./seed-data/medications";

// Database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const sql = postgres(connectionString);
const db = drizzle(sql);

async function seedMedications() {
  console.log("🌱 Starting medication catalog seeding...");

  try {
    // Check if medications already exist
    const existingCount = await db
      .select({ count: medicationCatalog.id })
      .from(medicationCatalog);

    if (existingCount.length > 0) {
      console.log(
        `📋 Found ${existingCount.length} existing medications in catalog`,
      );
      console.log("🔄 Checking for new medications to add...");
    }

    let insertedCount = 0;
    let skippedCount = 0;

    // Insert medications one by one, checking for duplicates
    for (const medication of commonVeterinaryMedications) {
      try {
        // Check if this exact medication already exists
        const existing = await db
          .select()
          .from(medicationCatalog)
          .where(eq(medicationCatalog.genericName, medication.genericName))
          .limit(1);

        // Check for exact match (generic name + strength + route + form)
        const exactMatch = existing.find(
          (med) =>
            med.genericName === medication.genericName &&
            med.strength === medication.strength &&
            med.route === medication.route &&
            med.form === medication.form &&
            med.brandName === medication.brandName,
        );

        if (exactMatch) {
          skippedCount++;
          continue;
        }

        // Insert the medication
        await db.insert(medicationCatalog).values(medication);
        insertedCount++;

        console.log(
          `✅ Added: ${medication.genericName}${medication.brandName ? ` (${medication.brandName})` : ""} ${medication.strength} ${medication.form}`,
        );
      } catch (error) {
        console.error(`❌ Failed to insert ${medication.genericName}:`, error);
      }
    }

    console.log("\n📊 Seeding Summary:");
    console.log(`✨ Successfully inserted: ${insertedCount} medications`);
    console.log(`⏭️  Skipped (duplicates): ${skippedCount} medications`);
    console.log(
      `📦 Total medications in catalog: ${insertedCount + existingCount.length}`,
    );

    if (insertedCount > 0) {
      console.log("\n🎉 Medication catalog seeding completed successfully!");
      console.log(
        "💡 You can now search for medications when creating regimens!",
      );
    } else {
      console.log("\n✅ Medication catalog is already up to date!");
    }
  } catch (error) {
    console.error("💥 Error during medication seeding:", error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

// Run the seeding
if (require.main === module) {
  seedMedications()
    .then(() => {
      console.log("🏁 Seeding process completed");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Fatal error:", error);
      process.exit(1);
    });
}

export { seedMedications };
