/**
 * Pre-built test scenarios for common use cases
 */

import { administrationPresets } from "./administration";
import { animalPresets } from "./animal";
import { ComplianceDataBuilder, TestScenarioBuilder } from "./builders";
import { householdPresets } from "./household";
import { inventoryPresets } from "./inventory";
import { medicationPresets } from "./medication";
import { regimenPresets } from "./regimen";
import { userPresets } from "./user";

// Simple scenarios for quick testing
export const quickScenarios = {
  // Single user with one pet
  singleUserOnePet: () => {
    const user = userPresets.completedUser();
    const household = householdPresets.singleOwner(user.id!);
    const animal = animalPresets.healthyDog(household.household.id!);
    const medication = medicationPresets.amoxicillin();

    return {
      users: [user],
      households: [household.household],
      memberships: household.memberships,
      animals: [animal],
      medications: [medication],
      regimens: [],
      administrations: [],
      inventory: [],
      notifications: [],
      auditLogs: [],
    };
  },

  // Family with multiple pets
  familyMultiplePets: () => {
    const owner = userPresets.completedUser();
    const caregiver = userPresets.completedUser();
    const household = householdPresets.familyHousehold(
      owner.id!,
      caregiver.id!,
    );

    const dog = animalPresets.healthyDog(household.household.id!);
    const cat = animalPresets.healthyCat(household.household.id!);

    const antibiotics = medicationPresets.amoxicillin();
    const painMed = medicationPresets.carprofen();

    return {
      users: [owner, caregiver],
      households: [household.household],
      memberships: household.memberships,
      animals: [dog, cat],
      medications: [antibiotics, painMed],
      regimens: [],
      administrations: [],
      inventory: [],
      notifications: [],
      auditLogs: [],
    };
  },

  // Vet clinic scenario
  vetClinic: () => {
    const vet = userPresets.veterinarian();
    const assistant = userPresets.completedUser();
    const household = householdPresets.vetClinic(vet.id!, assistant.id!);

    const patient1 = animalPresets.seniorDogWithConditions(
      household.household.id!,
    );
    const patient2 = animalPresets.diabeticCat(household.household.id!);

    return {
      users: [vet, assistant],
      households: [household.household],
      memberships: household.memberships,
      animals: [patient1, patient2],
      medications: [
        medicationPresets.carprofen(),
        medicationPresets.prednisone(),
        medicationPresets.amoxicillin(),
      ],
      regimens: [],
      administrations: [],
      inventory: [],
      notifications: [],
      auditLogs: [],
    };
  },
};

// Complex scenarios with full relationships
export const complexScenarios = {
  // Complete medication management scenario
  medicationManagement: () => {
    return TestScenarioBuilder.create()
      .withUsers(2, "completed") // Owner and caregiver
      .withHouseholds(1, "family")
      .withHouseholdMembers(0, [0, 1], ["OWNER", "CAREGIVER"])
      .withAnimals(2, 0, "dog") // Two dogs
      .withMedications(3, "antibiotic") // Three antibiotics
      .withRegimens(0, 0, "bid") // Dog 1, Medication 1, twice daily
      .withRegimens(1, 1, "daily") // Dog 2, Medication 2, once daily
      .withAdministrations(0, 14, 0, 0) // 2 weeks of administrations for regimen 1
      .withAdministrations(1, 7, 1, 0) // 1 week of administrations for regimen 2
      .withInventory(0, 0, "partial") // Partial inventory for medication 1
      .withInventory(1, 0, "low") // Low inventory for medication 2
      .withNotifications(0, 0, 5) // 5 notifications for user 1
      .withAuditLogs(0, 0, 20) // 20 audit log entries
      .build();
  },

  // Multi-household scenario (e.g., pet rescue)
  petRescueScenario: () => {
    const admin = userPresets.completedUser();
    const volunteer1 = userPresets.petSitter();
    const volunteer2 = userPresets.petSitter();
    const vet = userPresets.veterinarian();

    return TestScenarioBuilder.create()
      .withCustomUser((builder) =>
        builder
          .withEmail(admin.email!)
          .withName(admin.firstName!, admin.lastName!)
          .withOnboarding(true),
      )
      .withCustomUser((builder) =>
        builder
          .withEmail(volunteer1.email!)
          .withName(volunteer1.firstName!, volunteer1.lastName!),
      )
      .withCustomUser((builder) =>
        builder
          .withEmail(volunteer2.email!)
          .withName(volunteer2.firstName!, volunteer2.lastName!),
      )
      .withCustomUser((builder) =>
        builder.withEmail(vet.email!).withName(vet.firstName!, vet.lastName!),
      )
      .withHouseholds(1, "rescue")
      .withHouseholdMembers(
        0,
        [0, 1, 2, 3],
        ["OWNER", "CAREGIVER", "CAREGIVER", "VETREADONLY"],
      )
      .withCustomAnimal(0, (builder) =>
        builder
          .withBasicInfo({ name: "Hope", species: "dog", breed: "Mixed breed" })
          .withConditions(["Anxiety", "Previous abuse"])
          .withNotes("Rescue animal, needs gentle handling"),
      )
      .withCustomAnimal(0, (builder) =>
        builder
          .withBasicInfo({
            name: "Lucky",
            species: "cat",
            breed: "Domestic Shorthair",
          })
          .withAllergies(["Environmental allergies"])
          .withNotes("Found as stray, very friendly"),
      )
      .withMedications(5) // Various medications
      .withRegimens(0, 0, "prn") // Anxiety medication for Hope
      .withRegimens(1, 1, "daily") // Allergy medication for Lucky
      .withInventory(0, 0, "new")
      .withInventory(1, 0, "partial")
      .withNotifications(0, 0, 3) // Admin notifications
      .withNotifications(1, 0, 2) // Volunteer notifications
      .build();
  },

  // Compliance testing scenario
  complianceTestScenario: () => {
    const scenario = TestScenarioBuilder.create()
      .withUsers(1, "completed")
      .withHouseholds(1, "family")
      .withHouseholdMembers(0, [0], ["OWNER"])
      .withAnimals(1, 0, "dog")
      .withMedications(1, "antibiotic")
      .build();

    // Add regimen and compliance data
    const regimen = regimenPresets.twiceDailyOral(
      scenario.animals[0].id!,
      scenario.medications[0].id!,
    );

    const complianceData = ComplianceDataBuilder.create()
      .forRegimen(regimen)
      .withRealisticPattern(30) // 30 days of realistic compliance
      .build();

    return {
      ...scenario,
      regimens: [complianceData.regimen],
      administrations: complianceData.administrations,
    };
  },

  // Emergency/critical care scenario
  emergencyCareScenario: () => {
    return TestScenarioBuilder.create()
      .withUsers(3, "completed") // Owner, emergency vet, tech
      .withHouseholds(1, "clinic")
      .withHouseholdMembers(0, [0, 1, 2], ["CAREGIVER", "OWNER", "CAREGIVER"])
      .withCustomAnimal(0, (builder) =>
        builder
          .withBasicInfo({ name: "Emergency Patient", species: "dog" })
          .withConditions(["Trauma", "Blood loss", "Shock"])
          .withNotes("Emergency admission - monitor closely"),
      )
      .withMedications(4) // Emergency medications
      .withRegimens(0, 0, "prn") // Pain management
      .withRegimens(0, 1, "prn") // Anti-nausea
      .withAdministrations(0, 8, 1, 0) // Emergency administrations
      .withAdministrations(1, 4, 2, 0) // Tech administrations
      .withInventory(0, 0, "new") // Emergency stock
      .withNotifications(1, 0, 10) // Critical notifications
      .withAuditLogs(1, 0, 25) // Detailed audit trail
      .build();
  },
};

// Specific test data generators
export const testDataGenerators = {
  // Generate compliance test data
  generateComplianceData: (
    regimenId: string,
    animalId: string,
    days = 30,
    pattern: "realistic" | "perfect" | "poor" = "realistic",
  ) => {
    const regimen = regimenPresets.twiceDailyOral(animalId, "med-id");
    regimen.id = regimenId;

    const builder = ComplianceDataBuilder.create().forRegimen(regimen);

    switch (pattern) {
      case "perfect":
        return builder.withPerfectCompliance(days).build();
      case "poor":
        return builder.withPoorCompliance(days).build();
      default:
        return builder.withRealisticPattern(days).build();
    }
  },

  // Generate inventory test data with different stock levels
  generateInventoryTestData: (householdId: string, medicationIds: string[]) => {
    return medicationIds.map((medicationId, index) => {
      const types = ["new", "partial", "low", "expired"] as const;
      const type = types[index % types.length];

      return inventoryPresets[type](householdId, medicationId);
    });
  },

  // Generate multi-household scenario for shared users
  generateMultiHouseholdScenario: (userId: string, householdCount = 3) => {
    const scenarios = [];

    for (let i = 0; i < householdCount; i++) {
      const scenario = TestScenarioBuilder.create()
        .withUsers(1) // The shared user will be added separately
        .withHouseholds(1, i % 2 === 0 ? "family" : "clinic")
        .withHouseholdMembers(0, [0], ["CAREGIVER"]) // Temporary member
        .withAnimals(2 + i, 0) // Increasing number of animals
        .withMedications(3)
        .withRegimens(0, 0)
        .withRegimens(1, 1)
        .build();

      // Replace the temporary user with the shared user
      scenario.users[0].id = userId;
      scenario.memberships[0].userId = userId;

      scenarios.push(scenario);
    }

    return scenarios;
  },

  // Generate time-series data for charts and reports
  generateTimeSeriesData: (
    regimenId: string,
    animalId: string,
    householdId: string,
    caregiverId: string,
    startDate: Date,
    endDate: Date,
  ) => {
    const administrations = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      // Generate 2 administrations per day (BID)
      for (const hour of [8, 20]) {
        const scheduledTime = new Date(currentDate);
        scheduledTime.setHours(hour, 0, 0, 0);

        if (scheduledTime <= endDate) {
          const administration = administrationPresets.onTimeOral(
            regimenId,
            animalId,
            householdId,
            caregiverId,
          );

          // Adjust the scheduled and recorded times
          administration.scheduledFor = scheduledTime.toISOString();
          administration.recordedAt = new Date(
            scheduledTime.getTime() + Math.random() * 30 * 60000,
          ).toISOString();

          administrations.push(administration);
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return administrations;
  },
};

// Preset scenarios for different testing phases
export const testingPhases = {
  // Unit test data - minimal, focused
  unit: {
    singleEntity: () => ({
      user: userPresets.completedUser(),
      household: householdPresets.singleOwner("user-id"),
      animal: animalPresets.healthyDog("household-id"),
      medication: medicationPresets.amoxicillin(),
      regimen: regimenPresets.twiceDailyOral("animal-id", "med-id"),
    }),
  },

  // Integration test data - related entities
  integration: {
    userFlow: () => complexScenarios.medicationManagement(),
    inventoryManagement: () => {
      const base = quickScenarios.singleUserOnePet();
      return {
        ...base,
        inventory: [
          inventoryPresets.partiallyUsed(
            base.households[0].id!,
            base.medications[0].id!,
          ),
          inventoryPresets.nearExpiration(
            base.households[0].id!,
            base.medications[0].id!,
          ),
          inventoryPresets.emptyContainer(
            base.households[0].id!,
            base.medications[0].id!,
          ),
        ],
      };
    },
  },

  // E2E test data - complete workflows
  e2e: {
    completeWorkflow: () => complexScenarios.medicationManagement(),
    multiUserScenario: () => complexScenarios.petRescueScenario(),
    emergencyScenario: () => complexScenarios.emergencyCareScenario(),
  },
};
