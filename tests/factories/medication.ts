/**
 * Medication factory for test data generation
 */

import type { NewMedicationCatalog } from "@/db/schema";
import { dates } from "./utils/dates";
import { dosage, medications } from "./utils/medical";
import { medical, random } from "./utils/random";

// Medication factory function
export function createMedication(
	overrides: Partial<NewMedicationCatalog> = {},
): NewMedicationCatalog {
	const medicationType = random.arrayElement([
		"antibiotic",
		"nsaid",
		"steroid",
		"heartworm",
	] as const);
	const medication = medications.getRandomMedication(medicationType);
	const form = random.arrayElement(medication.forms);
	const route = random.arrayElement(medication.routes);
	const dosingInfo = dosage.generateDosing(medicationType);
	const concentration = dosage.generateConcentration(form);

	return {
		id: random.uuid(),
		genericName: medication.name,
		brandName: random.boolean(0.7)
			? `${medication.name} ${random.arrayElement(["Plus", "XR", "SR", "Pro"])}`
			: null,
		strength: `${concentration}${random.arrayElement(["mg", "mL"])}`,
		route: route as any, // Cast to enum type
		form: form as any, // Cast to enum type
		controlledSubstance: random.boolean(0.1), // 10% are controlled substances
		commonDosing: `${dosingInfo.typical} mg/kg ${random.arrayElement(["BID", "TID", "QID", "SID"])}`,
		warnings: generateMedicationWarnings(medicationType),

		// Dosage calculation fields
		dosageMinMgKg: dosingInfo.min.toString(),
		dosageMaxMgKg: dosingInfo.max.toString(),
		dosageTypicalMgKg: dosingInfo.typical.toString(),
		maxDailyDoseMg: random.boolean(0.8)
			? random.int(500, 3000).toString()
			: null,

		// Species-specific adjustments
		speciesAdjustments: generateSpeciesAdjustments(),

		// Route-specific adjustments
		routeAdjustments: generateRouteAdjustments(route),

		// Contraindications
		contraindications: generateContraindications(medicationType),

		// Age adjustments
		ageAdjustments: generateAgeAdjustments(),

		// Breed considerations
		breedConsiderations: generateBreedConsiderations(medication.name),

		// Concentration info
		concentrationMgMl: form === "LIQUID" ? concentration.toString() : null,
		unitsPerTablet: ["TABLET", "CAPSULE"].includes(form)
			? concentration.toString()
			: null,
		unitType: random.arrayElement(["mg", "mcg", "IU"]),

		// Frequency info
		typicalFrequencyHours: random.arrayElement([8, 12, 24, 168]), // 8h, 12h, daily, weekly
		maxFrequencyPerDay: Math.floor(24 / random.arrayElement([8, 12, 24])),

		createdAt: dates.datePast(365).toISOString(),
		updatedAt: dates.dateRecent(30).toISOString(),

		...overrides,
	};
}

// Helper functions for generating medication-specific data
function generateMedicationWarnings(type: string): string {
	const warnings: Record<string, string[]> = {
		antibiotic: [
			"May cause GI upset - give with food",
			"Complete full course even if symptoms improve",
			"Monitor for allergic reactions",
		],
		nsaid: [
			"Monitor for GI upset and kidney function",
			"Do not combine with other NSAIDs",
			"Give with food to reduce stomach irritation",
		],
		steroid: [
			"Long-term use requires gradual tapering",
			"Monitor for increased thirst and urination",
			"May suppress immune system",
		],
		heartworm: [
			"Test for heartworms before starting prevention",
			"Give monthly on the same date",
			"Some breeds have MDR1 sensitivity",
		],
	};

	return random.arrayElement(warnings[type] || ["Monitor for adverse effects"]);
}

function generateSpeciesAdjustments(): any {
	if (!random.boolean(0.6)) return null; // 60% chance of having species adjustments

	const adjustments: any = {};

	if (random.boolean(0.8)) {
		adjustments.dog = { multiplier: 1.0 };
	}

	if (random.boolean(0.7)) {
		adjustments.cat = {
			multiplier: random.float(0.5, 0.9, 1),
			additionalWarnings: random.boolean(0.5)
				? ["Monitor kidney function in cats"]
				: undefined,
		};
	}

	if (random.boolean(0.3)) {
		adjustments.bird = {
			multiplier: random.float(1.1, 1.5, 1),
			maxDailyDose: random.int(10, 100),
		};
	}

	return Object.keys(adjustments).length > 0 ? adjustments : null;
}

function generateRouteAdjustments(route: string): any {
	if (!random.boolean(0.4)) return null; // 40% chance of having route adjustments

	const adjustments: any = {};

	if (route === "IV") {
		adjustments.IV = {
			multiplier: random.float(0.5, 0.8, 1),
			additionalWarnings: [
				"Monitor injection site",
				"Monitor for IV reactions",
			],
		};
	}

	if (route === "IM") {
		adjustments.IM = {
			multiplier: random.float(0.8, 1.0, 1),
			additionalWarnings: ["Rotate injection sites"],
		};
	}

	return Object.keys(adjustments).length > 0 ? adjustments : null;
}

function generateContraindications(type: string): string[] {
	const contraindications: Record<string, string[]> = {
		antibiotic: ["penicillin allergy", "severe kidney disease"],
		nsaid: [
			"kidney disease",
			"liver disease",
			"GI ulceration",
			"bleeding disorders",
		],
		steroid: ["systemic infections", "diabetes (relative)"],
		heartworm: ["MDR1 gene mutation (ivermectin)"],
	};

	const baseContraindications = contraindications[type] || [];
	return random.arrayElements(
		baseContraindications,
		random.int(0, baseContraindications.length),
	);
}

function generateAgeAdjustments(): any {
	if (!random.boolean(0.5)) return null; // 50% chance of having age adjustments

	const adjustments: any = {};

	if (random.boolean(0.7)) {
		adjustments.pediatric = {
			multiplier: random.float(0.6, 0.8, 1),
			minAgeMonths: random.int(2, 6),
			additionalWarnings: random.boolean(0.5)
				? ["Use with caution in young animals"]
				: undefined,
		};
	}

	if (random.boolean(0.6)) {
		adjustments.geriatric = {
			multiplier: random.float(0.7, 0.9, 1),
			minAgeYears: random.int(7, 10),
			additionalWarnings: random.boolean(0.5)
				? ["Monitor organ function in senior pets"]
				: undefined,
		};
	}

	return Object.keys(adjustments).length > 0 ? adjustments : null;
}

function generateBreedConsiderations(medicationName: string): any {
	// Only certain medications have breed considerations
	if (!["Ivermectin", "Morphine", "Acepromazine"].includes(medicationName)) {
		return null;
	}

	if (!random.boolean(0.3)) return null; // 30% chance

	const considerations: any = {};

	if (medicationName === "Ivermectin") {
		considerations["border collie"] = {
			multiplier: 0.5,
			additionalWarnings: ["MDR1 gene sensitivity - use with extreme caution"],
		};
		considerations["collie"] = {
			multiplier: 0.5,
			additionalWarnings: ["MDR1 gene sensitivity - use with extreme caution"],
		};
	}

	if (random.boolean(0.4)) {
		considerations.greyhound = {
			multiplier: random.float(0.8, 0.9, 1),
			additionalWarnings: ["Sighthound sensitivity"],
		};
	}

	return Object.keys(considerations).length > 0 ? considerations : null;
}

// Medication builder class for complex scenarios
export class MedicationBuilder {
	private medication: Partial<NewMedicationCatalog> = {};

	static create(): MedicationBuilder {
		return new MedicationBuilder();
	}

	withBasicInfo(info: {
		genericName: string;
		brandName?: string;
		route: string;
		form: string;
	}): MedicationBuilder {
		this.medication.genericName = info.genericName;
		this.medication.brandName = info.brandName || null;
		this.medication.route = info.route as any;
		this.medication.form = info.form as any;
		return this;
	}

	withDosing(dosing: {
		min: number;
		max: number;
		typical: number;
		maxDaily?: number;
		frequency?: number;
	}): MedicationBuilder {
		this.medication.dosageMinMgKg = dosing.min.toString();
		this.medication.dosageMaxMgKg = dosing.max.toString();
		this.medication.dosageTypicalMgKg = dosing.typical.toString();
		if (dosing.maxDaily)
			this.medication.maxDailyDoseMg = dosing.maxDaily.toString();
		if (dosing.frequency)
			this.medication.typicalFrequencyHours = dosing.frequency;
		return this;
	}

	withConcentration(concentration: number, unitType = "mg"): MedicationBuilder {
		this.medication.unitType = unitType;
		if (this.medication.form === "LIQUID") {
			this.medication.concentrationMgMl = concentration.toString();
		} else if (["TABLET", "CAPSULE"].includes(this.medication.form as string)) {
			this.medication.unitsPerTablet = concentration.toString();
		}
		return this;
	}

	withWarnings(warnings: string): MedicationBuilder {
		this.medication.warnings = warnings;
		return this;
	}

	withContraindications(contraindications: string[]): MedicationBuilder {
		this.medication.contraindications = contraindications;
		return this;
	}

	isControlledSubstance(controlled = true): MedicationBuilder {
		this.medication.controlledSubstance = controlled;
		return this;
	}

	withSpeciesAdjustments(adjustments: any): MedicationBuilder {
		this.medication.speciesAdjustments = adjustments;
		return this;
	}

	withBreedConsiderations(considerations: any): MedicationBuilder {
		this.medication.breedConsiderations = considerations;
		return this;
	}

	build(): NewMedicationCatalog {
		return createMedication(this.medication);
	}
}

// Preset medication types for common scenarios
export const medicationPresets = {
	amoxicillin: (): NewMedicationCatalog =>
		MedicationBuilder.create()
			.withBasicInfo({
				genericName: "Amoxicillin",
				brandName: "Amoxil",
				route: "ORAL",
				form: "TABLET",
			})
			.withDosing({
				min: 10,
				max: 20,
				typical: 15,
				maxDaily: 3000,
				frequency: 12,
			})
			.withConcentration(250)
			.withWarnings("May cause GI upset if not given with food")
			.withContraindications(["penicillin allergy"])
			.build(),

	carprofen: (): NewMedicationCatalog =>
		MedicationBuilder.create()
			.withBasicInfo({
				genericName: "Carprofen",
				brandName: "Rimadyl",
				route: "ORAL",
				form: "TABLET",
			})
			.withDosing({
				min: 2,
				max: 4,
				typical: 2.2,
				maxDaily: 300,
				frequency: 12,
			})
			.withConcentration(100)
			.withWarnings("Monitor for GI upset and kidney function")
			.withContraindications(["kidney disease", "liver disease"])
			.build(),

	prednisone: (): NewMedicationCatalog =>
		MedicationBuilder.create()
			.withBasicInfo({
				genericName: "Prednisone",
				brandName: "Deltasone",
				route: "ORAL",
				form: "TABLET",
			})
			.withDosing({
				min: 0.5,
				max: 2,
				typical: 1,
				maxDaily: 80,
				frequency: 24,
			})
			.withConcentration(5)
			.withWarnings("Long-term use requires gradual tapering")
			.withContraindications(["systemic infections"])
			.build(),

	ivermectin: (): NewMedicationCatalog =>
		MedicationBuilder.create()
			.withBasicInfo({
				genericName: "Ivermectin",
				brandName: "Heartgard",
				route: "ORAL",
				form: "TABLET",
			})
			.withDosing({
				min: 0.006,
				max: 0.012,
				typical: 0.006,
				frequency: 720, // Monthly
			})
			.withConcentration(68, "mcg")
			.withWarnings("Check for MDR1 gene mutation in susceptible breeds")
			.withBreedConsiderations({
				"border collie": {
					multiplier: 0.5,
					additionalWarnings: [
						"MDR1 gene sensitivity - use with extreme caution",
					],
				},
				collie: {
					multiplier: 0.5,
					additionalWarnings: [
						"MDR1 gene sensitivity - use with extreme caution",
					],
				},
			})
			.build(),

	meloxicam: (): NewMedicationCatalog =>
		MedicationBuilder.create()
			.withBasicInfo({
				genericName: "Meloxicam",
				brandName: "Metacam",
				route: "ORAL",
				form: "LIQUID",
			})
			.withDosing({
				min: 0.1,
				max: 0.2,
				typical: 0.1,
				frequency: 24,
			})
			.withConcentration(1.5)
			.withWarnings("Monitor for GI upset and kidney function")
			.withSpeciesAdjustments({
				cat: {
					multiplier: 0.5,
					additionalWarnings: ["Monitor kidney function closely in cats"],
				},
			})
			.withContraindications(["kidney disease", "GI ulceration"])
			.build(),
};
