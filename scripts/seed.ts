import { neon } from "@neondatabase/serverless";
import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../server/db/schema";
import {
	administrations,
	animals,
	households,
	inventoryItems,
	medicationCatalog,
	memberships,
	regimens,
	users,
} from "../server/db/schema";

// Load environment variables using Next.js env loader
const projectDir = process.cwd();
loadEnvConfig(projectDir);

// Use unpooled connection for seeding
if (!process.env.DATABASE_URL_UNPOOLED) {
	throw new Error("DATABASE_URL_UNPOOLED environment variable is not set");
}
const sql = neon(process.env.DATABASE_URL_UNPOOLED);
const db = drizzle(sql, { schema });

async function seed() {
	console.log("🌱 Starting database seed...");

	try {
		// Clear existing data (be careful in production!)
		if (process.env.NODE_ENV !== "production") {
			console.log("Clearing existing data...");
			await db.delete(administrations);
			await db.delete(regimens);
			await db.delete(inventoryItems);
			await db.delete(medicationCatalog);
			await db.delete(animals);
			await db.delete(memberships);
			await db.delete(households);
			await db.delete(users);
		}

		// Create users
		console.log("Creating users...");
		const [user1, user2, user3] = await db
			.insert(users)
			.values([
				{
					id: "user-1",
					email: "john@example.com",
					name: "John Smith",
					emailVerified: new Date(),
				},
				{
					id: "user-2",
					email: "jane@example.com",
					name: "Jane Doe",
					emailVerified: new Date(),
				},
				{
					id: "user-3",
					email: "vet@example.com",
					name: "Dr. Veterinary",
					emailVerified: new Date(),
				},
			])
			.returning();

		// Create households
		console.log("Creating households...");
		const [household1, household2] = await db
			.insert(households)
			.values([
				{
					id: "household-1",
					name: "Smith Family",
					timezone: "America/New_York",
				},
				{
					id: "household-2",
					name: "Johnson Ranch",
					timezone: "America/Chicago",
				},
			])
			.returning();

		// Create memberships
		console.log("Creating memberships...");
		if (!user1 || !user2 || !user3 || !household1 || !household2) {
			throw new Error("Failed to create users or households");
		}
		await db.insert(memberships).values([
			{
				userId: user1.id,
				householdId: household1.id,
				role: "OWNER",
			},
			{
				userId: user2.id,
				householdId: household1.id,
				role: "CAREGIVER",
			},
			{
				userId: user3.id,
				householdId: household1.id,
				role: "VETREADONLY",
			},
			{
				userId: user2.id,
				householdId: household2.id,
				role: "OWNER",
			},
		]);

		// Create animals
		console.log("Creating animals...");
		const [buddy, whiskers, _charlie, luna] = await db
			.insert(animals)
			.values([
				{
					id: "animal-1",
					householdId: household1.id,
					name: "Buddy",
					species: "dog",
					breed: "Golden Retriever",
					dob: "2020-03-15",
					weightKg: "32.5",
				},
				{
					id: "animal-2",
					householdId: household1.id,
					name: "Whiskers",
					species: "cat",
					breed: "Siamese",
					dob: "2019-07-22",
					weightKg: "4.2",
				},
				{
					id: "animal-3",
					householdId: household2.id,
					name: "Charlie",
					species: "dog",
					breed: "Labrador",
					dob: "2021-11-08",
					weightKg: "28.0",
				},
				{
					id: "animal-4",
					householdId: household1.id,
					name: "Luna",
					species: "cat",
					breed: "Maine Coon",
					dob: "2022-01-30",
					weightKg: "5.5",
				},
			])
			.returning();

		// Create medication catalog entries
		console.log("Creating medication catalog...");
		const medications = await db
			.insert(medicationCatalog)
			.values([
				{
					id: "med-1",
					genericName: "Carprofen",
					brandName: "Rimadyl",
					strength: "75mg",
					form: "TABLET",
					route: "ORAL",
					controlledSubstance: false,
				},
				{
					id: "med-2",
					genericName: "Insulin",
					brandName: "Vetsulin",
					strength: "40U/mL",
					form: "INJECTION",
					route: "SC",
					controlledSubstance: false,
				},
				{
					id: "med-3",
					genericName: "Amoxicillin",
					brandName: "Amoxi-Tabs",
					strength: "250mg",
					form: "TABLET",
					route: "ORAL",
					controlledSubstance: false,
				},
				{
					id: "med-4",
					genericName: "Gabapentin",
					brandName: "Neurontin",
					strength: "100mg",
					form: "CAPSULE",
					route: "ORAL",
					controlledSubstance: false,
				},
			])
			.returning();

		// Create regimens
		console.log("Creating regimens...");
		const now = new Date();
		const tomorrow = new Date(now);
		tomorrow.setDate(tomorrow.getDate() + 1);
		const in10Days = new Date(now);
		in10Days.setDate(in10Days.getDate() + 10);

		if (!buddy || !whiskers || !luna) {
			throw new Error("Failed to create animals");
		}
		if (!medications[0] || !medications[1] || !medications[3]) {
			throw new Error("Failed to create medications");
		}
		const nowDateStr = now.toISOString().split("T")[0];
		const in10DaysStr = in10Days.toISOString().split("T")[0];
		if (!nowDateStr || !in10DaysStr) {
			throw new Error("Failed to format dates");
		}
		await db.insert(regimens).values([
			{
				id: "regimen-1",
				animalId: buddy.id,
				medicationId: medications[0].id, // Carprofen
				name: "Arthritis Management",
				dose: "75mg",
				route: "oral",
				scheduleType: "FIXED",
				timesLocal: ["08:00", "20:00"],
				startDate: nowDateStr,
				endDate: in10DaysStr,
				instructions: "Give with food",
			},
			{
				id: "regimen-2",
				animalId: whiskers.id,
				medicationId: medications[1].id, // Insulin
				name: "Diabetes Management",
				dose: "2 units",
				route: "subcutaneous",
				scheduleType: "FIXED",
				timesLocal: ["07:00", "19:00"],
				startDate: nowDateStr,
				instructions: "Give 30 minutes before meals. Monitor glucose levels.",
				highRisk: true,
			},
			{
				id: "regimen-3",
				animalId: luna.id,
				medicationId: medications[3].id, // Gabapentin
				name: "Pain Management",
				dose: "100mg",
				route: "oral",
				scheduleType: "PRN",
				maxDailyDoses: 3,
				startDate: nowDateStr,
				instructions: "Give as needed for pain, max 3 times daily",
				prnReason: "for pain",
			},
		]);

		// Create inventory items
		console.log("Creating inventory items...");
		const openedOnStr = now.toISOString().split("T")[0];
		if (!openedOnStr) {
			throw new Error("Failed to format opened date");
		}
		await db.insert(inventoryItems).values([
			{
				id: "inv-1",
				householdId: household1.id,
				medicationId: medications[0].id, // Carprofen
				brandOverride: "Rimadyl 75mg",
				quantityUnits: 60,
				unitsRemaining: 60,
				unitType: "tablets",
				expiresOn: "2025-06-01",
				lot: "LOT123456",
				inUse: true,
				assignedAnimalId: buddy.id,
			},
			{
				id: "inv-2",
				householdId: household1.id,
				medicationId: medications[1].id, // Insulin
				brandOverride: "Vetsulin 10U/mL",
				concentration: "10U/mL",
				quantityUnits: 1,
				unitsRemaining: 1,
				unitType: "vial",
				expiresOn: "2025-03-01",
				lot: "INS789012",
				inUse: true,
				assignedAnimalId: whiskers.id,
				openedOn: openedOnStr,
				storage: "FRIDGE",
			},
			{
				id: "inv-3",
				householdId: household1.id,
				medicationId: medications[3].id, // Gabapentin
				brandOverride: "Gabapentin 100mg",
				quantityUnits: 30,
				unitsRemaining: 30,
				unitType: "capsules",
				expiresOn: "2026-01-01",
				inUse: false,
			},
		]);

		// Create a few sample administrations
		console.log("Creating sample administrations...");
		const yesterday = new Date(now);
		yesterday.setDate(yesterday.getDate() - 1);

		// Create timestamps for yesterday's administrations
		const yesterday8am = new Date(yesterday);
		yesterday8am.setHours(8, 0, 0, 0);

		const yesterday805am = new Date(yesterday);
		yesterday805am.setHours(8, 5, 0, 0);

		const yesterday8pm = new Date(yesterday);
		yesterday8pm.setHours(20, 0, 0, 0);

		const yesterday815pm = new Date(yesterday);
		yesterday815pm.setHours(20, 15, 0, 0);

		await db.insert(administrations).values([
			{
				id: "admin-1",
				animalId: buddy.id,
				householdId: household1.id,
				regimenId: "regimen-1",
				caregiverId: user1.id,
				scheduledFor: yesterday8am,
				recordedAt: yesterday805am,
				status: "ON_TIME",
				sourceItemId: "inv-1",
				idempotencyKey: "admin-key-1",
			},
			{
				id: "admin-2",
				animalId: buddy.id,
				householdId: household1.id,
				regimenId: "regimen-1",
				caregiverId: user2.id,
				scheduledFor: yesterday8pm,
				recordedAt: yesterday815pm,
				status: "LATE",
				sourceItemId: "inv-1",
				idempotencyKey: "admin-key-2",
			},
		]);

		console.log("✅ Database seeded successfully!");
	} catch (error) {
		console.error("❌ Error seeding database:", error);
		throw error;
	}
}

// Run the seed function
seed()
	.then(() => {
		console.log("Seed completed");
		process.exit(0);
	})
	.catch((error) => {
		console.error("Seed failed:", error);
		process.exit(1);
	});
