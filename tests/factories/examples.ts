/**
 * Factory Usage Examples
 *
 * This file demonstrates practical usage patterns for the test data factory system.
 * Use these examples as a reference for creating test data in your tests.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { animals, households, users } from "@/db/schema";
import { cleanDatabase, testDb } from "@/tests/helpers/db-utils";

// Import factories
import {
  administrationPresets,
  animalPresets,
  ComplianceDataBuilder,
  complexScenarios,
  createAnimal,
  createHousehold,
  createMedication,
  createUser,
  inventoryPresets,
  medicationPresets,
  quickScenarios,
  TestScenarioBuilder,
  UserBuilder,
} from "./index";

// Example 1: Simple Unit Test Data
describe("Example 1: Simple Factory Usage", () => {
  it("creates basic test entities", () => {
    // Simple factory usage with defaults
    const user = createUser();
    expect(user.email).toBeDefined();
    expect(user.id).toBeDefined();

    // Factory with custom overrides
    const customUser = createUser({
      email: "test@example.com",
      firstName: "John",
      lastName: "Doe",
    });
    expect(customUser.email).toBe("test@example.com");
    expect(customUser.firstName).toBe("John");
  });
});

// Example 2: Builder Pattern for Complex Entities
describe("Example 2: Builder Pattern Usage", () => {
  it("creates complex entities with builder pattern", () => {
    // Fluent builder pattern
    const veterinarian = UserBuilder.create()
      .withEmail("dr.smith@vetclinic.com")
      .withName("Dr. Sarah", "Smith")
      .withProfile({
        bio: "Licensed veterinarian with 10 years experience",
        location: "New York, NY",
      })
      .withPreferences({
        weightUnit: "kg",
        temperatureUnit: "celsius",
        use24HourTime: true,
      })
      .withOnboarding(true)
      .withNotificationPreferences({
        email: true,
        sms: true,
        push: true,
        leadTimeMinutes: "10",
      })
      .createdDaysAgo(180)
      .build();

    expect(veterinarian.email).toBe("dr.smith@vetclinic.com");
    expect(veterinarian.weightUnit).toBe("kg");
    expect(veterinarian.onboardingComplete).toBe(true);
  });
});

// Example 3: Complete Scenario Generation
describe("Example 3: Scenario Builder Usage", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it("creates complete test scenarios", async () => {
    // Generate a complete medication management scenario
    const scenario = TestScenarioBuilder.create()
      .withUsers(2, "completed") // Owner and caregiver
      .withHouseholds(1, "family")
      .withHouseholdMembers(0, [0, 1], ["OWNER", "CAREGIVER"]) // Both users in a household
      .withAnimals(2, 0, "dog") // Two dogs in the household 0
      .withMedications(3, "antibiotic") // Three antibiotics
      .withRegimens(0, 0, "bid") // Dog 0, Medication 0, twice daily
      .withRegimens(1, 1, "daily") // Dog 1, Medication 1, once daily
      .withAdministrations(0, 14, 0, 0) // 14 administrations by user 0
      .withInventory(0, 0, "partial") // Partially used medication 0
      .withNotifications(0, 0, 5) // 5 notifications for user 0
      .build();

    // Verify the scenario structure
    expect(scenario.users).toHaveLength(2);
    expect(scenario.households).toHaveLength(1);
    expect(scenario.animals).toHaveLength(2);
    expect(scenario.regimens).toHaveLength(2);
    expect(scenario.administrations).toHaveLength(14);
    expect(scenario.inventory).toHaveLength(1);
    expect(scenario.notifications).toHaveLength(5);

    // Insert into test database
    for (const user of scenario.users) {
      await testDb.insert(users).values(user);
    }

    for (const household of scenario.households) {
      await testDb.insert(households).values(household);
    }

    // Continue inserting other entities...
    // This demonstrates how to use scenario data with your test database
  });
});

// Example 4: Pre-built Scenarios
describe("Example 4: Pre-built Scenarios", () => {
  it("uses quick scenarios for simple tests", () => {
    // Single user with one pet - perfect for basic workflow tests
    const singleUserScenario = quickScenarios.singleUserOnePet();

    expect(singleUserScenario.users).toHaveLength(1);
    expect(singleUserScenario.animals).toHaveLength(1);
    expect(singleUserScenario.medications).toHaveLength(1);

    // Family with multiple pets - good for multi-animal workflows
    const familyScenario = quickScenarios.familyMultiplePets();

    expect(familyScenario.users).toHaveLength(2); // Owner and caregiver
    expect(familyScenario.animals).toHaveLength(2); // Dog and cat
  });

  it("uses complex scenarios for integration tests", () => {
    // Complete medication management scenario
    const medicationScenario = complexScenarios.medicationManagement();

    // This scenario includes:
    // - Multiple users with different roles
    // - Households with proper membership relationships
    // - Animals with medical histories
    // - Medications with proper dosing information
    // - Active regimens with realistic schedules
    // - Administration history with various statuses
    // - Inventory tracking with different stock levels
    // - Notifications for various events
    // - Audit logs for compliance tracking

    expect(medicationScenario.users.length).toBeGreaterThan(0);
    expect(medicationScenario.administrations.length).toBeGreaterThan(0);
    expect(medicationScenario.auditLogs.length).toBeGreaterThan(0);
  });
});

// Example 5: Compliance Data Generation
describe("Example 5: Compliance Testing", () => {
  it("generates realistic compliance patterns", () => {
    // Create a regimen first
    const _user = createUser();
    const household = createHousehold();
    const animal = animalPresets.healthyDog(household.id!);
    const medication = medicationPresets.amoxicillin();

    // Create a realistic BID (twice daily) regimen
    const regimen = {
      ...createMedication(),
      id: "regimen-123",
      animalId: animal.id!,
      medicationId: medication.id!,
      scheduleType: "FIXED" as const,
      timesLocal: ["08:00", "20:00"], // Morning and evening
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      active: true,
    };

    // Generate realistic compliance data (starts at 85%, gradually declines)
    const complianceData = ComplianceDataBuilder.create()
      .forRegimen(regimen as any)
      .withRealisticPattern(30) // 30 days
      .build();

    expect(complianceData.administrations.length).toBeGreaterThan(30); // At least one per day
    expect(complianceData.administrations.length).toBeLessThan(60); // At most two per day

    // Verify we have different statuses
    const statuses = new Set(
      complianceData.administrations.map((a) => a.status),
    );
    expect(statuses.size).toBeGreaterThan(1); // Should have multiple statuses
    expect(statuses.has("ON_TIME")).toBe(true); // Should have on-time administrations

    // Generate perfect compliance for testing edge cases
    const perfectData = ComplianceDataBuilder.create()
      .forRegimen(regimen as any)
      .withPerfectCompliance(14)
      .build();

    // All administrations should be on time
    expect(
      perfectData.administrations.every((a) => a.status === "ON_TIME"),
    ).toBe(true);
  });
});

// Example 6: Inventory Management Testing
describe("Example 6: Inventory Testing", () => {
  it("creates various inventory scenarios", () => {
    const household = createHousehold();
    const medication = medicationPresets.carprofen();

    // Different inventory states for testing
    const inventoryScenarios = [
      inventoryPresets.newMedication(household.id!, medication.id!),
      inventoryPresets.partiallyUsed(household.id!, medication.id!),
      inventoryPresets.nearExpiration(household.id!, medication.id!),
      inventoryPresets.expiredMedication(household.id!, medication.id!),
      inventoryPresets.emptyContainer(household.id!, medication.id!),
    ];

    // Verify different states
    expect(inventoryScenarios[0]?.unitsRemaining).toBe(
      inventoryScenarios[0]?.quantityUnits,
    ); // New = full
    expect(inventoryScenarios[1]?.inUse).toBe(true); // Partially used = in use
    expect(inventoryScenarios[4]?.unitsRemaining).toBe(0); // Empty = 0 remaining

    // Test expiration logic
    const expired = inventoryScenarios[3];
    if (!expired) throw new Error("Expected expired inventory");
    const expiredDate = new Date(expired.expiresOn ?? "");
    expect(expiredDate.getTime()).toBeLessThan(Date.now()); // Should be in the past
  });
});

// Example 7: Administration Testing with Different Scenarios
describe("Example 7: Administration Scenarios", () => {
  it("creates various administration scenarios", () => {
    const user = createUser();
    const household = createHousehold();
    const animal = createAnimal({ householdId: household.id! });
    const regimen = "regimen-123";

    // Different administration scenarios
    const onTime = administrationPresets.onTimeOral(
      regimen,
      animal.id!,
      household.id!,
      user.id!,
    );
    const late = administrationPresets.lateWithExcuse(
      regimen,
      animal.id!,
      household.id!,
      user.id!,
    );
    const missed = administrationPresets.missedDose(
      regimen,
      animal.id!,
      household.id!,
      user.id!,
    );
    const adverse = administrationPresets.withAdverseEvent(
      regimen,
      animal.id!,
      household.id!,
      user.id!,
    );

    // Verify different statuses and timing
    expect(onTime.status).toBe("ON_TIME");
    expect(late.status).toBe("LATE");
    expect(missed.status).toBe("MISSED");
    expect(adverse.adverseEvent).toBe(true);

    // Verify timing relationships
    const scheduledTime = new Date(onTime.scheduledFor!).getTime();
    const recordedTime = new Date(onTime.recordedAt).getTime();
    const timeDifference = Math.abs(recordedTime - scheduledTime) / (1000 * 60); // minutes

    expect(timeDifference).toBeLessThanOrEqual(15); // On time = within 15 minutes
  });
});

// Example 8: Multi-Household Testing (Pet Rescue/Clinic Scenarios)
describe("Example 8: Multi-Household Scenarios", () => {
  it("creates pet rescue scenario", () => {
    const petRescueScenario = complexScenarios.petRescueScenario();

    // Should have multiple users with different roles
    expect(petRescueScenario.users.length).toBe(4); // Admin, 2 volunteers, vet
    expect(petRescueScenario.memberships.length).toBe(4);

    // Should have rescue animals with special considerations
    const rescueAnimals = petRescueScenario.animals;
    expect(
      rescueAnimals.some(
        (animal) =>
          animal.notes?.includes("Rescue") ||
          (animal.conditions?.length ?? 0) > 0,
      ),
    ).toBe(true);

    // Should have different membership roles
    const roles = new Set(petRescueScenario.memberships.map((m) => m.role));
    expect(roles.has("OWNER")).toBe(true); // Admin
    expect(roles.has("CAREGIVER")).toBe(true); // Volunteers
    expect(roles.has("VETREADONLY")).toBe(true); // Vet
  });
});

// Example 9: Performance and Load Testing Data
describe("Example 9: Performance Testing", () => {
  it("generates large datasets efficiently", () => {
    const startTime = Date.now();

    // Generate a large scenario for performance testing
    const largeScenario = TestScenarioBuilder.create()
      .withUsers(10, "completed")
      .withHouseholds(5, "family")
      .withAnimals(20, 0) // 20 animals in the first household
      .withMedications(15)
      .build();

    const endTime = Date.now();
    const generationTime = endTime - startTime;

    // Should generate large datasets quickly (< 100 ms for this size)
    expect(generationTime).toBeLessThan(1000); // 1-second max
    expect(largeScenario.users.length).toBe(10);
    expect(largeScenario.animals.length).toBe(20);
    expect(largeScenario.medications.length).toBe(15);
  });
});

// Example 10: Custom Scenario Creation
describe("Example 10: Custom Scenarios", () => {
  it("creates custom scenarios for specific test needs", () => {
    // Example: Testing medication interactions
    const interactionTestScenario = TestScenarioBuilder.create()
      .withUsers(1, "completed")
      .withHouseholds(1, "family")
      .withHouseholdMembers(0, [0], ["OWNER"])
      .withAnimals(1, 0)
      // Create an animal with multiple conditions requiring different medications
      .withCustomAnimal(0, (builder) =>
        builder
          .withBasicInfo({ name: "Complex Case", species: "dog" })
          .withConditions(["Arthritis", "Heart condition", "Anxiety"])
          .withAge(10)
          .withWeight(25)
          .withNotes(
            "Senior dog with multiple conditions - monitor for drug interactions",
          ),
      )
      .withMedications(3) // Different medication types
      .build();

    // This creates a scenario specifically for testing:
    // - Multiple concurrent medications
    // - Senior animal considerations
    // - Complex medical history
    // - Drug interaction monitoring

    const complexAnimal = interactionTestScenario.animals[0];
    expect(complexAnimal?.conditions?.length).toBe(3);
    expect(complexAnimal?.notes).toContain("interactions");
    expect(interactionTestScenario.medications.length).toBe(3);
  });
});

// Example 11: Integration with Existing Test Helpers
describe("Example 11: Integration with Test Database", () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  it("integrates with existing test database helpers", async () => {
    // Create scenario data
    const scenario = quickScenarios.singleUserOnePet();

    // Insert using existing database helpers
    const userToInsert = scenario.users[0];
    if (!userToInsert) throw new Error("No user found in scenario");
    const insertedUser = await testDb
      .insert(users)
      .values(userToInsert)
      .returning();
    const householdToInsert = scenario.households[0];
    if (!householdToInsert) throw new Error("No household found in scenario");
    const insertedHousehold = await testDb
      .insert(households)
      .values(householdToInsert)
      .returning();
    const animalToInsert = scenario.animals[0];
    const insertedHouseholdId = insertedHousehold[0]?.id;
    if (!animalToInsert || !insertedHouseholdId) {
      throw new Error("Missing animal or household data");
    }
    const insertedAnimal = await testDb
      .insert(animals)
      .values({
        ...animalToInsert,
        householdId: insertedHouseholdId,
      })
      .returning();

    // Verify insertion
    expect(insertedUser).toHaveLength(1);
    expect(insertedHousehold).toHaveLength(1);
    expect(insertedAnimal).toHaveLength(1);

    // Query back to verify relationships
    const insertedAnimalId = insertedAnimal[0]?.id;
    if (!insertedAnimalId) throw new Error("No animal id found");

    const queriedAnimal = await testDb.query.animals.findFirst({
      where: (animals: any, { eq }: any) => eq(animals.id, insertedAnimalId),
      with: { household: true },
    });

    expect(queriedAnimal?.household?.id).toBe(insertedHousehold[0]?.id);
  });
});
