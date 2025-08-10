/**
 * Unit tests for the Dosage Calculator Engine
 */

import { describe, it, expect } from "vitest";
import {
	DosageCalculator,
	type MedicationData,
	type AnimalInfo,
} from "../dosage";

// Test medication data
const mockMedicationBasic: MedicationData = {
	id: "med-123",
	genericName: "Amoxicillin",
	brandName: "Amoxil",
	route: "ORAL",
	form: "TABLET",
	dosageMinMgKg: 10,
	dosageMaxMgKg: 20,
	dosageTypicalMgKg: 15,
	maxDailyDoseMg: 3000,
	concentrationMgMl: 50,
	unitsPerTablet: 250,
	unitType: "mg",
	typicalFrequencyHours: 12,
	maxFrequencyPerDay: 2,
};

const mockMedicationWithAdjustments: MedicationData = {
	...mockMedicationBasic,
	speciesAdjustments: {
		cat: { multiplier: 0.8, additionalWarnings: ["Monitor for GI upset"] },
		bird: { multiplier: 1.2, maxDailyDose: 200 },
	},
	routeAdjustments: {
		IV: { multiplier: 0.7, additionalWarnings: ["Monitor infusion site"] },
	},
	ageAdjustments: {
		pediatric: { multiplier: 0.8, minAgeMonths: 2 },
		geriatric: { multiplier: 0.9, minAgeYears: 7 },
	},
	breedConsiderations: {
		collie: { multiplier: 0.5, additionalWarnings: ["MDR1 gene sensitivity"] },
	},
	contraindications: ["penicillin allergy", "severe renal disease"],
	warnings: "May cause GI upset if not given with food",
};

// Test animal data
const mockDog: AnimalInfo = {
	species: "dog",
	breed: "Golden Retriever",
	weight: 30,
	weightUnit: "kg",
	ageYears: 5,
};

const mockCat: AnimalInfo = {
	species: "cat",
	weight: 10,
	weightUnit: "lbs",
	ageMonths: 18,
};

const mockCollie: AnimalInfo = {
	species: "dog",
	breed: "Border Collie",
	weight: 25,
	weightUnit: "kg",
	ageYears: 3,
};

const mockPuppyCollie: AnimalInfo = {
	species: "dog",
	breed: "Collie",
	weight: 15,
	weightUnit: "kg",
	ageMonths: 4,
};

const mockSeniorDog: AnimalInfo = {
	species: "dog",
	weight: 40,
	weightUnit: "lbs",
	ageYears: 12,
};

describe("DosageCalculator", () => {
	describe("Basic calculations", () => {
		it("calculates basic dosage for a dog", () => {
			const result = DosageCalculator.calculate({
				animal: mockDog,
				medication: mockMedicationBasic,
			});

			expect(result.dose).toBe(450); // 30 kg * 15 mg/kg
			expect(result.unit).toBe("mg");
			expect(result.minDose).toBe(300); // 30 kg * 10 mg/kg
			expect(result.maxDose).toBe(600); // 30 kg * 20 mg/kg
			expect(result.safetyLevel).toBe("safe");
			expect(result.calculationMethod).toBe("standard");
			expect(result.weightInKg).toBe(30);
			expect(result.baseDoseMgKg).toBe(15);
			expect(result.finalDoseMgKg).toBe(15);
		});

		it("calculates dosage with weight conversion", () => {
			const result = DosageCalculator.calculate({
				animal: mockCat, // 10 lbs = ~4.54 kg
				medication: mockMedicationBasic,
			});

			expect(result.weightInKg).toBeCloseTo(4.54, 2);
			expect(result.dose).toBeCloseTo(68.04, 1); // 4.54 kg * 15 mg/kg
			expect(result.minDose).toBeCloseTo(45.36, 1); // 4.54 kg * 10 mg/kg
			expect(result.maxDose).toBeCloseTo(90.72, 1); // 4.54 kg * 20 mg/kg
		});

		it("converts to mL when requested", () => {
			const result = DosageCalculator.calculate({
				animal: mockDog,
				medication: mockMedicationBasic,
				targetUnit: "ml",
			});

			expect(result.dose).toBe(9); // 450 mg / 50 mg/ml
			expect(result.unit).toBe("mL");
			expect(result.minDose).toBe(6); // 300 mg / 50 mg/ml
			expect(result.maxDose).toBe(12); // 600 mg / 50 mg/ml
		});

		it("converts to tablets when requested", () => {
			const result = DosageCalculator.calculate({
				animal: mockDog,
				medication: mockMedicationBasic,
				targetUnit: "tablets",
			});

			expect(result.dose).toBe(1.8); // 450 mg / 250 mg/tablet
			expect(result.unit).toBe("tablets");
			expect(result.minDose).toBe(1.2); // 300 mg / 250 mg/tablet
			expect(result.maxDose).toBe(2.4); // 600 mg / 250 mg/tablet
		});
	});

	describe("Species adjustments", () => {
		it("applies cat species adjustment", () => {
			const result = DosageCalculator.calculate({
				animal: { ...mockCat, species: "cat" },
				medication: mockMedicationWithAdjustments,
			});

			// Should be 80% of normal dose
			// mockCat weight is 10 lbs = 4.54 kg
			const weightInKg = 10 / 2.20462; // More precise conversion
			const expectedDose = Number((weightInKg * 15 * 0.8).toFixed(1)); // Rounded like the calculator does
			expect(result.dose).toBe(expectedDose);
			expect(result.calculationMethod).toBe("species_adjusted");
			expect(result.appliedAdjustments).toContain("Species adjustment: 80%");
			expect(result.warnings).toContain("Monitor for GI upset");
			expect(result.safetyLevel).toBe("caution"); // Due to warnings
		});

		it("applies bird species adjustment", () => {
			const birdAnimal: AnimalInfo = {
				species: "bird",
				weight: 0.5,
				weightUnit: "kg",
			};

			const result = DosageCalculator.calculate({
				animal: birdAnimal,
				medication: mockMedicationWithAdjustments,
			});

			// Should be 120% of normal dose
			const expectedDose = Number((0.5 * 15 * 1.2).toFixed(1)); // Rounded like the calculator does
			expect(result.dose).toBe(expectedDose);
			expect(result.calculationMethod).toBe("species_adjusted");
			expect(result.appliedAdjustments).toContain("Species adjustment: 120%");
		});
	});

	describe("Breed considerations", () => {
		it("applies MDR1 gene adjustment for collies", () => {
			const result = DosageCalculator.calculate({
				animal: mockCollie,
				medication: mockMedicationWithAdjustments,
			});

			// Should be 50% of normal dose due to MDR1 sensitivity
			const expectedDose = 25 * 15 * 0.5; // weight * baseDose * collieMultiplier
			expect(result.dose).toBe(expectedDose);
			expect(result.calculationMethod).toBe("breed_adjusted");
			expect(result.appliedAdjustments).toContain("Breed adjustment: 50%");
			expect(result.warnings).toContain("MDR1 gene sensitivity");
			expect(result.safetyLevel).toBe("caution");
		});

		it("handles generic MDR1 breeds", () => {
			const australianShepherd: AnimalInfo = {
				species: "dog",
				breed: "Australian Shepherd",
				weight: 20,
				weightUnit: "kg",
			};

			// Test medication that would trigger MDR1 sensitivity
			const ivermectinMed: MedicationData = {
				...mockMedicationBasic,
				genericName: "Ivermectin",
			};

			const result = DosageCalculator.calculate({
				animal: australianShepherd,
				medication: ivermectinMed,
			});

			// Should apply MDR1 reduction
			expect(result.calculationMethod).toBe("breed_adjusted");
			expect(result.appliedAdjustments).toContain("Breed adjustment: 50%");
		});

		it("applies greyhound adjustment", () => {
			const greyhound: AnimalInfo = {
				species: "dog",
				breed: "Greyhound",
				weight: 30,
				weightUnit: "kg",
			};

			const result = DosageCalculator.calculate({
				animal: greyhound,
				medication: mockMedicationBasic,
			});

			// Should be 90% of normal dose
			const expectedDose = 30 * 15 * 0.9; // weight * baseDose * greyhoundMultiplier
			expect(result.dose).toBe(expectedDose);
			expect(result.calculationMethod).toBe("breed_adjusted");
			expect(result.appliedAdjustments).toContain("Breed adjustment: 90%");
		});
	});

	describe("Age adjustments", () => {
		it("applies pediatric adjustment", () => {
			// Create a puppy that is actually under the pediatric threshold (< 2 months)
			const youngPuppy: AnimalInfo = {
				species: "dog",
				breed: "Collie",
				weight: 15,
				weightUnit: "kg",
				ageMonths: 1, // Under the 2-month threshold
			};

			const result = DosageCalculator.calculate({
				animal: youngPuppy,
				medication: mockMedicationWithAdjustments,
			});

			// Should apply both pediatric (0.8) and breed (0.5) adjustments
			const expectedMultiplier = 0.8 * 0.5; // pediatric * collie
			const expectedDose = 15 * 15 * expectedMultiplier;
			expect(result.dose).toBe(expectedDose);
			expect(result.calculationMethod).toBe("breed_adjusted"); // Breed takes precedence
			expect(result.appliedAdjustments).toContain("Age adjustment: 80%");
			expect(result.appliedAdjustments).toContain("Breed adjustment: 50%");
		});

		it("applies geriatric adjustment", () => {
			const result = DosageCalculator.calculate({
				animal: mockSeniorDog, // 12 years old, over geriatric threshold
				medication: mockMedicationWithAdjustments,
			});

			// Should apply geriatric adjustment (0.9)
			const weightInKg = 40 / 2.20462; // Convert lbs to kg
			const expectedDose = weightInKg * 15 * 0.9;
			expect(result.dose).toBeCloseTo(expectedDose, 1);
			expect(result.calculationMethod).toBe("age_adjusted");
			expect(result.appliedAdjustments).toContain("Age adjustment: 90%");
		});
	});

	describe("Route adjustments", () => {
		it("applies IV route adjustment", () => {
			const result = DosageCalculator.calculate({
				animal: mockDog,
				medication: mockMedicationWithAdjustments,
				route: "IV",
			});

			// Should be 70% of normal dose for IV route
			const expectedDose = 30 * 15 * 0.7;
			expect(result.dose).toBe(expectedDose);
			expect(result.calculationMethod).toBe("route_adjusted");
			expect(result.appliedAdjustments).toContain("Route adjustment: 70%");
			expect(result.warnings).toContain("Monitor infusion site");
		});
	});

	describe("Combined adjustments", () => {
		it("applies multiple adjustments correctly", () => {
			// Create an animal that actually qualifies for pediatric adjustment
			const youngCatCollie: AnimalInfo = {
				species: "cat",
				breed: "Collie",
				weight: 15,
				weightUnit: "kg",
				ageMonths: 1, // Under the 2-month threshold for pediatric adjustment
			};

			const result = DosageCalculator.calculate({
				animal: youngCatCollie,
				medication: mockMedicationWithAdjustments,
				route: "IV",
			});

			// Should apply species (0.8), breed (0.5), age (0.8), and route (0.7) adjustments
			const expectedMultiplier = 0.8 * 0.5 * 0.8 * 0.7;
			const expectedDose = 15 * 15 * expectedMultiplier; // = 50.400000000000006
			// Calculator rounds to vet precision (1 decimal place for mg)
			expect(result.dose).toBe(50.4);
			expect(result.appliedAdjustments).toHaveLength(4);
			expect(result.warnings.length).toBeGreaterThan(0);
		});
	});

	describe("Safety validation", () => {
		it("detects dangerous conditions", () => {
			const extremeReduction: MedicationData = {
				...mockMedicationBasic,
				speciesAdjustments: {
					cat: { multiplier: 0.3 }, // Extreme reduction
				},
			};

			const result = DosageCalculator.calculate({
				animal: { ...mockCat, species: "cat" },
				medication: extremeReduction,
			});

			expect(result.safetyLevel).toBe("caution"); // Due to extreme dose adjustment
		});

		it("detects contraindications", () => {
			const animalWithAllergy: AnimalInfo = {
				...mockDog,
				conditions: ["penicillin allergy"],
			};

			expect(() => {
				DosageCalculator.calculate({
					animal: animalWithAllergy,
					medication: mockMedicationWithAdjustments,
				});
			}).toThrow(
				"This medication is contraindicated for the animal's conditions",
			);
		});

		it("identifies controlled substances as caution", () => {
			const controlledMed: MedicationData = {
				...mockMedicationBasic,
				controlledSubstance: true,
			};

			const result = DosageCalculator.calculate({
				animal: mockDog,
				medication: controlledMed,
			});

			expect(result.safetyLevel).toBe("caution");
		});
	});

	describe("Alternative formats", () => {
		it("generates alternative formats correctly", () => {
			const result = DosageCalculator.calculate({
				animal: mockDog,
				medication: mockMedicationBasic,
			});

			expect(result.alternativeFormats).toBeDefined();
			expect(result.alternativeFormats).toHaveLength(2);

			const mlFormat = result.alternativeFormats?.find((f) => f.unit === "mL");
			expect(mlFormat?.dose).toBe(9); // 450 mg / 50 mg/ml
			expect(mlFormat?.description).toBe("Liquid volume");

			const tabletFormat = result.alternativeFormats?.find(
				(f) => f.unit === "tablets",
			);
			expect(tabletFormat?.dose).toBe(1.8); // 450 mg / 250 mg/tablet
			expect(tabletFormat?.description).toBe("Number of tablets");
		});
	});

	describe("Daily dosing information", () => {
		it("calculates daily dosing info correctly", () => {
			const result = DosageCalculator.calculate({
				animal: mockDog,
				medication: mockMedicationBasic,
			});

			expect(result.dailyInfo).toBeDefined();
			expect(result.dailyInfo?.dosesPerDay).toBe(2);
			expect(result.dailyInfo?.totalDailyDose).toBe(900); // 450 mg * 2 doses
			expect(result.dailyInfo?.timeBetweenDoses).toBe("12 hours");
		});

		it("generates frequency string correctly", () => {
			const result = DosageCalculator.calculate({
				animal: mockDog,
				medication: mockMedicationBasic,
			});

			expect(result.frequency).toBe("Twice daily");
		});
	});

	describe("Input validation", () => {
		it("validates animal species requirement", () => {
			expect(() => {
				DosageCalculator.calculate({
					animal: { ...mockDog, species: "" },
					medication: mockMedicationBasic,
				});
			}).toThrow("Animal species is required");
		});

		it("validates animal weight requirement", () => {
			expect(() => {
				DosageCalculator.calculate({
					animal: { ...mockDog, weight: 0 },
					medication: mockMedicationBasic,
				});
			}).toThrow("Animal weight must be greater than 0");
		});

		it("validates weight unit", () => {
			expect(() => {
				DosageCalculator.calculate({
					animal: { ...mockDog, weightUnit: "invalid" as any },
					medication: mockMedicationBasic,
				});
			}).toThrow("Weight unit must be kg or lbs");
		});

		it("validates medication information", () => {
			expect(() => {
				DosageCalculator.calculate({
					animal: mockDog,
					medication: { ...mockMedicationBasic, genericName: "" },
				});
			}).toThrow("Medication information is incomplete");
		});

		it("validates dosage information availability", () => {
			expect(() => {
				DosageCalculator.calculate({
					animal: mockDog,
					medication: { ...mockMedicationBasic, dosageTypicalMgKg: undefined },
				});
			}).toThrow("Medication does not have dosage information configured");
		});
	});

	describe("Error handling", () => {
		it("handles missing concentration for mL conversion", () => {
			expect(() => {
				DosageCalculator.calculate({
					animal: mockDog,
					medication: { ...mockMedicationBasic, concentrationMgMl: undefined },
					targetUnit: "ml",
				});
			}).toThrow("Concentration (mg/mL) is required for mL calculation");
		});

		it("handles missing units per tablet for tablet conversion", () => {
			expect(() => {
				DosageCalculator.calculate({
					animal: mockDog,
					medication: { ...mockMedicationBasic, unitsPerTablet: undefined },
					targetUnit: "tablets",
				});
			}).toThrow("Units per tablet is required for tablet calculation");
		});

		it("handles unsupported target unit", () => {
			expect(() => {
				DosageCalculator.calculate({
					animal: mockDog,
					medication: mockMedicationBasic,
					targetUnit: "invalid" as any,
				});
			}).toThrow("Unsupported target unit: invalid");
		});
	});
});
