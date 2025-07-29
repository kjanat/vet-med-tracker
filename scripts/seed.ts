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
const sql = neon(process.env.DATABASE_URL_UNPOOLED!);
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
					dateOfBirth: new Date("2020-03-15"),
					weight: 32.5,
					weightUnit: "kg",
				},
				{
					id: "animal-2",
					householdId: household1.id,
					name: "Whiskers",
					species: "cat",
					breed: "Siamese",
					dateOfBirth: new Date("2019-07-22"),
					weight: 4.2,
					weightUnit: "kg",
				},
				{
					id: "animal-3",
					householdId: household2.id,
					name: "Charlie",
					species: "dog",
					breed: "Labrador",
					dateOfBirth: new Date("2021-11-08"),
					weight: 28.0,
					weightUnit: "kg",
				},
				{
					id: "animal-4",
					householdId: household1.id,
					name: "Luna",
					species: "cat",
					breed: "Maine Coon",
					dateOfBirth: new Date("2022-01-30"),
					weight: 5.5,
					weightUnit: "kg",
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
					brandNames: ["Rimadyl", "Novox", "Vetprofen"],
					form: "tablet",
					commonDosages: ["25mg", "75mg", "100mg"],
					route: "oral",
					species: ["dog"],
					isControlled: false,
				},
				{
					id: "med-2",
					genericName: "Insulin",
					brandNames: ["Vetsulin", "ProZinc"],
					form: "injection",
					commonDosages: ["10U/mL", "40U/mL"],
					route: "subcutaneous",
					species: ["dog", "cat"],
					isControlled: false,
					requiresRefrigeration: true,
				},
				{
					id: "med-3",
					genericName: "Amoxicillin",
					brandNames: ["Amoxi-Tabs", "Amoxi-Drop"],
					form: "tablet",
					commonDosages: ["250mg", "500mg"],
					route: "oral",
					species: ["dog", "cat"],
					isControlled: false,
				},
				{
					id: "med-4",
					genericName: "Gabapentin",
					brandNames: ["Neurontin"],
					form: "capsule",
					commonDosages: ["100mg", "300mg"],
					route: "oral",
					species: ["dog", "cat"],
					isControlled: false,
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

		await db.insert(regimens).values([
			{
				id: "regimen-1",
				animalId: buddy.id,
				medicationId: medications[0].id, // Carprofen
				name: "Arthritis Management",
				dosageAmount: 75,
				dosageUnit: "mg",
				route: "oral",
				frequency: "BID",
				scheduleType: "FIXED",
				scheduleTimes: ["08:00", "20:00"],
				startDate: now,
				endDate: in10Days,
				instructions: "Give with food",
				createdBy: user1.id,
			},
			{
				id: "regimen-2",
				animalId: whiskers.id,
				medicationId: medications[1].id, // Insulin
				name: "Diabetes Management",
				dosageAmount: 2,
				dosageUnit: "units",
				route: "subcutaneous",
				frequency: "BID",
				scheduleType: "FIXED",
				scheduleTimes: ["07:00", "19:00"],
				startDate: now,
				instructions: "Give 30 minutes before meals. Monitor glucose levels.",
				createdBy: user1.id,
				isHighRisk: true,
			},
			{
				id: "regimen-3",
				animalId: luna.id,
				medicationId: medications[3].id, // Gabapentin
				name: "Pain Management",
				dosageAmount: 100,
				dosageUnit: "mg",
				route: "oral",
				frequency: "PRN",
				scheduleType: "PRN",
				maxDailyDoses: 3,
				minHoursBetweenDoses: 8,
				startDate: now,
				instructions: "Give as needed for pain, max 3 times daily",
				createdBy: user2.id,
			},
		]);

		// Create inventory items
		console.log("Creating inventory items...");
		await db.insert(inventoryItems).values([
			{
				id: "inv-1",
				householdId: household1.id,
				medicationId: medications[0].id, // Carprofen
				name: "Rimadyl 75mg",
				quantity: 60,
				unit: "tablets",
				expirationDate: new Date("2025-06-01"),
				lotNumber: "LOT123456",
				status: "in_use",
				assignedAnimalId: buddy.id,
			},
			{
				id: "inv-2",
				householdId: household1.id,
				medicationId: medications[1].id, // Insulin
				name: "Vetsulin 10U/mL",
				quantity: 1,
				unit: "vial",
				expirationDate: new Date("2025-03-01"),
				lotNumber: "INS789012",
				status: "in_use",
				assignedAnimalId: whiskers.id,
				openedAt: now,
			},
			{
				id: "inv-3",
				householdId: household1.id,
				medicationId: medications[3].id, // Gabapentin
				name: "Gabapentin 100mg",
				quantity: 30,
				unit: "capsules",
				expirationDate: new Date("2026-01-01"),
				status: "available",
			},
		]);

		// Create a few sample administrations
		console.log("Creating sample administrations...");
		const yesterday = new Date(now);
		yesterday.setDate(yesterday.getDate() - 1);

		await db.insert(administrations).values([
			{
				id: "admin-1",
				animalId: buddy.id,
				regimenId: "regimen-1",
				medicationId: medications[0].id,
				scheduledSlotLocalDate: yesterday.toISOString().split("T")[0],
				scheduledSlotIndex: 0,
				scheduledTime: "08:00",
				actualTime: new Date(yesterday.setHours(8, 5, 0, 0)),
				status: "ON_TIME",
				administeredBy: user1.id,
				inventoryItemId: "inv-1",
			},
			{
				id: "admin-2",
				animalId: buddy.id,
				regimenId: "regimen-1",
				medicationId: medications[0].id,
				scheduledSlotLocalDate: yesterday.toISOString().split("T")[0],
				scheduledSlotIndex: 1,
				scheduledTime: "20:00",
				actualTime: new Date(yesterday.setHours(20, 15, 0, 0)),
				status: "LATE",
				administeredBy: user2.id,
				inventoryItemId: "inv-1",
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
