import { neon } from "@neondatabase/serverless";
import { loadEnvConfig } from "@next/env";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "@/db/schema";
import {
  administrations,
  animals,
  households,
  inventoryItems,
  medicationCatalog,
  memberships,
  regimens,
  users,
} from "@/db/schema";

// Load environment variables using Next.js env loader
const projectDir = process.cwd();
loadEnvConfig(projectDir);

// Use unpooled connection for seeding
if (!process.env.DATABASE_URL_UNPOOLED) {
  throw new Error("DATABASE_URL_UNPOOLED environment variable is not set");
}
const sql = neon(process.env.DATABASE_URL_UNPOOLED);
const db = drizzle(sql, { schema });

// Helper types
type User = typeof users.$inferSelect;
type Household = typeof households.$inferSelect;
type Animal = typeof animals.$inferSelect;
type Medication = typeof medicationCatalog.$inferSelect;
type Regimen = typeof regimens.$inferSelect;
type InventoryItem = typeof inventoryItems.$inferSelect;

async function clearExistingData() {
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
}

async function createUsers(): Promise<User[]> {
  console.log("Creating users...");
  const userData: (typeof users.$inferInsert)[] = [
    {
      email: "sarah.johnson@gmail.com",
      name: "Sarah Johnson",
      emailVerified: "2024-01-15T10:30:00Z",
    },
    {
      email: "michael.chen@outlook.com",
      name: "Michael Chen",
      emailVerified: "2024-02-20T14:45:00Z",
    },
    {
      email: "dr.emma.wilson@vetclinic.com",
      name: "Dr. Emma Wilson, DVM",
      emailVerified: "2023-11-10T09:00:00Z",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=emma",
    },
    {
      email: "james.martinez@gmail.com",
      name: "James Martinez",
      emailVerified: "2024-03-05T16:20:00Z",
    },
    {
      email: "lisa.thompson@yahoo.com",
      name: "Lisa Thompson",
      emailVerified: "2024-04-12T11:15:00Z",
    },
  ];
  return await db.insert(users).values(userData).returning();
}

async function createHouseholds(): Promise<Household[]> {
  console.log("Creating households...");
  const householdData: (typeof households.$inferInsert)[] = [
    {
      name: "Johnson Family",
      timezone: "America/New_York",
    },
    {
      name: "Chen-Martinez Household",
      timezone: "America/Los_Angeles",
    },
    {
      name: "Happy Paws Foster Home",
      timezone: "America/Chicago",
    },
  ];
  return await db.insert(households).values(householdData).returning();
}

async function createMemberships(
  usersData: User[],
  householdsData: Household[],
) {
  console.log("Creating memberships...");
  if (usersData.length < 5 || householdsData.length < 3) {
    throw new Error("Not enough users or households created");
  }
  const user1 = usersData[0];
  const user2 = usersData[1];
  const user3 = usersData[2];
  const user4 = usersData[3];
  const user5 = usersData[4];
  const household1 = householdsData[0];
  const household2 = householdsData[1];
  const household3 = householdsData[2];

  if (!user1 || !user2 || !user3 || !user4 || !user5) {
    throw new Error("Failed to create required users");
  }
  if (!household1 || !household2 || !household3) {
    throw new Error("Failed to create required households");
  }

  const membershipData: (typeof memberships.$inferInsert)[] = [
    // Johnson Family
    {
      userId: user1.id,
      householdId: household1.id,
      role: "OWNER",
    },
    {
      userId: user3.id, // Vet
      householdId: household1.id,
      role: "VETREADONLY",
    },
    // Chen-Martinez Household
    {
      userId: user2.id,
      householdId: household2.id,
      role: "OWNER",
    },
    {
      userId: user4.id,
      householdId: household2.id,
      role: "OWNER", // Both are owners
    },
    // Foster Home
    {
      userId: user5.id,
      householdId: household3.id,
      role: "OWNER",
    },
    {
      userId: user1.id, // Sarah helps at foster
      householdId: household3.id,
      role: "CAREGIVER",
    },
    {
      userId: user3.id, // Vet access
      householdId: household3.id,
      role: "VETREADONLY",
    },
  ];
  await db.insert(memberships).values(membershipData);
}

async function createAnimals(householdsData: Household[]): Promise<Animal[]> {
  console.log("Creating animals...");
  if (householdsData.length < 3) {
    throw new Error("Not enough households created");
  }
  const household1 = householdsData[0];
  const household2 = householdsData[1];
  const household3 = householdsData[2];

  if (!household1 || !household2 || !household3) {
    throw new Error("Failed to access required households");
  }

  const animalData: (typeof animals.$inferInsert)[] = [
    // Johnson Family pets
    {
      householdId: household1.id,
      name: "Bailey",
      species: "Dog",
      breed: "Golden Retriever",
      sex: "Male",
      neutered: true,
      dob: "2018-03-15",
      weightKg: "34.2",
      microchipId: "985141405672314",
      color: "Golden",
      timezone: "America/New_York",
      vetName: "Dr. Emma Wilson",
      vetPhone: "(555) 123-4567",
      vetEmail: "dr.emma.wilson@vetclinic.com",
      clinicName: "Riverside Veterinary Clinic",
      allergies: ["chicken", "corn"],
      conditions: ["hip dysplasia", "seasonal allergies"],
      notes: "Very friendly, loves swimming. Needs joint supplements.",
    },
    {
      householdId: household1.id,
      name: "Mittens",
      species: "Cat",
      breed: "Domestic Shorthair",
      sex: "Female",
      neutered: true,
      dob: "2020-06-22",
      weightKg: "4.8",
      microchipId: "900215001234567",
      color: "Orange tabby",
      timezone: "America/New_York",
      vetName: "Dr. Emma Wilson",
      vetPhone: "(555) 123-4567",
      vetEmail: "dr.emma.wilson@vetclinic.com",
      clinicName: "Riverside Veterinary Clinic",
      conditions: ["diabetes mellitus", "overweight"],
      notes:
        "Indoor only. Requires insulin twice daily. On weight management diet.",
    },
    // Chen-Martinez pets
    {
      householdId: household2.id,
      name: "Luna",
      species: "Dog",
      breed: "Siberian Husky",
      sex: "Female",
      neutered: true,
      dob: "2019-11-08",
      weightKg: "22.3",
      microchipId: "900164001789456",
      color: "Gray and white",
      timezone: "America/Los_Angeles",
      vetName: "Dr. Robert Kim",
      vetPhone: "(555) 987-6543",
      vetEmail: "contact@pacificvet.com",
      clinicName: "Pacific Coast Animal Hospital",
      conditions: ["epilepsy"],
      notes:
        "Seizure disorder controlled with medication. Last seizure: 3 months ago.",
    },
    {
      householdId: household2.id,
      name: "Shadow",
      species: "Cat",
      breed: "Russian Blue",
      sex: "Male",
      neutered: true,
      dob: "2021-04-10",
      weightKg: "5.1",
      microchipId: "900215001987654",
      color: "Gray",
      timezone: "America/Los_Angeles",
      vetName: "Dr. Robert Kim",
      vetPhone: "(555) 987-6543",
      conditions: ["feline asthma"],
      notes: "Uses inhaler for asthma. Sensitive to dust and strong scents.",
    },
    // Foster animals
    {
      householdId: household3.id,
      name: "Rex",
      species: "Dog",
      breed: "German Shepherd mix",
      sex: "Male",
      neutered: true,
      dob: "2020-09-01", // Estimated
      weightKg: "28.7",
      color: "Black and tan",
      timezone: "America/Chicago",
      vetName: "Dr. Emma Wilson",
      vetPhone: "(555) 123-4567",
      conditions: ["recovering from surgery", "anxiety"],
      notes:
        "Rescued 2 months ago. Had ACL repair surgery. Needs restricted activity for 2 more weeks. Anxious around strangers.",
    },
    {
      householdId: household3.id,
      name: "Whiskers",
      species: "Cat",
      breed: "Maine Coon mix",
      sex: "Female",
      neutered: false, // Scheduled
      dob: "2023-10-15", // Estimated
      weightKg: "3.2",
      color: "Brown tabby with white",
      timezone: "America/Chicago",
      vetName: "Dr. Emma Wilson",
      vetPhone: "(555) 123-4567",
      notes:
        "Found as stray. Very sweet but shy. Spay surgery scheduled for next week. FIV/FeLV negative.",
    },
  ];
  return await db.insert(animals).values(animalData).returning();
}

async function createMedications(): Promise<Medication[]> {
  console.log("Creating medication catalog...");
  const medicationData: (typeof medicationCatalog.$inferInsert)[] = [
    // Pain/Anti-inflammatory
    {
      genericName: "Carprofen",
      brandName: "Rimadyl",
      strength: "75mg",
      route: "ORAL",
      form: "TABLET",
      controlledSubstance: false,
      commonDosing: "2.2 mg/kg PO BID or 4.4 mg/kg PO SID",
      warnings:
        "Monitor liver and kidney function. Do not use with other NSAIDs or corticosteroids.",
    },
    {
      genericName: "Meloxicam",
      brandName: "Metacam",
      strength: "1.5mg/mL",
      route: "ORAL",
      form: "LIQUID",
      controlledSubstance: false,
      commonDosing: "Dogs: 0.2 mg/kg PO on day 1, then 0.1 mg/kg SID",
      warnings:
        "Use with extreme caution in cats. Not for cats with kidney disease.",
    },
    {
      genericName: "Gabapentin",
      brandName: "Neurontin",
      strength: "100mg",
      route: "ORAL",
      form: "CAPSULE",
      controlledSubstance: false,
      commonDosing: "Dogs: 10-20 mg/kg PO BID-TID. Cats: 5-10 mg/kg PO BID-TID",
      warnings: "May cause sedation. Taper dose when discontinuing.",
    },
    {
      genericName: "Tramadol",
      brandName: "Ultram",
      strength: "50mg",
      route: "ORAL",
      form: "TABLET",
      controlledSubstance: true,
      commonDosing: "Dogs: 2-5 mg/kg PO BID-QID. Cats: 2-4 mg/kg PO BID",
      warnings:
        "Controlled substance. May cause sedation. Do not use with SSRIs or MAOIs.",
    },
    // Diabetes
    {
      genericName: "Insulin glargine",
      brandName: "Lantus",
      strength: "100 units/mL",
      route: "SC",
      form: "INJECTION",
      controlledSubstance: false,
      commonDosing: "Cats: 0.25-0.5 U/kg SC BID. Dogs: 0.25-0.5 U/kg SC BID",
      warnings: "Refrigerate. Monitor blood glucose. Never shake vial.",
    },
    // Epilepsy
    {
      genericName: "Phenobarbital",
      brandName: "Luminal",
      strength: "30mg",
      route: "ORAL",
      form: "TABLET",
      controlledSubstance: true,
      commonDosing: "Dogs & Cats: 2-3 mg/kg PO BID",
      warnings:
        "Controlled substance. Monitor liver function. Check serum levels.",
    },
    {
      genericName: "Levetiracetam",
      brandName: "Keppra",
      strength: "500mg",
      route: "ORAL",
      form: "TABLET",
      controlledSubstance: false,
      commonDosing: "20 mg/kg PO TID",
      warnings: "Well-tolerated. May need dose adjustment with phenobarbital.",
    },
    // Antibiotics
    {
      genericName: "Amoxicillin/Clavulanate",
      brandName: "Clavamox",
      strength: "250mg",
      route: "ORAL",
      form: "TABLET",
      controlledSubstance: false,
      commonDosing: "12.5-25 mg/kg PO BID",
      warnings: "Give with food. Complete full course. May cause GI upset.",
    },
    {
      genericName: "Cephalexin",
      brandName: "Keflex",
      strength: "250mg",
      route: "ORAL",
      form: "CAPSULE",
      controlledSubstance: false,
      commonDosing: "22-30 mg/kg PO BID",
      warnings: "May cause GI upset. Use with caution in penicillin allergy.",
    },
    // Respiratory
    {
      genericName: "Fluticasone propionate",
      brandName: "Flovent HFA",
      strength: "110mcg",
      route: "INHALED",
      form: "SPRAY",
      controlledSubstance: false,
      commonDosing: "Cats: 1-2 puffs BID via spacer",
      warnings: "Rinse mouth after use in dogs. Use with spacer device.",
    },
    // Anxiety
    {
      genericName: "Trazodone",
      brandName: "Desyrel",
      strength: "100mg",
      route: "ORAL",
      form: "TABLET",
      controlledSubstance: false,
      commonDosing: "Dogs: 2-5 mg/kg PO PRN or BID",
      warnings:
        "May cause sedation. Can be used with other behavior medications.",
    },
    // Joint supplement
    {
      genericName: "Glucosamine/Chondroitin",
      brandName: "Dasuquin",
      strength: "600mg/300mg",
      route: "ORAL",
      form: "TABLET",
      controlledSubstance: false,
      commonDosing: "Large dogs: 2 tabs daily. Medium dogs: 1 tab daily",
      warnings: "Nutritional supplement. May take 4-6 weeks to see effects.",
    },
  ];
  return await db.insert(medicationCatalog).values(medicationData).returning();
}

async function createRegimens(
  animalsData: Animal[],
  medications: Medication[],
): Promise<Regimen[]> {
  console.log("Creating regimens...");
  if (animalsData.length < 5 || medications.length < 11) {
    throw new Error("Not enough animals or medications created");
  }

  const regimenData: (typeof regimens.$inferInsert)[] = [
    // Bailey - Arthritis
    {
      animalId:
        animalsData[0]?.id ??
        (() => {
          throw new Error("Bailey animal not found");
        })(),
      medicationId:
        medications[0]?.id ??
        (() => {
          throw new Error("Rimadyl medication not found");
        })(), // Rimadyl
      name: "Arthritis Management - Bailey",
      instructions:
        "Give with food to prevent stomach upset. Monitor for decreased appetite or vomiting.",
      scheduleType: "FIXED",
      timesLocal: ["08:00", "20:00"],
      startDate: "2024-01-01",
      dose: "75mg (1 tablet)",
      route: "By mouth",
      highRisk: false,
      requiresCoSign: false,
    },
    // Mittens - Diabetes
    {
      animalId:
        animalsData[1]?.id ??
        (() => {
          throw new Error("Mittens animal not found");
        })(),
      medicationId:
        medications[4]?.id ??
        (() => {
          throw new Error("Lantus medication not found");
        })(), // Lantus
      name: "Diabetes Control - Mittens",
      instructions:
        "Give 30 minutes after meals. Check blood glucose before if acting unusual. Target BG: 80-150.",
      scheduleType: "FIXED",
      timesLocal: ["07:00", "19:00"],
      startDate: "2023-06-15",
      dose: "2 units",
      route: "Under the skin (rotate injection sites)",
      highRisk: true,
      requiresCoSign: false,
      cutoffMinutes: 120, // 2 hour window for insulin
    },
    // Luna - Epilepsy
    {
      animalId:
        animalsData[2]?.id ??
        (() => {
          throw new Error("Luna animal not found");
        })(),
      medicationId:
        medications[6]?.id ??
        (() => {
          throw new Error("Keppra medication not found");
        })(), // Keppra
      name: "Seizure Control - Luna",
      instructions:
        "DO NOT MISS DOSES. Give exactly every 8 hours. If seizure occurs, give extra dose and call vet.",
      scheduleType: "FIXED",
      timesLocal: ["06:00", "14:00", "22:00"],
      startDate: "2023-09-01",
      dose: "500mg (1 tablet)",
      route: "By mouth",
      highRisk: true,
      requiresCoSign: false,
      cutoffMinutes: 60, // 1 hour window for anti-seizure meds
    },
    // Shadow - Asthma
    {
      animalId:
        animalsData[3]?.id ??
        (() => {
          throw new Error("Shadow animal not found");
        })(),
      medicationId:
        medications[9]?.id ??
        (() => {
          throw new Error("Flovent medication not found");
        })(), // Flovent
      name: "Asthma Control - Shadow",
      instructions:
        "Use with AeroKat chamber. Hold mask on face for 7-10 breaths. Wait 30 seconds between puffs.",
      scheduleType: "FIXED",
      timesLocal: ["08:00", "20:00"],
      startDate: "2024-02-01",
      dose: "2 puffs",
      route: "Inhaled via spacer",
      highRisk: false,
      requiresCoSign: false,
    },
    // Rex - Post-surgery pain
    {
      animalId:
        animalsData[4]?.id ??
        (() => {
          throw new Error("Rex animal not found");
        })(),
      medicationId:
        medications[2]?.id ??
        (() => {
          throw new Error("Gabapentin medication not found");
        })(), // Gabapentin
      name: "Post-Op Pain Management - Rex",
      instructions:
        "For surgical pain. May cause mild sedation. Can give with or without food.",
      scheduleType: "FIXED",
      timesLocal: ["08:00", "16:00", "23:00"],
      startDate: "2025-07-15",
      endDate: "2025-08-15", // 1 month course
      dose: "300mg (3 x 100mg capsules)",
      route: "By mouth",
      highRisk: false,
      requiresCoSign: false,
    },
    // Rex - Anxiety PRN
    {
      animalId:
        animalsData[4]?.id ??
        (() => {
          throw new Error("Rex animal not found for anxiety regimen");
        })(),
      medicationId:
        medications[10]?.id ??
        (() => {
          throw new Error("Trazodone medication not found");
        })(), // Trazodone
      name: "Anxiety Management - Rex",
      instructions:
        "Give 60-90 minutes before stressful events. Can cause drowsiness. Do not exceed 3 doses in 24 hours.",
      scheduleType: "PRN",
      startDate: "2025-07-01",
      prnReason: "anxiety, storms, vet visits",
      maxDailyDoses: 3,
      dose: "150mg (1.5 tablets)",
      route: "By mouth",
      highRisk: false,
      requiresCoSign: false,
    },
  ];
  return await db.insert(regimens).values(regimenData).returning();
}

// Helper function to get medication ID safely
function getMedicationId(
  medications: Medication[],
  index: number,
  name: string,
): string {
  const medication = medications[index];
  if (!medication) {
    throw new Error(`${name} medication not found for inventory`);
  }
  return medication.id;
}

// Helper function to get animal ID safely
function getAnimalId(
  animalsData: Animal[],
  index: number,
  name: string,
): string {
  const animal = animalsData[index];
  if (!animal) {
    throw new Error(`${name} animal not found for inventory`);
  }
  return animal.id;
}

// Helper function to create household inventory items
function createHousehold1Inventory(
  householdId: string,
  animalsData: Animal[],
  medications: Medication[],
): (typeof inventoryItems.$inferInsert)[] {
  return [
    // Active medications
    {
      householdId,
      medicationId: getMedicationId(medications, 0, "Rimadyl"), // Rimadyl
      assignedAnimalId: getAnimalId(animalsData, 0, "Bailey"),
      brandOverride: "Rimadyl",
      concentration: "75mg",
      lot: "RIM2024B127",
      expiresOn: "2026-03-31",
      storage: "ROOM",
      quantityUnits: 60,
      unitsRemaining: 42,
      unitType: "tablets",
      openedOn: "2025-07-01",
      inUse: true,
      purchaseDate: "2025-06-28",
      purchasePrice: "89.99",
      supplier: "Chewy Pharmacy",
      notes: "Chewable tablets - Bailey loves these",
    },
    {
      householdId,
      medicationId: getMedicationId(medications, 4, "Lantus"), // Lantus
      assignedAnimalId: getAnimalId(animalsData, 1, "Mittens"),
      brandOverride: "Lantus SoloStar",
      concentration: "100 units/mL",
      lot: "LAN523K9",
      expiresOn: "2025-12-31",
      storage: "FRIDGE",
      quantityUnits: 3,
      unitsRemaining: 2,
      unitType: "mL",
      openedOn: "2025-07-10",
      inUse: true,
      purchaseDate: "2025-07-05",
      purchasePrice: "125.0",
      supplier: "Riverside Veterinary Clinic",
      notes: "Keep refrigerated! Currently using pen #1",
    },
    // Backup insulin
    {
      householdId,
      medicationId: getMedicationId(medications, 4, "Lantus backup"), // Lantus
      assignedAnimalId: getAnimalId(animalsData, 1, "Mittens backup"),
      brandOverride: "Lantus",
      concentration: "100 units/mL",
      lot: "LAN524A2",
      expiresOn: "2026-06-30",
      storage: "FRIDGE",
      quantityUnits: 10,
      unitsRemaining: 10,
      unitType: "mL",
      inUse: false,
      purchaseDate: "2025-07-20",
      purchasePrice: "285.0",
      supplier: "Costco Pharmacy",
      notes: "Backup vial - DO NOT OPEN until current pen is empty",
    },
  ];
}

function createHousehold2Inventory(
  householdId: string,
  animalsData: Animal[],
  medications: Medication[],
): (typeof inventoryItems.$inferInsert)[] {
  return [
    {
      householdId,
      medicationId: getMedicationId(medications, 6, "Keppra"), // Keppra
      assignedAnimalId: getAnimalId(animalsData, 2, "Luna"),
      concentration: "500mg",
      lot: "LEV2025X44",
      expiresOn: "2027-01-31",
      storage: "ROOM",
      quantityUnits: 180,
      unitsRemaining: 156,
      unitType: "tablets",
      openedOn: "2025-07-15",
      inUse: true,
      purchaseDate: "2025-07-10",
      purchasePrice: "64.99",
      supplier: "VetRxDirect",
      notes: "Generic levetiracetam - works just as well as brand",
    },
    {
      householdId,
      medicationId: getMedicationId(medications, 9, "Flovent"), // Flovent
      assignedAnimalId: getAnimalId(animalsData, 3, "Shadow"),
      brandOverride: "Flovent HFA",
      concentration: "110mcg",
      lot: "FLV9876",
      expiresOn: "2026-09-30",
      storage: "ROOM",
      quantityUnits: 120,
      unitsRemaining: 98,
      unitType: "puffs",
      openedOn: "2025-07-01",
      inUse: true,
      purchaseDate: "2025-06-25",
      purchasePrice: "195.0",
      supplier: "Canada Pharmacy",
      notes: "Keep at room temp. Prime if not used for 7 days",
    },
  ];
}

function createHousehold3Inventory(
  householdId: string,
  animalsData: Animal[],
  medications: Medication[],
): (typeof inventoryItems.$inferInsert)[] {
  return [
    {
      householdId,
      medicationId: getMedicationId(medications, 2, "Gabapentin"), // Gabapentin
      assignedAnimalId: getAnimalId(animalsData, 4, "Rex gabapentin"),
      concentration: "100mg",
      lot: "GAB2025M88",
      expiresOn: "2027-05-31",
      storage: "ROOM",
      quantityUnits: 90,
      unitsRemaining: 75,
      unitType: "capsules",
      openedOn: "2025-07-15",
      inUse: true,
      purchaseDate: "2025-07-14",
      purchasePrice: "28.99",
      supplier: "Riverside Veterinary Clinic",
    },
    {
      householdId,
      medicationId: getMedicationId(medications, 10, "Trazodone"), // Trazodone
      concentration: "100mg",
      lot: "TRZ445B",
      expiresOn: "2026-11-30",
      storage: "ROOM",
      quantityUnits: 30,
      unitsRemaining: 27,
      unitType: "tablets",
      openedOn: "2025-07-01",
      inUse: true,
      barcode: "365825991234",
      purchaseDate: "2025-06-30",
      purchasePrice: "18.5",
      supplier: "Riverside Veterinary Clinic",
      notes: "Score tablets carefully if giving 1.5 tabs",
    },
    // Extra item for general use
    {
      householdId,
      medicationId: getMedicationId(medications, 7, "Clavamox"), // Clavamox
      concentration: "250mg",
      lot: "CLV2025Z1",
      expiresOn: "2026-02-28",
      storage: "ROOM",
      quantityUnits: 14,
      unitsRemaining: 14,
      unitType: "tablets",
      inUse: false,
      purchaseDate: "2025-07-20",
      purchasePrice: "32.99",
      supplier: "PetMeds",
      notes: "For emergencies - check with vet before using",
    },
  ];
}

async function createInventory(
  householdsData: Household[],
  animalsData: Animal[],
  medications: Medication[],
): Promise<InventoryItem[]> {
  console.log("Creating inventory items...");
  if (
    householdsData.length < 3 ||
    animalsData.length < 5 ||
    medications.length < 11
  ) {
    throw new Error("Not enough households, animals, or medications created");
  }
  const household1 = householdsData[0];
  const household2 = householdsData[1];
  const household3 = householdsData[2];

  if (!household1 || !household2 || !household3) {
    throw new Error("Failed to access required households for inventory");
  }

  const inventoryItemData: (typeof inventoryItems.$inferInsert)[] = [
    ...createHousehold1Inventory(household1.id, animalsData, medications),
    ...createHousehold2Inventory(household2.id, animalsData, medications),
    ...createHousehold3Inventory(household3.id, animalsData, medications),
  ];
  return await db.insert(inventoryItems).values(inventoryItemData).returning();
}

// Helper to create administration records
function createAdministration(
  regimenId: string,
  animalId: string,
  householdId: string,
  caregiverId: string,
  scheduledFor: Date,
  recordedAt: Date,
  status: "ON_TIME" | "LATE" | "VERY_LATE" | "MISSED" | "PRN",
  sourceItemId: string | null,
  dose: string,
  notes?: string,
  site?: string,
): typeof administrations.$inferInsert {
  const scheduledDay = scheduledFor.toISOString().split("T")[0];
  const timeIndex =
    scheduledFor.getHours() < 12 ? 0 : scheduledFor.getHours() < 18 ? 1 : 2;
  return {
    regimenId,
    animalId,
    householdId,
    caregiverId,
    scheduledFor: scheduledFor.toISOString(),
    recordedAt: recordedAt.toISOString(),
    status,
    sourceItemId,
    dose,
    notes,
    site,
    idempotencyKey: `${animalId}:${regimenId}:${scheduledDay}:${timeIndex}`,
  };
}

// Helper functions for creating administration records by animal
async function createBaileyAdministrations(
  now: Date,
  baileyRimadyl: Regimen,
  animalsData: Animal[],
  household1: Household,
  user1: User,
  inventoryData: InventoryItem[],
): Promise<(typeof administrations.$inferInsert)[]> {
  const adminRecords: (typeof administrations.$inferInsert)[] = [];
  const bailey = animalsData[0];
  const baileyInventory = inventoryData[0];

  if (!bailey || !baileyInventory) {
    console.warn("Bailey or inventory not found");
    return adminRecords;
  }

  for (let days = 3; days >= 0; days--) {
    for (const hour of [8, 20]) {
      const scheduled = new Date(now);
      scheduled.setDate(scheduled.getDate() - days);
      scheduled.setHours(hour, 0, 0, 0);

      if (scheduled <= now) {
        const recorded = new Date(scheduled);
        recorded.setMinutes(Math.floor(Math.random() * 30));

        adminRecords.push(
          createAdministration(
            baileyRimadyl.id,
            bailey.id,
            household1.id,
            user1.id,
            scheduled,
            recorded,
            "ON_TIME",
            baileyInventory.id,
            "75mg (1 tablet)",
            hour === 8 ? "Given with breakfast" : "Given with dinner",
          ),
        );
      }
    }
  }
  return adminRecords;
}

function createSingleInsulinAdmin(
  mittensInsulin: Regimen,
  mittens: Animal,
  household1: Household,
  caregiver: string,
  scheduled: Date,
  hour: number,
  inventoryItem: InventoryItem,
  site: string,
) {
  const recorded = new Date(scheduled);
  const isLateEvening = hour === 19 && Math.random() < 0.2;
  const status = isLateEvening ? "LATE" : "ON_TIME";
  const delay = isLateEvening
    ? 65 + Math.floor(Math.random() * 30)
    : Math.floor(Math.random() * 20);
  const bgMin = isLateEvening ? 120 : 100;
  const bgMax = isLateEvening ? 80 : 60;

  recorded.setMinutes(delay);
  return createAdministration(
    mittensInsulin.id,
    mittens.id,
    household1.id,
    caregiver,
    scheduled,
    recorded,
    status,
    inventoryItem.id,
    "2 units",
    `BG before: ${bgMin + Math.floor(Math.random() * bgMax)}`,
    site,
  );
}

async function createMittensAdministrations(
  now: Date,
  mittensInsulin: Regimen,
  animalsData: Animal[],
  household1: Household,
  user1: User,
  user2: User,
  inventoryData: InventoryItem[],
): Promise<(typeof administrations.$inferInsert)[]> {
  const adminRecords: (typeof administrations.$inferInsert)[] = [];
  const sites = ["left shoulder", "right shoulder", "left hip", "right hip"];
  const mittens = animalsData[1];
  const mittensInventory = inventoryData[1];

  if (!mittens || !mittensInventory) {
    console.warn("Mittens or inventory not found");
    return adminRecords;
  }

  for (let days = 7; days >= 0; days--) {
    for (const hour of [7, 19]) {
      const scheduled = new Date(now);
      scheduled.setDate(scheduled.getDate() - days);
      scheduled.setHours(hour, 0, 0, 0);

      if (scheduled <= now) {
        const caregiver = days % 2 === 0 ? user1.id : user2.id;
        adminRecords.push(
          createSingleInsulinAdmin(
            mittensInsulin,
            mittens,
            household1,
            caregiver,
            scheduled,
            hour,
            mittensInventory,
            sites[days % 4] || "left shoulder",
          ),
        );
      }
    }
  }
  return adminRecords;
}

// Helper function to create a single administration record for Luna
function createLunaAdministrationRecord(
  hour: number,
  days: number,
  now: Date,
  lunaKeppra: Regimen,
  luna: Animal,
  household2: Household,
  user2: User,
  user4: User,
  lunaInventory: InventoryItem,
): typeof administrations.$inferInsert | null {
  const scheduled = new Date(now);
  scheduled.setDate(scheduled.getDate() - days);
  scheduled.setHours(hour, 0, 0, 0);

  if (scheduled > now) {
    return null;
  }

  const recorded = new Date(scheduled);
  recorded.setMinutes(Math.floor(Math.random() * 15));

  return createAdministration(
    lunaKeppra.id,
    luna.id,
    household2.id,
    hour === 6 ? user4.id : user2.id,
    scheduled,
    recorded,
    "ON_TIME",
    lunaInventory.id,
    "500mg (1 tablet)",
    hour === 22 ? "Bedtime dose" : undefined,
  );
}

async function createLunaAdministrations(
  now: Date,
  lunaKeppra: Regimen,
  animalsData: Animal[],
  household2: Household,
  user2: User,
  user4: User,
  inventoryData: InventoryItem[],
): Promise<(typeof administrations.$inferInsert)[]> {
  const adminRecords: (typeof administrations.$inferInsert)[] = [];
  const luna = animalsData[2];
  const lunaInventory = inventoryData[3];

  if (!luna || !lunaInventory) {
    console.warn("Luna or inventory not found");
    return adminRecords;
  }

  const hours = [6, 14, 22];

  for (let days = 5; days >= 0; days--) {
    for (const hour of hours) {
      const record = createLunaAdministrationRecord(
        hour,
        days,
        now,
        lunaKeppra,
        luna,
        household2,
        user2,
        user4,
        lunaInventory,
      );

      if (record) {
        adminRecords.push(record);
      }
    }
  }

  return adminRecords;
}

async function createRexAdministrations(
  now: Date,
  rexGabapentin: Regimen,
  rexTrazodone: Regimen,
  animalsData: Animal[],
  household3: Household,
  user5: User,
  inventoryData: InventoryItem[],
): Promise<(typeof administrations.$inferInsert)[]> {
  const adminRecords: (typeof administrations.$inferInsert)[] = [];
  const rex = animalsData[4];
  const rexGabInventory = inventoryData[5];
  const rexTrazInventory = inventoryData[6];

  if (!rex || !rexGabInventory || !rexTrazInventory) {
    console.warn("Rex or inventory not found");
    return adminRecords;
  }

  // Gabapentin administrations
  const rexStartDate = new Date(now);
  rexStartDate.setDate(rexStartDate.getDate() - 2);

  for (let days = 2; days >= 0; days--) {
    for (const hour of [8, 16, 23]) {
      const scheduled = new Date(now);
      scheduled.setDate(scheduled.getDate() - days);
      scheduled.setHours(hour, 0, 0, 0);

      if (scheduled <= now && scheduled >= rexStartDate) {
        const recorded = new Date(scheduled);
        recorded.setMinutes(Math.floor(Math.random() * 45));

        adminRecords.push(
          createAdministration(
            rexGabapentin.id,
            rex.id,
            household3.id,
            user5.id,
            scheduled,
            recorded,
            recorded.getTime() - scheduled.getTime() > 3600000
              ? "LATE"
              : "ON_TIME",
            rexGabInventory.id,
            "300mg (3 capsules)",
            "Hidden in peanut butter",
          ),
        );
      }
    }
  }

  // PRN Trazodone for thunderstorm
  const stormTime = new Date(now);
  stormTime.setDate(stormTime.getDate() - 1);
  stormTime.setHours(15, 30, 0, 0);
  adminRecords.push(
    createAdministration(
      rexTrazodone.id,
      rex.id,
      household3.id,
      user5.id,
      stormTime,
      stormTime,
      "PRN",
      rexTrazInventory.id,
      "150mg (1.5 tablets)",
      "Thunderstorm anxiety - hiding and panting. Calmed down after 90 minutes.",
    ),
  );

  return adminRecords;
}

async function createAdministrations(
  usersData: User[],
  householdsData: Household[],
  animalsData: Animal[],
  regimensData: Regimen[],
  inventoryData: InventoryItem[],
) {
  console.log("Creating administration history...");
  const now = new Date();

  if (usersData.length < 5) {
    throw new Error("Not enough users created");
  }
  if (householdsData.length < 3) {
    throw new Error("Not enough households created");
  }
  if (regimensData.length < 6) {
    throw new Error("Not enough regimens created");
  }

  const user1 = usersData[0];
  const user2 = usersData[1];
  const _user3 = usersData[2];
  const user4 = usersData[3];
  const user5 = usersData[4];
  const household1 = householdsData[0];
  const household2 = householdsData[1];
  const household3 = householdsData[2];
  const baileyRimadyl = regimensData[0];
  const mittensInsulin = regimensData[1];
  const lunaKeppra = regimensData[2];
  const _shadowFlovent = regimensData[3];
  const rexGabapentin = regimensData[4];
  const rexTrazodone = regimensData[5];

  if (!user1 || !user2 || !user4 || !user5) {
    throw new Error("Failed to access required users for administrations");
  }
  if (!household1 || !household2 || !household3) {
    throw new Error("Failed to access required households for administrations");
  }
  if (
    !baileyRimadyl ||
    !mittensInsulin ||
    !lunaKeppra ||
    !rexGabapentin ||
    !rexTrazodone
  ) {
    throw new Error("Failed to access required regimens for administrations");
  }

  // Create administrations for each animal
  const baileyAdmins = await createBaileyAdministrations(
    now,
    baileyRimadyl,
    animalsData,
    household1,
    user1,
    inventoryData,
  );

  const mittensAdmins = await createMittensAdministrations(
    now,
    mittensInsulin,
    animalsData,
    household1,
    user1,
    user2,
    inventoryData,
  );

  const lunaAdmins = await createLunaAdministrations(
    now,
    lunaKeppra,
    animalsData,
    household2,
    user2,
    user4,
    inventoryData,
  );

  const rexAdmins = await createRexAdministrations(
    now,
    rexGabapentin,
    rexTrazodone,
    animalsData,
    household3,
    user5,
    inventoryData,
  );

  // Combine all administrations
  const administrationData = [
    ...baileyAdmins,
    ...mittensAdmins,
    ...lunaAdmins,
    ...rexAdmins,
  ];

  // Insert all administrations
  if (administrationData.length > 0) {
    await db.insert(administrations).values(administrationData);
  }

  return administrationData.length;
}

async function seed() {
  console.log("🌱 Starting database seed...");

  try {
    await clearExistingData();

    const usersData = await createUsers();
    const householdsData = await createHouseholds();
    await createMemberships(usersData, householdsData);
    const animalsData = await createAnimals(householdsData);
    const medications = await createMedications();
    const regimensData = await createRegimens(animalsData, medications);
    const inventoryData = await createInventory(
      householdsData,
      animalsData,
      medications,
    );
    const administrationCount = await createAdministrations(
      usersData,
      householdsData,
      animalsData,
      regimensData,
      inventoryData,
    );

    console.log("✅ Database seeded successfully!");
    console.log(`
Summary:
- ${usersData.length} users created (including a veterinarian)
- ${householdsData.length} households created (2 families + 1 foster home)
- ${animalsData.length} animals created (3 dogs, 2 cats, various medical conditions)
- ${medications.length} medications in catalog (comprehensive veterinary formulary)
- ${regimensData.length} active regimens (including high-risk insulin and anti-seizure meds)
- ${inventoryData.length} inventory items (active medications + backups)
- ${administrationCount} realistic administration records

Test Scenarios Available:
1. Diabetes management with insulin (Mittens)
2. Seizure control with strict timing (Luna)
3. Post-surgical pain management (Rex)
4. Chronic arthritis treatment (Bailey)
5. Asthma with inhaler (Shadow)
6. PRN anxiety medication (Rex)
7. Multi-household caregiver (Sarah)
8. Vet read-only access (Dr. Wilson)
		`);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    throw error;
  }
}

// Run the seed function
seed()
  .then(() => {
    console.log("Seed completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
