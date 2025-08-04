#!/usr/bin/env tsx

import { neon } from "@neondatabase/serverless";
import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";
import { commonVeterinaryMedications } from "@/db/seed-data/medications";

// Load environment variables using Next.js env loader
const projectDir = process.cwd();
loadEnvConfig(projectDir);

// Use unpooled connection for seeding
if (!process.env.DATABASE_URL_UNPOOLED) {
	throw new Error("DATABASE_URL_UNPOOLED environment variable is not set");
}
const sql = neon(process.env.DATABASE_URL_UNPOOLED);
const db = drizzle(sql, { schema });

async function seedMedicationsOnly() {
	console.log("🌱 Starting medication catalog seeding...");

	try {
		// Check if medications already exist
		const existingCount = await db.select().from(schema.medicationCatalog);

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
					.from(schema.medicationCatalog)
					.where(
						eq(schema.medicationCatalog.genericName, medication.genericName),
					)
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
				await db.insert(schema.medicationCatalog).values(medication);
				insertedCount++;

				console.log(
					`✅ Added: ${medication.genericName}${
						medication.brandName ? ` (${medication.brandName})` : ""
					} ${medication.strength} ${medication.form}`,
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
		throw error;
	}
}

// Run the seeding
if (require.main === module) {
	seedMedicationsOnly()
		.then(() => {
			console.log("🏁 Medication seeding process completed");
			process.exit(0);
		})
		.catch((error) => {
			console.error("💥 Fatal error:", error);
			process.exit(1);
		});
}

export { seedMedicationsOnly };
