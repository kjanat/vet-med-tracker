#!/usr/bin/env tsx

/**
 * Seed stable test data for visual regression tests
 * This script creates consistent data for reliable visual testing
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
	vetmedUsers,
	vetmedHouseholds,
	vetmedAnimals,
	vetmedMedicationCatalog,
	vetmedInventoryItems,
	vetmedRegimens,
	vetmedAdministrations,
} from "../db/schema";
import { hashSync } from "bcrypt";

// Use test database
const connectionString =
	process.env.DATABASE_URL || process.env.TEST_DATABASE_URL;

if (!connectionString) {
	console.error("❌ DATABASE_URL or TEST_DATABASE_URL is required");
	process.exit(1);
}

const sql = postgres(connectionString, {
	max: 1,
	onnotice: () => {}, // Suppress notices
});

const db = drizzle(sql);

async function seedVisualTestData() {
	console.log("🌱 Seeding visual test data...");

	try {
		// Clear existing test data
		console.log("🧹 Clearing existing test data...");
		await db.delete(vetmedAdministrations);
		await db.delete(vetmedRegimens);
		await db.delete(vetmedInventoryItems);
		await db.delete(vetmedAnimals);
		await db.delete(vetmedHouseholds);
		await db.delete(vetmedUsers);

		// Create test user
		console.log("👤 Creating test users...");
		const testUsers = await db
			.insert(vetmedUsers)
			.values([
				{
					id: "test-user-123",
					stackUserId: "stack-test-user-123",
					email: "test@example.com",
					displayName: "Test User",
					firstName: "Test",
					lastName: "User",
					profileImageUrl: null,
					timeZone: "America/New_York",
					createdAt: new Date("2024-01-01T00:00:00Z"),
					updatedAt: new Date("2024-01-01T00:00:00Z"),
				},
				{
					id: "test-user-456",
					stackUserId: "stack-test-user-456",
					email: "caregiver@example.com",
					displayName: "Care Giver",
					firstName: "Care",
					lastName: "Giver",
					profileImageUrl: null,
					timeZone: "America/New_York",
					createdAt: new Date("2024-01-02T00:00:00Z"),
					updatedAt: new Date("2024-01-02T00:00:00Z"),
				},
			])
			.returning();

		// Create test households
		console.log("🏠 Creating test households...");
		const testHouseholds = await db
			.insert(vetmedHouseholds)
			.values([
				{
					id: "test-household-123",
					name: "Test Family Household",
					description: "A test family with multiple pets",
					ownerUserId: testUsers[0].id,
					timeZone: "America/New_York",
					createdAt: new Date("2024-01-01T08:00:00Z"),
					updatedAt: new Date("2024-01-01T08:00:00Z"),
				},
				{
					id: "test-household-empty",
					name: "Empty Household",
					description: "A household with no animals for empty state testing",
					ownerUserId: testUsers[1].id,
					timeZone: "America/New_York",
					createdAt: new Date("2024-01-03T08:00:00Z"),
					updatedAt: new Date("2024-01-03T08:00:00Z"),
				},
			])
			.returning();

		// Create test animals with variety for visual testing
		console.log("🐕 Creating test animals...");
		const testAnimals = await db
			.insert(vetmedAnimals)
			.values([
				{
					id: "test-animal-buddy",
					householdId: testHouseholds[0].id,
					name: "Buddy",
					species: "DOG",
					breed: "Golden Retriever",
					color: "Golden",
					weight: 65.0,
					birthDate: new Date("2020-03-15"),
					microchipId: "123456789012345",
					profileImageUrl: "/test-images/buddy-golden-retriever.jpg",
					timeZone: "America/New_York",
					createdAt: new Date("2024-01-01T09:00:00Z"),
					updatedAt: new Date("2024-01-01T09:00:00Z"),
				},
				{
					id: "test-animal-whiskers",
					householdId: testHouseholds[0].id,
					name: "Whiskers",
					species: "CAT",
					breed: "Maine Coon",
					color: "Orange Tabby",
					weight: 12.5,
					birthDate: new Date("2019-08-22"),
					microchipId: "987654321098765",
					profileImageUrl: "/test-images/whiskers-maine-coon.jpg",
					timeZone: "America/New_York",
					createdAt: new Date("2024-01-01T09:30:00Z"),
					updatedAt: new Date("2024-01-01T09:30:00Z"),
				},
				{
					id: "test-animal-charlie",
					householdId: testHouseholds[0].id,
					name: "Charlie",
					species: "DOG",
					breed: "Border Collie",
					color: "Black and White",
					weight: 45.0,
					birthDate: new Date("2021-11-10"),
					microchipId: null,
					profileImageUrl: null,
					timeZone: "America/New_York",
					createdAt: new Date("2024-01-02T10:00:00Z"),
					updatedAt: new Date("2024-01-02T10:00:00Z"),
				},
				{
					id: "test-animal-luna",
					householdId: testHouseholds[0].id,
					name: "Luna",
					species: "CAT",
					breed: "Siamese",
					color: "Seal Point",
					weight: 8.5,
					birthDate: new Date("2022-06-05"),
					microchipId: "456789123456789",
					profileImageUrl: "/test-images/luna-siamese.jpg",
					timeZone: "America/New_York",
					createdAt: new Date("2024-01-02T11:00:00Z"),
					updatedAt: new Date("2024-01-02T11:00:00Z"),
				},
			])
			.returning();

		// Create medication catalog entries
		console.log("💊 Creating medication catalog...");
		const testMedications = await db
			.insert(vetmedMedicationCatalog)
			.values([
				{
					id: "med-prednisone-5mg",
					name: "Prednisone",
					brandName: "Predisone",
					genericName: "Prednisone",
					concentration: "5mg",
					form: "TABLET",
					species: ["DOG", "CAT"],
					category: "CORTICOSTEROID",
					description: "Anti-inflammatory corticosteroid medication",
					commonDosageRange: "0.25-2.0 mg/kg",
					createdAt: new Date("2024-01-01T00:00:00Z"),
					updatedAt: new Date("2024-01-01T00:00:00Z"),
				},
				{
					id: "med-gabapentin-100mg",
					name: "Gabapentin",
					brandName: "Neurontin",
					genericName: "Gabapentin",
					concentration: "100mg",
					form: "CAPSULE",
					species: ["DOG", "CAT"],
					category: "ANTICONVULSANT",
					description: "Pain management and anti-seizure medication",
					commonDosageRange: "5-20 mg/kg",
					createdAt: new Date("2024-01-01T00:00:00Z"),
					updatedAt: new Date("2024-01-01T00:00:00Z"),
				},
				{
					id: "med-metacam-liquid",
					name: "Metacam",
					brandName: "Metacam",
					genericName: "Meloxicam",
					concentration: "1.5mg/ml",
					form: "LIQUID",
					species: ["DOG", "CAT"],
					category: "NSAID",
					description:
						"Non-steroidal anti-inflammatory drug for pain and inflammation",
					commonDosageRange: "0.1-0.2 mg/kg",
					createdAt: new Date("2024-01-01T00:00:00Z"),
					updatedAt: new Date("2024-01-01T00:00:00Z"),
				},
				{
					id: "med-rimadyl-75mg",
					name: "Rimadyl",
					brandName: "Rimadyl",
					genericName: "Carprofen",
					concentration: "75mg",
					form: "TABLET",
					species: ["DOG"],
					category: "NSAID",
					description: "Non-steroidal anti-inflammatory drug for dogs",
					commonDosageRange: "2-4 mg/kg",
					createdAt: new Date("2024-01-01T00:00:00Z"),
					updatedAt: new Date("2024-01-01T00:00:00Z"),
				},
			])
			.returning();

		// Create inventory items with different stock levels for visual variety
		console.log("📦 Creating inventory items...");
		const testInventory = await db
			.insert(vetmedInventoryItems)
			.values([
				{
					id: "inventory-prednisone",
					householdId: testHouseholds[0].id,
					medicationCatalogId: testMedications[0].id,
					lotNumber: "LOT123456",
					expiryDate: new Date("2024-12-31"),
					quantity: 0, // Out of stock for testing
					unitCost: 15.99,
					source: "VETERINARIAN",
					createdAt: new Date("2024-01-05T00:00:00Z"),
					updatedAt: new Date("2024-01-05T00:00:00Z"),
				},
				{
					id: "inventory-gabapentin",
					householdId: testHouseholds[0].id,
					medicationCatalogId: testMedications[1].id,
					lotNumber: "LOT789012",
					expiryDate: new Date("2024-10-15"),
					quantity: 5, // Low stock
					unitCost: 24.5,
					source: "PHARMACY",
					createdAt: new Date("2024-01-05T00:00:00Z"),
					updatedAt: new Date("2024-01-05T00:00:00Z"),
				},
				{
					id: "inventory-metacam",
					householdId: testHouseholds[0].id,
					medicationCatalogId: testMedications[2].id,
					lotNumber: "LOT345678",
					expiryDate: new Date("2025-06-30"),
					quantity: 2, // Adequate stock
					unitCost: 45.0,
					source: "VETERINARIAN",
					createdAt: new Date("2024-01-05T00:00:00Z"),
					updatedAt: new Date("2024-01-05T00:00:00Z"),
				},
				{
					id: "inventory-rimadyl",
					householdId: testHouseholds[0].id,
					medicationCatalogId: testMedications[3].id,
					lotNumber: "LOT567890",
					expiryDate: new Date("2023-11-01"), // Expired
					quantity: 30,
					unitCost: 32.75,
					source: "ONLINE",
					createdAt: new Date("2024-01-05T00:00:00Z"),
					updatedAt: new Date("2024-01-05T00:00:00Z"),
				},
			])
			.returning();

		// Create regimens
		console.log("📅 Creating medication regimens...");
		const testRegimens = await db
			.insert(vetmedRegimens)
			.values([
				{
					id: "regimen-buddy-prednisone",
					animalId: testAnimals[0].id,
					medicationCatalogId: testMedications[0].id,
					dosage: "5mg",
					frequency: "TWICE_DAILY",
					instructions: "Give with food to prevent stomach upset",
					startDate: new Date("2024-01-01"),
					endDate: new Date("2024-02-01"),
					isActive: true,
					prescribingVetName: "Dr. Sarah Johnson",
					condition: "Post-surgical inflammation",
					createdAt: new Date("2024-01-01T10:00:00Z"),
					updatedAt: new Date("2024-01-01T10:00:00Z"),
				},
				{
					id: "regimen-whiskers-gabapentin",
					animalId: testAnimals[1].id,
					medicationCatalogId: testMedications[1].id,
					dosage: "100mg",
					frequency: "THREE_TIMES_DAILY",
					instructions: "Can be given with or without food",
					startDate: new Date("2023-12-15"),
					endDate: null, // Ongoing
					isActive: true,
					prescribingVetName: "Dr. Michael Chen",
					condition: "Chronic arthritis pain management",
					createdAt: new Date("2023-12-15T14:00:00Z"),
					updatedAt: new Date("2023-12-15T14:00:00Z"),
				},
				{
					id: "regimen-charlie-metacam",
					animalId: testAnimals[2].id,
					medicationCatalogId: testMedications[2].id,
					dosage: "0.5ml",
					frequency: "ONCE_DAILY",
					instructions: "Give in the morning with breakfast",
					startDate: new Date("2024-01-10"),
					endDate: new Date("2024-02-10"),
					isActive: true,
					prescribingVetName: "Dr. Emily Rodriguez",
					condition: "Hip dysplasia management",
					createdAt: new Date("2024-01-10T09:00:00Z"),
					updatedAt: new Date("2024-01-10T09:00:00Z"),
				},
			])
			.returning();

		// Create some administration records for history testing
		console.log("📋 Creating administration records...");
		const baseDate = new Date("2024-01-15T08:00:00Z");
		const administrations = [];

		// Create a week of consistent administrations for visual timeline testing
		for (let day = 0; day < 7; day++) {
			for (let dose = 0; dose < 2; dose++) {
				const administrationTime = new Date(baseDate);
				administrationTime.setDate(baseDate.getDate() + day);
				administrationTime.setHours(dose === 0 ? 8 : 20); // 8 AM and 8 PM

				administrations.push({
					id: `admin-buddy-pred-${day}-${dose}`,
					regimenId: testRegimens[0].id,
					animalId: testAnimals[0].id,
					medicationCatalogId: testMedications[0].id,
					dosageGiven: "5mg",
					administeredAt: administrationTime,
					administeredByUserId: testUsers[0].id,
					notes:
						dose === 0
							? "Morning dose with breakfast"
							: "Evening dose with dinner",
					location: "HOME",
					createdAt: administrationTime,
					updatedAt: administrationTime,
				});
			}
		}

		// Add some missed/late administrations for variety
		administrations.push({
			id: "admin-whiskers-gaba-late",
			regimenId: testRegimens[1].id,
			animalId: testAnimals[1].id,
			medicationCatalogId: testMedications[1].id,
			dosageGiven: "100mg",
			administeredAt: new Date("2024-01-18T14:30:00Z"), // Late dose
			administeredByUserId: testUsers[0].id,
			notes: "Late dose - forgot morning administration",
			location: "HOME",
			createdAt: new Date("2024-01-18T14:30:00Z"),
			updatedAt: new Date("2024-01-18T14:30:00Z"),
		});

		await db.insert(vetmedAdministrations).values(administrations);

		console.log("✅ Visual test data seeded successfully!");
		console.log(`
📊 Created:
  - ${testUsers.length} users
  - ${testHouseholds.length} households  
  - ${testAnimals.length} animals
  - ${testMedications.length} medications
  - ${testInventory.length} inventory items
  - ${testRegimens.length} regimens
  - ${administrations.length} administrations

🎯 Test Data Summary:
  - User: test@example.com (Test User)
  - Household: Test Family Household
  - Animals: Buddy (Dog), Whiskers (Cat), Charlie (Dog), Luna (Cat)
  - Stock Levels: Out of stock, Low stock, Adequate, Expired
  - Administration History: 7 days of consistent records
    `);
	} catch (error) {
		console.error("❌ Error seeding visual test data:", error);
		throw error;
	} finally {
		await sql.end();
	}
}

// Run the seeding
if (require.main === module) {
	seedVisualTestData()
		.then(() => {
			console.log("🎉 Visual test data seeding completed!");
			process.exit(0);
		})
		.catch((error) => {
			console.error("💥 Failed to seed visual test data:", error);
			process.exit(1);
		});
}

export { seedVisualTestData };
