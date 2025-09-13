/**
 * Test fixtures and mock data for comprehensive testing
 */

import type { AnimalInfo, MedicationData } from "@/lib/calculators/dosage";

// Animal test fixtures
export const testAnimals = {
  healthyDog: {
    species: "dog",
    breed: "Golden Retriever",
    weight: 30,
    weightUnit: "kg" as const,
    ageYears: 5,
  } as AnimalInfo,

  healthyCat: {
    species: "cat",
    breed: "Domestic Shorthair",
    weight: 10,
    weightUnit: "lbs" as const,
    ageMonths: 18,
  } as AnimalInfo,

  borderCollie: {
    species: "dog",
    breed: "Border Collie",
    weight: 25,
    weightUnit: "kg" as const,
    ageYears: 3,
  } as AnimalInfo,

  greyhound: {
    species: "dog",
    breed: "Greyhound",
    weight: 30,
    weightUnit: "kg" as const,
    ageYears: 4,
  } as AnimalInfo,

  youngPuppy: {
    species: "dog",
    breed: "Golden Retriever",
    weight: 5,
    weightUnit: "kg" as const,
    ageMonths: 1,
  } as AnimalInfo,

  seniorDog: {
    species: "dog",
    breed: "Labrador Retriever",
    weight: 40,
    weightUnit: "lbs" as const,
    ageYears: 12,
  } as AnimalInfo,

  bird: {
    species: "bird",
    breed: "African Grey Parrot",
    weight: 0.5,
    weightUnit: "kg" as const,
    ageYears: 8,
  } as AnimalInfo,

  allergicDog: {
    species: "dog",
    breed: "German Shepherd",
    weight: 35,
    weightUnit: "kg" as const,
    ageYears: 6,
    conditions: ["penicillin allergy"],
  } as AnimalInfo,
};

// Medication test fixtures
export const testMedications = {
  amoxicillin: {
    id: "med-amoxicillin",
    genericName: "Amoxicillin",
    brandName: "Amoxil",
    category: "antibiotic",
    formulation: "TABLET",
    route: "ORAL",
    form: "TABLET",
    dosageMinMgKg: 10,
    dosageMaxMgKg: 20,
    dosageTypicalMgKg: 15,
    maxDailyDoseMg: 3000,
    concentrationMgMl: 50,
    unitsPerTablet: 250,
    unitType: "mg",
    frequencyPerDay: 2,
    duration: "7-10 days",
    species: ["dog", "cat"],
    isControlledSubstance: false,
    prescriptionRequired: true,
    typicalFrequencyHours: 12,
    maxFrequencyPerDay: 2,
    contraindications: ["penicillin allergy"],
    warnings: "May cause GI upset if not given with food",
  } as MedicationData,

  meloxicam: {
    id: "med-meloxicam",
    genericName: "Meloxicam",
    brandName: "Metacam",
    category: "nsaid",
    formulation: "LIQUID",
    route: "ORAL",
    form: "LIQUID",
    dosageMinMgKg: 0.1,
    dosageMaxMgKg: 0.2,
    dosageTypicalMgKg: 0.1,
    concentrationMgMl: 1.5,
    frequencyPerDay: 1,
    duration: "as needed",
    species: ["dog", "cat"],
    isControlledSubstance: false,
    prescriptionRequired: true,
    typicalFrequencyHours: 24,
    maxFrequencyPerDay: 1,
    speciesAdjustments: {
      cat: 0.5,
    },
    ageAdjustments: {
      geriatric: 0.8,
    },
    warnings: "Monitor for GI upset and kidney function",
  } as MedicationData,

  ivermectin: {
    id: "med-ivermectin",
    genericName: "Ivermectin",
    brandName: "Heartgard",
    category: "antiparasitic",
    formulation: "TABLET",
    route: "ORAL",
    form: "TABLET",
    dosageMinMgKg: 0.006,
    dosageMaxMgKg: 0.012,
    dosageTypicalMgKg: 0.006,
    unitsPerTablet: 68,
    unitType: "mcg",
    frequencyPerDay: 1,
    duration: "monthly",
    species: ["dog", "cat"],
    isControlledSubstance: false,
    prescriptionRequired: true,
    typicalFrequencyHours: 720, // Monthly
    maxFrequencyPerDay: 1,
    breedConsiderations: {
      collie: 0.5,
      "australian shepherd": 0.5,
      "border collie": 0.5,
    },
    warnings: "Check for MDR1 gene mutation in susceptible breeds",
  } as MedicationData,

  morphine: {
    id: "med-morphine",
    genericName: "Morphine",
    brandName: "Morphine Sulfate",
    category: "opioid",
    formulation: "INJECTION",
    route: "IV",
    form: "INJECTION",
    dosageMinMgKg: 0.1,
    dosageMaxMgKg: 0.5,
    dosageTypicalMgKg: 0.2,
    concentrationMgMl: 10,
    frequencyPerDay: 6,
    duration: "as needed",
    species: ["dog", "cat"],
    isControlledSubstance: true,
    prescriptionRequired: true,
    typicalFrequencyHours: 4,
    maxFrequencyPerDay: 6,
    routeAdjustments: {
      IV: 0.7,
      IM: 1.0,
    },
    ageAdjustments: {
      pediatric: 0.8,
      geriatric: 0.7,
    },
    warnings: "Controlled substance - monitor for respiratory depression",
  } as MedicationData,

  complexMedication: {
    id: "med-complex",
    genericName: "Complex Test Medication",
    brandName: "TestMed",
    category: "test",
    formulation: "TABLET",
    route: "ORAL",
    form: "TABLET",
    dosageMinMgKg: 5,
    dosageMaxMgKg: 15,
    dosageTypicalMgKg: 10,
    concentrationMgMl: 25,
    unitsPerTablet: 100,
    unitType: "mg",
    frequencyPerDay: 3,
    duration: "as needed",
    species: ["dog", "cat", "bird"],
    isControlledSubstance: false,
    prescriptionRequired: true,
    typicalFrequencyHours: 8,
    maxFrequencyPerDay: 3,
    speciesAdjustments: {
      cat: 0.8,
      bird: 1.2,
    },
    routeAdjustments: {
      IV: 0.6,
    },
    ageAdjustments: {
      pediatric: 0.7,
      geriatric: 0.9,
    },
    breedConsiderations: {
      greyhound: 0.8,
    },
    contraindications: ["liver disease", "kidney disease"],
    warnings: "Multiple adjustments required - calculate carefully",
  } as MedicationData,
};

// Household and user test fixtures
export const testHousehold = {
  id: "22222222-2222-4222-8222-222222222222",
  name: "Test Household",
  createdAt: new Date("2023-01-01"),
  updatedAt: new Date("2023-01-01"),
};

export const testUser = {
  id: "11111111-1111-4111-8111-111111111111",
  stackUserId: "test-stack-user",
  email: "test@example.com",
  firstName: "Test",
  lastName: "User",
  createdAt: new Date("2023-01-01"),
  updatedAt: new Date("2023-01-01"),
};

export const testMembership = {
  userId: testUser.id,
  householdId: testHousehold.id,
  role: "OWNER" as const,
  joinedAt: new Date("2023-01-01"),
  createdAt: new Date("2023-01-01"),
  updatedAt: new Date("2023-01-01"),
};

// Regimen test fixtures
export const testRegimen = {
  id: "55555555-5555-4555-8555-555555555555",
  animalId: "44444444-4444-4444-8444-444444444444",
  householdId: testHousehold.id,
  medicationId: testMedications.amoxicillin.id,
  startDate: new Date("2023-01-01"),
  endDate: new Date("2023-01-15"),
  frequency: "BID",
  dose: "250mg",
  route: "ORAL",
  instructions: "Give with food",
  isActive: true,
  createdAt: new Date("2023-01-01"),
  updatedAt: new Date("2023-01-01"),
};

// Animal test fixture for database operations
export const testAnimal = {
  id: "44444444-4444-4444-8444-444444444444",
  householdId: testHousehold.id,
  name: "Buddy",
  species: "dog",
  breed: "Golden Retriever",
  weight: 30,
  weightUnit: "kg" as const,
  dateOfBirth: new Date("2018-01-01"),
  color: "Golden",
  microchipId: "123456789012345",
  insuranceInfo: "Pet insurance co.",
  timezone: "America/New_York",
  createdAt: new Date("2023-01-01"),
  updatedAt: new Date("2023-01-01"),
};

// Administration test fixture
export const testAdministration = {
  id: "33333333-3333-4333-8333-333333333333",
  animalId: testAnimal.id,
  regimenId: testRegimen.id,
  householdId: testHousehold.id,
  caregiverId: testUser.id,
  recordedAt: new Date("2023-01-01T12:00:00Z"),
  scheduledFor: new Date("2023-01-01T12:00:00Z"),
  status: "ON_TIME" as const,
  dose: "250mg",
  site: null,
  notes: "Given with breakfast",
  adverseEvent: false,
  sourceItemId: null,
  idempotencyKey: "test-key-123",
  createdAt: new Date("2023-01-01"),
  updatedAt: new Date("2023-01-01"),
};

// Inventory test fixture
export const testInventoryItem = {
  id: "66666666-6666-4666-8666-666666666666",
  householdId: testHousehold.id,
  medicationId: testMedications.amoxicillin.id,
  lotNumber: "LOT123",
  expirationDate: new Date("2024-12-31"),
  quantityRemaining: 30,
  quantityUnit: "tablets",
  costPerUnit: 0.5,
  costCurrency: "USD",
  supplier: "Test Pharmacy",
  notes: "Keep refrigerated",
  createdAt: new Date("2023-01-01"),
  updatedAt: new Date("2023-01-01"),
};

// Test configuration options
export const testConfig = {
  // Database timeouts
  dbTimeout: 5000,

  // Test user session
  mockSession: {
    subject: testUser.id,
    access: {
      householdId: testHousehold.id,
      role: "OWNER" as const,
    },
  },

  // Date helpers
  testDates: {
    past: new Date("2022-01-01"),
    present: new Date("2023-06-15"),
    future: new Date("2024-12-31"),
    tomorrow: new Date(Date.now() + 24 * 60 * 60 * 1000),
    yesterday: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
};

// Helper functions
export const createMockAnimal = (
  overrides: Partial<AnimalInfo> = {},
): AnimalInfo => ({
  ...testAnimals.healthyDog,
  ...overrides,
});

export const createMockMedication = (
  overrides: Partial<MedicationData> = {},
): MedicationData => ({
  ...testMedications.amoxicillin,
  ...overrides,
});

// Test data generators
export const generateTestId = () => crypto.randomUUID();

export const generateTestEmail = (prefix = "test") =>
  `${prefix}+${Date.now()}@example.com`;

export const generateTestWeight = (min = 5, max = 50) =>
  Math.round((Math.random() * (max - min) + min) * 10) / 10;

export const generateTestDose = (baseDose = 10, variance = 0.2) =>
  Math.round(baseDose * (1 + (Math.random() - 0.5) * variance) * 10) / 10;
