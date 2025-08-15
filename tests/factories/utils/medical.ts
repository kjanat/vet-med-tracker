/**
 * Medical-specific test data utilities
 */

import { random } from "./random";

// Medication catalog data
export const medications = {
  antibiotics: [
    { name: "Amoxicillin", forms: ["TABLET", "LIQUID"], routes: ["ORAL"] },
    { name: "Cephalexin", forms: ["TABLET", "CAPSULE"], routes: ["ORAL"] },
    {
      name: "Enrofloxacin",
      forms: ["TABLET", "INJECTION"],
      routes: ["ORAL", "SC", "IV"],
    },
    { name: "Clindamycin", forms: ["TABLET", "LIQUID"], routes: ["ORAL"] },
    { name: "Metronidazole", forms: ["TABLET", "LIQUID"], routes: ["ORAL"] },
  ],

  nsaids: [
    {
      name: "Carprofen",
      forms: ["TABLET", "INJECTION"],
      routes: ["ORAL", "SC"],
    },
    { name: "Meloxicam", forms: ["LIQUID", "TABLET"], routes: ["ORAL"] },
    { name: "Deracoxib", forms: ["TABLET"], routes: ["ORAL"] },
    { name: "Firocoxib", forms: ["TABLET"], routes: ["ORAL"] },
  ],

  steroids: [
    { name: "Prednisone", forms: ["TABLET", "LIQUID"], routes: ["ORAL"] },
    { name: "Prednisolone", forms: ["TABLET", "LIQUID"], routes: ["ORAL"] },
    {
      name: "Dexamethasone",
      forms: ["TABLET", "INJECTION"],
      routes: ["ORAL", "IV", "IM"],
    },
  ],

  heartWorm: [
    { name: "Ivermectin", forms: ["TABLET"], routes: ["ORAL"] },
    { name: "Milbemycin", forms: ["TABLET"], routes: ["ORAL"] },
    { name: "Moxidectin", forms: ["TABLET"], routes: ["ORAL"] },
  ],

  getRandomMedication: (category?: string) => {
    if (category && medications[category as keyof typeof medications]) {
      return random.arrayElement(
        medications[category as keyof typeof medications],
      );
    }

    const allMeds = [
      ...medications.antibiotics,
      ...medications.nsaids,
      ...medications.steroids,
      ...medications.heartWorm,
    ];
    return random.arrayElement(allMeds);
  },
};

// Dosage calculations
export const dosage = {
  // Calculate dose based on weight and mg/kg
  calculateDose: (weightKg: number, doseMgKg: number) => {
    return parseFloat((weightKg * doseMgKg).toFixed(2));
  },

  // Convert between weight units
  lbsToKg: (lbs: number) => parseFloat((lbs / 2.20462).toFixed(2)),
  kgToLbs: (kg: number) => parseFloat((kg * 2.20462).toFixed(2)),

  // Generate realistic dosing ranges
  generateDosing: (
    medicationType:
      | "antibiotic"
      | "nsaid"
      | "steroid"
      | "heartworm" = "antibiotic",
  ) => {
    const ranges = {
      antibiotic: { min: 10, max: 25, typical: 15 },
      nsaid: { min: 2, max: 4, typical: 2.2 },
      steroid: { min: 0.5, max: 2, typical: 1 },
      heartworm: { min: 0.006, max: 0.012, typical: 0.006 },
    };

    return ranges[medicationType];
  },

  // Generate concentration values
  generateConcentration: (form: string) => {
    const concentrations: Record<string, number[]> = {
      TABLET: [25, 50, 100, 250, 500],
      LIQUID: [5, 10, 25, 50, 100],
      INJECTION: [10, 20, 50, 100],
    };

    const options = concentrations[form] || [10, 25, 50];
    return random.arrayElement(options);
  },
};

// Administration statuses with realistic probabilities
export const administration = {
  statuses: [
    { status: "ON_TIME", probability: 0.7 },
    { status: "LATE", probability: 0.15 },
    { status: "VERY_LATE", probability: 0.1 },
    { status: "MISSED", probability: 0.04 },
    { status: "PRN", probability: 0.01 },
  ] as const,

  getRandomStatus: () => {
    return random.weightedArrayElement(
      administration.statuses.map((s) => ({
        weight: s.probability * 100,
        value: s.status,
      })),
    );
  },

  // Generate realistic administration notes
  generateNotes: (status: string) => {
    const notesByStatus: Record<string, string[]> = {
      ON_TIME: [
        "Given with breakfast",
        "No issues observed",
        "Pet took medication well",
        "Given as scheduled",
      ],
      LATE: [
        "Given 30 minutes late due to schedule",
        "Delayed due to appointment",
        "Pet was sleeping, gave when awake",
        "Gave as soon as I got home",
      ],
      VERY_LATE: [
        "Forgot until bedtime",
        "Was out of town, gave when returned",
        "Pet hid under bed, took time to find",
        "Medication was misplaced",
      ],
      MISSED: [
        "Pet refused to take medication",
        "Out of town, unable to give",
        "Pet vomited shortly after, unsure if absorbed",
        "Forgot completely",
      ],
      PRN: [
        "Pet showing signs of pain",
        "Given for anxiety before vet visit",
        "Pet limping more today",
        "As needed for comfort",
      ],
    };

    const notes = notesByStatus[status] || ["No notes"];
    return random.arrayElement(notes);
  },
};

// Medical conditions and allergies
export const conditions = {
  common: [
    "Arthritis",
    "Allergies",
    "Anxiety",
    "Hip dysplasia",
    "Diabetes",
    "Heart murmur",
    "Kidney disease",
    "Liver disease",
    "Epilepsy",
    "Cancer",
  ],

  allergies: [
    "Penicillin allergy",
    "Chicken allergy",
    "Beef allergy",
    "Environmental allergies",
    "Flea allergy",
    "Grass allergy",
    "Pollen allergy",
    "Food allergies",
  ],

  generateConditions: (count = 0) => {
    if (count === 0) {
      count = random.boolean(0.3) ? random.int(1, 3) : 0; // 30% chance of having conditions
    }
    return random.arrayElements(conditions.common, count);
  },

  generateAllergies: (count = 0) => {
    if (count === 0) {
      count = random.boolean(0.2) ? random.int(1, 2) : 0; // 20% chance of having allergies
    }
    return random.arrayElements(conditions.allergies, count);
  },
};

// Storage requirements
export const storage = {
  requirements: [
    { type: "ROOM", description: "Room temperature" },
    { type: "FRIDGE", description: "Refrigerated" },
    { type: "FREEZER", description: "Frozen" },
    { type: "CONTROLLED", description: "Controlled substance storage" },
  ],

  getRandomStorage: () => {
    const weights = [
      { weight: 70, value: "ROOM" },
      { weight: 20, value: "FRIDGE" },
      { weight: 5, value: "FREEZER" },
      { weight: 5, value: "CONTROLLED" },
    ];
    return random.weightedArrayElement(weights);
  },
};

// Veterinary information
export const veterinary = {
  clinicNames: [
    "City Animal Hospital",
    "Sunshine Veterinary Clinic",
    "Pet Care Center",
    "Animal Medical Center",
    "Riverside Veterinary Hospital",
    "Downtown Pet Clinic",
    "Family Animal Hospital",
    "Countryside Veterinary Services",
  ],

  vetNames: [
    "Dr. Smith",
    "Dr. Johnson",
    "Dr. Williams",
    "Dr. Brown",
    "Dr. Davis",
    "Dr. Miller",
    "Dr. Wilson",
    "Dr. Anderson",
  ],

  microchipId: () => {
    // Generate a realistic microchip ID (15-digit number)
    return random.int(100000000000000, 999999999999999).toString();
  },

  generateVetInfo: () => ({
    vetName: random.arrayElement(veterinary.vetNames),
    clinicName: random.arrayElement(veterinary.clinicNames),
    vetPhone: `${random.int(200, 999)}-${random.int(200, 999)}-${random.int(1000, 9999)}`,
    vetEmail: `info@${random
      .arrayElement(veterinary.clinicNames)
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[^a-z]/g, "")}.com`,
  }),
};

// Medical utilities object for backward compatibility
export const medical = {
  microchipId: veterinary.microchipId,
};
