/**
 * Complex test scenario builders for multi-entity relationships
 */

import type {
  NewAdministration,
  NewAnimal,
  NewAuditLog,
  NewHousehold,
  NewInventoryItem,
  NewMedicationCatalog,
  NewMembership,
  NewNotification,
  NewRegimen,
  NewUser,
} from "@/db/schema";
import { AdministrationBuilder } from "./administration";
import { AnimalBuilder, createAnimal } from "./animal";
import { AuditLogBuilder } from "./audit";
import { HouseholdBuilder } from "./household";
import { createInventoryItem, InventoryBuilder } from "./inventory";
import { createMedication, MedicationBuilder } from "./medication";
import { NotificationBuilder } from "./notification";
import { createRegimen, RegimenBuilder } from "./regimen";
import { createUser, UserBuilder } from "./user";
import { dates } from "./utils/dates";
import { random } from "./utils/random";

// Complete test scenario builder
export class TestScenarioBuilder {
  private scenario: {
    users: NewUser[];
    households: Array<{
      household: NewHousehold;
      memberships: NewMembership[];
    }>;
    animals: NewAnimal[];
    medications: NewMedicationCatalog[];
    regimens: NewRegimen[];
    administrations: NewAdministration[];
    inventory: NewInventoryItem[];
    notifications: NewNotification[];
    auditLogs: NewAuditLog[];
  } = {
    users: [],
    households: [],
    animals: [],
    medications: [],
    regimens: [],
    administrations: [],
    inventory: [],
    notifications: [],
    auditLogs: [],
  };

  static create(): TestScenarioBuilder {
    return new TestScenarioBuilder();
  }

  // User management
  withUsers(
    count: number,
    userType?: "new" | "completed" | "veterinarian" | "petSitter",
  ): TestScenarioBuilder {
    for (let i = 0; i < count; i++) {
      let user: NewUser;
      switch (userType) {
        case "new":
          user = UserBuilder.create().withOnboarding(false).build();
          break;
        case "completed":
          user = UserBuilder.create().withOnboarding(true).build();
          break;
        case "veterinarian":
          user = UserBuilder.create()
            .withProfile({ bio: "Licensed veterinarian" })
            .withPreferences({ weightUnit: "kg", temperatureUnit: "celsius" })
            .build();
          break;
        case "petSitter":
          user = UserBuilder.create()
            .withProfile({ bio: "Professional pet sitter" })
            .build();
          break;
        default:
          user = createUser();
      }
      this.scenario.users.push(user);
    }
    return this;
  }

  withCustomUser(
    userBuilder: (builder: UserBuilder) => UserBuilder,
  ): TestScenarioBuilder {
    const user = userBuilder(UserBuilder.create()).build();
    this.scenario.users.push(user);
    return this;
  }

  // Household management
  withHouseholds(
    count: number,
    householdType?: "family" | "clinic" | "rescue",
  ): TestScenarioBuilder {
    for (let i = 0; i < count; i++) {
      const name = householdType
        ? `${householdType} ${i + 1}`
        : `Test Household ${i + 1}`;

      const householdData = HouseholdBuilder.create()
        .withName(name)
        .createdDaysAgo(random.int(30, 365))
        .build();

      this.scenario.households.push({
        household: householdData.household,
        memberships: householdData.memberships,
      });
    }
    return this;
  }

  withHouseholdMembers(
    householdIndex = 0,
    userIndices: number[] = [],
    roles: Array<"OWNER" | "CAREGIVER" | "VETREADONLY"> = [],
  ): TestScenarioBuilder {
    if (householdIndex >= this.scenario.households.length) {
      throw new Error(`Household index ${householdIndex} out of range`);
    }

    const household = this.scenario.households[householdIndex];

    userIndices.forEach((userIndex, i) => {
      if (userIndex >= this.scenario.users.length) {
        throw new Error(`User index ${userIndex} out of range`);
      }

      const role = roles[i] || "CAREGIVER";
      const user = this.scenario.users[userIndex];

      household.memberships.push({
        id: random.uuid(),
        userId: user.id!,
        householdId: household.household.id!,
        role,
        createdAt: dates.datePast(90).toISOString(),
        updatedAt: dates.dateRecent(7).toISOString(),
      });
    });

    return this;
  }

  // Animal management
  withAnimals(
    count: number,
    householdIndex = 0,
    animalType?: "dog" | "cat" | "mixed",
  ): TestScenarioBuilder {
    if (householdIndex >= this.scenario.households.length) {
      throw new Error(`Household index ${householdIndex} out of range`);
    }

    const householdId = this.scenario.households[householdIndex].household.id!;

    for (let i = 0; i < count; i++) {
      let animal: NewAnimal;

      switch (animalType) {
        case "dog":
          animal = AnimalBuilder.create()
            .withBasicInfo({ name: `Dog ${i + 1}`, species: "dog" })
            .withHousehold(householdId)
            .build();
          break;
        case "cat":
          animal = AnimalBuilder.create()
            .withBasicInfo({ name: `Cat ${i + 1}`, species: "cat" })
            .withHousehold(householdId)
            .build();
          break;
        default:
          animal = createAnimal({ householdId });
      }

      this.scenario.animals.push(animal);
    }
    return this;
  }

  withCustomAnimal(
    householdIndex: number,
    animalBuilder: (builder: AnimalBuilder) => AnimalBuilder,
  ): TestScenarioBuilder {
    if (householdIndex >= this.scenario.households.length) {
      throw new Error(`Household index ${householdIndex} out of range`);
    }

    const householdId = this.scenario.households[householdIndex].household.id!;
    const animal = animalBuilder(
      AnimalBuilder.create().withHousehold(householdId),
    ).build();
    this.scenario.animals.push(animal);
    return this;
  }

  // Medication management
  withMedications(
    count: number,
    medicationType?: "antibiotic" | "nsaid" | "steroid",
  ): TestScenarioBuilder {
    for (let i = 0; i < count; i++) {
      let medication: NewMedicationCatalog;

      if (medicationType) {
        const medications = {
          antibiotic: () =>
            MedicationBuilder.create()
              .withBasicInfo({
                genericName: `Antibiotic ${i + 1}`,
                route: "ORAL",
                form: "TABLET",
              })
              .withDosing({ min: 10, max: 25, typical: 15 })
              .build(),
          nsaid: () =>
            MedicationBuilder.create()
              .withBasicInfo({
                genericName: `NSAID ${i + 1}`,
                route: "ORAL",
                form: "TABLET",
              })
              .withDosing({ min: 2, max: 4, typical: 2.2 })
              .build(),
          steroid: () =>
            MedicationBuilder.create()
              .withBasicInfo({
                genericName: `Steroid ${i + 1}`,
                route: "ORAL",
                form: "TABLET",
              })
              .withDosing({ min: 0.5, max: 2, typical: 1 })
              .build(),
        };
        medication = medications[medicationType]();
      } else {
        medication = createMedication();
      }

      this.scenario.medications.push(medication);
    }
    return this;
  }

  // Regimen management
  withRegimens(
    animalIndex: number,
    medicationIndex: number,
    regimenType?: "daily" | "bid" | "prn",
  ): TestScenarioBuilder {
    if (animalIndex >= this.scenario.animals.length) {
      throw new Error(`Animal index ${animalIndex} out of range`);
    }
    if (medicationIndex >= this.scenario.medications.length) {
      throw new Error(`Medication index ${medicationIndex} out of range`);
    }

    const animal = this.scenario.animals[animalIndex];
    const medication = this.scenario.medications[medicationIndex];

    let regimen: NewRegimen;

    switch (regimenType) {
      case "daily":
        regimen = RegimenBuilder.create()
          .forAnimal(animal.id!)
          .withMedication(medication.id!)
          .withFixedSchedule(["08:00"])
          .withDuration(dates.yesterday(), dates.weeksFromNow(4))
          .build();
        break;
      case "bid":
        regimen = RegimenBuilder.create()
          .forAnimal(animal.id!)
          .withMedication(medication.id!)
          .withFixedSchedule(["08:00", "20:00"])
          .withDuration(dates.yesterday(), dates.weeksFromNow(2))
          .build();
        break;
      case "prn":
        regimen = RegimenBuilder.create()
          .forAnimal(animal.id!)
          .withMedication(medication.id!)
          .withPrnSchedule("Pain management", 3)
          .withDuration(dates.yesterday(), dates.weeksFromNow(4))
          .build();
        break;
      default:
        regimen = createRegimen({
          animalId: animal.id!,
          medicationId: medication.id!,
        });
    }

    this.scenario.regimens.push(regimen);
    return this;
  }

  // Administration management
  withAdministrations(
    regimenIndex: number,
    count: number,
    userIndex = 0,
    householdIndex = 0,
  ): TestScenarioBuilder {
    if (regimenIndex >= this.scenario.regimens.length) {
      throw new Error(`Regimen index ${regimenIndex} out of range`);
    }

    const regimen = this.scenario.regimens[regimenIndex];
    const user = this.scenario.users[userIndex];
    const household = this.scenario.households[householdIndex].household;

    for (let i = 0; i < count; i++) {
      const administration = AdministrationBuilder.create()
        .forRegimen(regimen.id!)
        .forAnimal(regimen.animalId!)
        .inHousehold(household.id!)
        .byCaregiver(user.id!)
        .scheduledFor(dates.hoursFromNow(-random.int(1, 168))) // Last week
        .withStatus(
          random.arrayElement(["ON_TIME", "LATE", "MISSED", "PRN"] as const),
        )
        .build();

      this.scenario.administrations.push(administration);
    }
    return this;
  }

  // Inventory management
  withInventory(
    medicationIndex: number,
    householdIndex = 0,
    inventoryType?: "new" | "partial" | "low" | "expired",
  ): TestScenarioBuilder {
    if (medicationIndex >= this.scenario.medications.length) {
      throw new Error(`Medication index ${medicationIndex} out of range`);
    }

    const medication = this.scenario.medications[medicationIndex];
    const household = this.scenario.households[householdIndex].household;

    let inventory: NewInventoryItem;

    switch (inventoryType) {
      case "new":
        inventory = InventoryBuilder.create()
          .inHousehold(household.id!)
          .forMedication(medication.id!)
          .withQuantity(30, 30)
          .expiresIn(18)
          .isNotInUse()
          .build();
        break;
      case "partial":
        inventory = InventoryBuilder.create()
          .inHousehold(household.id!)
          .forMedication(medication.id!)
          .withQuantity(30, random.int(10, 25))
          .expiresIn(12)
          .isInUse()
          .build();
        break;
      case "low":
        inventory = InventoryBuilder.create()
          .inHousehold(household.id!)
          .forMedication(medication.id!)
          .withQuantity(30, random.int(1, 5))
          .expiresIn(6)
          .isInUse()
          .build();
        break;
      case "expired":
        inventory = InventoryBuilder.create()
          .inHousehold(household.id!)
          .forMedication(medication.id!)
          .withQuantity(20, random.int(5, 15))
          .isExpired()
          .build();
        break;
      default:
        inventory = createInventoryItem({
          householdId: household.id!,
          medicationId: medication.id!,
        });
    }

    this.scenario.inventory.push(inventory);
    return this;
  }

  // Notification management
  withNotifications(
    userIndex: number,
    householdIndex: number,
    count: number,
  ): TestScenarioBuilder {
    const user = this.scenario.users[userIndex];
    const household = this.scenario.households[householdIndex].household;

    for (let i = 0; i < count; i++) {
      const notification = NotificationBuilder.create()
        .forUser(user.id!)
        .inHousehold(household.id!)
        .withType(
          random.arrayElement([
            "medication",
            "inventory",
            "reminder",
            "system",
          ]),
        )
        .withPriority(random.arrayElement(["low", "medium", "high"]))
        .createdHoursAgo(random.int(1, 168))
        .build();

      this.scenario.notifications.push(notification);
    }
    return this;
  }

  // Audit log management
  withAuditLogs(
    userIndex: number,
    householdIndex: number,
    count: number,
  ): TestScenarioBuilder {
    const user = this.scenario.users[userIndex];
    const household = this.scenario.households[householdIndex].household;

    for (let i = 0; i < count; i++) {
      const auditLog = AuditLogBuilder.create()
        .byUser(user.id!)
        .inHousehold(household.id!)
        .withAction(random.arrayElement(["CREATE", "UPDATE", "DELETE", "VIEW"]))
        .onResource(
          random.arrayElement([
            "animal",
            "regimen",
            "administration",
            "inventory",
          ]),
        )
        .occurredHoursAgo(random.int(1, 720)) // Last month
        .build();

      this.scenario.auditLogs.push(auditLog);
    }
    return this;
  }

  // Build the complete scenario
  build() {
    return {
      users: this.scenario.users,
      households: this.scenario.households.map((h) => h.household),
      memberships: this.scenario.households.flatMap((h) => h.memberships),
      animals: this.scenario.animals,
      medications: this.scenario.medications,
      regimens: this.scenario.regimens,
      administrations: this.scenario.administrations,
      inventory: this.scenario.inventory,
      notifications: this.scenario.notifications,
      auditLogs: this.scenario.auditLogs,
    };
  }
}

// Compliance test data builder - generates realistic medication adherence patterns
export class ComplianceDataBuilder {
  private data: {
    regimen: NewRegimen;
    administrations: NewAdministration[];
  } = {
    regimen: createRegimen(),
    administrations: [],
  };

  static create(): ComplianceDataBuilder {
    return new ComplianceDataBuilder();
  }

  forRegimen(regimen: NewRegimen): ComplianceDataBuilder {
    this.data.regimen = regimen;
    return this;
  }

  withRealisticPattern(days = 30): ComplianceDataBuilder {
    const startDate = new Date(this.data.regimen.startDate!);
    const endDate = new Date(
      Math.min(
        startDate.getTime() + days * 24 * 60 * 60 * 1000,
        this.data.regimen.endDate
          ? new Date(this.data.regimen.endDate).getTime()
          : Date.now(),
      ),
    );

    // Generate administrations with realistic compliance patterns
    const currentDate = new Date(startDate);
    let complianceRate = 0.85; // Start with 85% compliance

    while (currentDate <= endDate) {
      const times = this.data.regimen.timesLocal || ["08:00", "20:00"];

      for (const timeStr of times) {
        const [hours, minutes] = timeStr.split(":").map(Number);
        const scheduledTime = new Date(currentDate);
        scheduledTime.setHours(hours, minutes, 0, 0);

        if (scheduledTime <= endDate && random.float(0, 1) < complianceRate) {
          // Determine status based on realistic probabilities
          let status: "ON_TIME" | "LATE" | "VERY_LATE" | "MISSED";
          const rand = random.float(0, 1);

          if (rand < 0.75) status = "ON_TIME";
          else if (rand < 0.9) status = "LATE";
          else if (rand < 0.98) status = "VERY_LATE";
          else status = "MISSED";

          const administration = AdministrationBuilder.create()
            .forRegimen(this.data.regimen.id!)
            .forAnimal(this.data.regimen.animalId!)
            .scheduledFor(scheduledTime)
            .withStatus(status)
            .build();

          this.data.administrations.push(administration);
        }

        // Gradually decline compliance over time (realistic pattern)
        complianceRate = Math.max(0.6, complianceRate - 0.001);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return this;
  }

  withPerfectCompliance(days = 14): ComplianceDataBuilder {
    // Generate perfect compliance for testing
    const startDate = new Date(this.data.regimen.startDate!);
    const currentDate = new Date(startDate);

    for (let day = 0; day < days; day++) {
      const times = this.data.regimen.timesLocal || ["08:00", "20:00"];

      for (const timeStr of times) {
        const [hours, minutes] = timeStr.split(":").map(Number);
        const scheduledTime = new Date(currentDate);
        scheduledTime.setHours(hours, minutes, 0, 0);

        const administration = AdministrationBuilder.create()
          .forRegimen(this.data.regimen.id!)
          .forAnimal(this.data.regimen.animalId!)
          .scheduledFor(scheduledTime)
          .withStatus("ON_TIME")
          .build();

        this.data.administrations.push(administration);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return this;
  }

  withPoorCompliance(days = 21): ComplianceDataBuilder {
    // Generate poor compliance pattern for testing
    const startDate = new Date(this.data.regimen.startDate!);
    const currentDate = new Date(startDate);

    for (let day = 0; day < days; day++) {
      const times = this.data.regimen.timesLocal || ["08:00", "20:00"];

      for (const timeStr of times) {
        const [hours, minutes] = timeStr.split(":").map(Number);
        const scheduledTime = new Date(currentDate);
        scheduledTime.setHours(hours, minutes, 0, 0);

        // 40% chance of any administration
        if (random.boolean(0.4)) {
          const status = random.weightedArrayElement([
            { weight: 20, value: "ON_TIME" as const },
            { weight: 30, value: "LATE" as const },
            { weight: 30, value: "VERY_LATE" as const },
            { weight: 20, value: "MISSED" as const },
          ]);

          const administration = AdministrationBuilder.create()
            .forRegimen(this.data.regimen.id!)
            .forAnimal(this.data.regimen.animalId!)
            .scheduledFor(scheduledTime)
            .withStatus(status)
            .build();

          this.data.administrations.push(administration);
        }
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return this;
  }

  build() {
    return this.data;
  }
}
