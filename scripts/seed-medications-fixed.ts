#!/usr/bin/env tsx

import { neon } from "@neondatabase/serverless";
import { loadEnvConfig } from "@next/env";
import { and, eq } from "drizzle-orm";
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

/**
 * Build database conditions for medication matching
 */
function buildMedicationConditions(
	medication: (typeof commonVeterinaryMedications)[0],
) {
	const conditions = [
		eq(schema.medicationCatalog.genericName, medication.genericName),
		eq(schema.medicationCatalog.route, medication.route),
		eq(schema.medicationCatalog.form, medication.form),
	];

	if (medication.strength) {
		conditions.push(eq(schema.medicationCatalog.strength, medication.strength));
	}

	if (medication.brandName) {
		conditions.push(
			eq(schema.medicationCatalog.brandName, medication.brandName),
		);
	}

	return conditions;
}

/**
 * Check if a medication already exists in the database
 */
async function medicationExists(
	medication: (typeof commonVeterinaryMedications)[0],
): Promise<boolean> {
	const conditions = buildMedicationConditions(medication);
	const existing = await db
		.select()
		.from(schema.medicationCatalog)
		.where(and(...conditions))
		.limit(1);

	return existing.length > 0;
}

/**
 * Format medication name for logging
 */
function formatMedicationName(
	medication: (typeof commonVeterinaryMedications)[0],
): string {
	const brandPart = medication.brandName ? ` (${medication.brandName})` : "";
	return `${medication.genericName}${brandPart} ${medication.strength} ${medication.form}`;
}

/**
 * Insert a single medication if it doesn't exist
 */
async function insertMedicationIfNew(
	medication: (typeof commonVeterinaryMedications)[0],
): Promise<"inserted" | "skipped" | "error"> {
	try {
		const exists = await medicationExists(medication);

		if (exists) {
			console.log(
				`⏭️  Skipped: ${formatMedicationName(medication)} - already exists`,
			);
			return "skipped";
		}

		await db.insert(schema.medicationCatalog).values(medication);
		console.log(`✅ Added: ${formatMedicationName(medication)}`);
		return "inserted";
	} catch (error) {
		console.error(`❌ Failed to insert ${medication.genericName}:`, error);
		return "error";
	}
}

/**
 * Process all medications and return counts
 */
async function processMedications(): Promise<{
	insertedCount: number;
	skippedCount: number;
}> {
	let insertedCount = 0;
	let skippedCount = 0;

	for (const medication of commonVeterinaryMedications) {
		const result = await insertMedicationIfNew(medication);

		if (result === "inserted") {
			insertedCount++;
		} else if (result === "skipped") {
			skippedCount++;
		}
	}

	return { insertedCount, skippedCount };
}

/**
 * Print seeding summary
 */
function printSeedingSummary(
	insertedCount: number,
	skippedCount: number,
	existingCount: number,
): void {
	console.log("\n📊 Seeding Summary:");
	console.log(`✨ Successfully inserted: ${insertedCount} medications`);
	console.log(`⏭️  Skipped (duplicates): ${skippedCount} medications`);
	console.log(
		`📦 Total medications in catalog: ${insertedCount + existingCount}`,
	);

	if (insertedCount > 0) {
		console.log("\n🎉 Medication catalog seeding completed successfully!");
		console.log(
			"💡 You can now search for medications when creating regimens!",
		);
	} else {
		console.log("\n✅ Medication catalog is already up to date!");
	}
}

async function seedMedicationsOnly() {
	console.log("🌱 Starting medication catalog seeding...");

	try {
		// Check if medications already exist
		const existingMedications = await db
			.select()
			.from(schema.medicationCatalog);
		const existingCount = existingMedications.length;

		if (existingCount > 0) {
			console.log(`📋 Found ${existingCount} existing medications in catalog`);
			console.log("🔄 Checking for new medications to add...");
		}

		// Process all medications
		const { insertedCount, skippedCount } = await processMedications();

		// Print summary
		printSeedingSummary(insertedCount, skippedCount, existingCount);
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
