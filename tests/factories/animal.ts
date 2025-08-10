/**
 * Animal factory for test data generation
 */

import type { NewAnimal } from "@/db/schema";
import { random, animal, location } from "./utils/random";
import { dates } from "./utils/dates";
import { conditions, veterinary, medical } from "./utils/medical";

// Animal factory function
export function createAnimal(overrides: Partial<NewAnimal> = {}): NewAnimal {
	const species = overrides.species || random.arrayElement(animal.species);
	const name = animal.name();
	const breed = animal.breed(species);
	const weight = animal.weight(species);
	const sex = random.arrayElement(["male", "female"]);
	const vetInfo = veterinary.generateVetInfo();

	return {
		id: random.uuid(),
		householdId: random.uuid(), // Should be overridden with actual household ID
		name,
		species,
		breed,
		sex,
		neutered: random.boolean(0.8), // 80% of pets are neutered/spayed
		dob: dates.toDateString(dates.birthDate(random.int(1, 15))), // 1-15 years old
		weightKg: weight.toString(),
		microchipId: random.boolean(0.6) ? medical.microchipId() : null,
		color: animal.color(),
		photoUrl: null, // Could be populated with test image URLs if needed
		timezone: location.timezone(),
		vetName: vetInfo.vetName,
		vetPhone: vetInfo.vetPhone,
		vetEmail: vetInfo.vetEmail,
		clinicName: vetInfo.clinicName,
		allergies: conditions.generateAllergies(),
		conditions: conditions.generateConditions(),
		notes: random.boolean(0.4)
			? random.arrayElement([
					"Very friendly with other animals",
					"Needs quiet environment for stress",
					"Loves treats, use for medication compliance",
					"Anxious during storms",
					"Great with children",
					"Rescue animal, still adjusting",
					"Senior pet, monitor closely",
				])
			: null,
		createdAt: dates.datePast(180).toISOString(),
		updatedAt: dates.dateRecent(30).toISOString(),
		deletedAt: null,
		...overrides,
	};
}

// Animal builder class for complex scenarios
export class AnimalBuilder {
	private animal: Partial<NewAnimal> = {};

	static create(): AnimalBuilder {
		return new AnimalBuilder();
	}

	withBasicInfo(info: {
		name: string;
		species: string;
		breed?: string;
		sex?: "male" | "female";
	}): AnimalBuilder {
		this.animal.name = info.name;
		this.animal.species = info.species;
		this.animal.breed = info.breed || animal.breed(info.species);
		this.animal.sex = info.sex || random.arrayElement(["male", "female"]);
		return this;
	}

	withAge(years: number, months?: number): AnimalBuilder {
		if (months !== undefined) {
			this.animal.dob = dates.toDateString(dates.birthDate(years, months));
		} else {
			this.animal.dob = dates.toDateString(dates.birthDate(years));
		}
		return this;
	}

	withWeight(weightKg: number): AnimalBuilder {
		this.animal.weightKg = weightKg.toString();
		return this;
	}

	withMicrochip(microchipId?: string): AnimalBuilder {
		this.animal.microchipId = microchipId || medical.microchipId();
		return this;
	}

	withVetInfo(info: {
		vetName?: string;
		clinicName?: string;
		vetPhone?: string;
		vetEmail?: string;
	}): AnimalBuilder {
		if (info.vetName) this.animal.vetName = info.vetName;
		if (info.clinicName) this.animal.clinicName = info.clinicName;
		if (info.vetPhone) this.animal.vetPhone = info.vetPhone;
		if (info.vetEmail) this.animal.vetEmail = info.vetEmail;
		return this;
	}

	withConditions(conditionList: string[]): AnimalBuilder {
		this.animal.conditions = conditionList;
		return this;
	}

	withAllergies(allergyList: string[]): AnimalBuilder {
		this.animal.allergies = allergyList;
		return this;
	}

	withNotes(notes: string): AnimalBuilder {
		this.animal.notes = notes;
		return this;
	}

	withHousehold(householdId: string): AnimalBuilder {
		this.animal.householdId = householdId;
		return this;
	}

	withTimezone(timezone: string): AnimalBuilder {
		this.animal.timezone = timezone;
		return this;
	}

	isNeutered(neutered = true): AnimalBuilder {
		this.animal.neutered = neutered;
		return this;
	}

	withColor(color: string): AnimalBuilder {
		this.animal.color = color;
		return this;
	}

	createdDaysAgo(days: number): AnimalBuilder {
		this.animal.createdAt = dates.daysFromNow(-days).toISOString();
		this.animal.updatedAt = dates.dateRecent(Math.min(days, 7)).toISOString();
		return this;
	}

	build(): NewAnimal {
		return createAnimal(this.animal);
	}
}

// Preset animal types for common scenarios
export const animalPresets = {
	healthyDog: (householdId: string): NewAnimal =>
		AnimalBuilder.create()
			.withBasicInfo({
				name: random.arrayElement([
					"Buddy",
					"Max",
					"Cooper",
					"Charlie",
					"Rocky",
				]),
				species: "dog",
				breed: "Golden Retriever",
				sex: "male",
			})
			.withAge(3)
			.withWeight(30)
			.withMicrochip()
			.withHousehold(householdId)
			.isNeutered(true)
			.createdDaysAgo(90)
			.build(),

	healthyCat: (householdId: string): NewAnimal =>
		AnimalBuilder.create()
			.withBasicInfo({
				name: random.arrayElement(["Luna", "Bella", "Milo", "Oliver", "Lily"]),
				species: "cat",
				breed: "Domestic Shorthair",
				sex: "female",
			})
			.withAge(2)
			.withWeight(4.5)
			.withMicrochip()
			.withHousehold(householdId)
			.isNeutered(true)
			.createdDaysAgo(60)
			.build(),

	seniorDogWithConditions: (householdId: string): NewAnimal =>
		AnimalBuilder.create()
			.withBasicInfo({
				name: random.arrayElement(["Duke", "Bear", "Sadie", "Molly", "Jack"]),
				species: "dog",
				breed: "Labrador Retriever",
				sex: random.arrayElement(["male", "female"]),
			})
			.withAge(12)
			.withWeight(35)
			.withConditions(["Arthritis", "Hip dysplasia"])
			.withNotes("Senior dog, monitor for pain and mobility issues")
			.withHousehold(householdId)
			.isNeutered(true)
			.createdDaysAgo(365)
			.build(),

	youngPuppy: (householdId: string): NewAnimal =>
		AnimalBuilder.create()
			.withBasicInfo({
				name: random.arrayElement(["Scout", "Piper", "Finn", "Nova", "Ziggy"]),
				species: "dog",
				breed: random.arrayElement(animal.dogBreeds),
				sex: random.arrayElement(["male", "female"]),
			})
			.withAge(0, 4) // 4 months old
			.withWeight(8)
			.withNotes("Young puppy, still completing vaccination series")
			.withHousehold(householdId)
			.isNeutered(false)
			.createdDaysAgo(30)
			.build(),

	rescueAnimal: (householdId: string): NewAnimal =>
		AnimalBuilder.create()
			.withBasicInfo({
				name: random.arrayElement([
					"Hope",
					"Lucky",
					"Spirit",
					"Chance",
					"Journey",
				]),
				species: random.arrayElement(["dog", "cat"]),
				breed: "Mixed breed",
				sex: random.arrayElement(["male", "female"]),
			})
			.withAge(random.int(2, 8))
			.withWeight(random.float(10, 25))
			.withConditions(
				random.boolean(0.7)
					? conditions.generateConditions(random.int(1, 2))
					: [],
			)
			.withNotes(
				"Rescue animal, history unknown. Monitor for behavioral changes.",
			)
			.withHousehold(householdId)
			.isNeutered(true)
			.createdDaysAgo(random.int(7, 60))
			.build(),

	exoticPet: (householdId: string): NewAnimal =>
		AnimalBuilder.create()
			.withBasicInfo({
				name: random.arrayElement([
					"Kiwi",
					"Mango",
					"Pickles",
					"Sunny",
					"Echo",
				]),
				species: "bird",
				breed: random.arrayElement(animal.birdTypes),
				sex: random.arrayElement(["male", "female"]),
			})
			.withAge(random.int(2, 10))
			.withWeight(0.4)
			.withNotes("Exotic pet - requires specialized veterinary care")
			.withHousehold(householdId)
			.createdDaysAgo(120)
			.build(),

	diabeticCat: (householdId: string): NewAnimal =>
		AnimalBuilder.create()
			.withBasicInfo({
				name: random.arrayElement([
					"Whiskers",
					"Shadow",
					"Tiger",
					"Patches",
					"Smokey",
				]),
				species: "cat",
				breed: "Domestic Shorthair",
				sex: random.arrayElement(["male", "female"]),
			})
			.withAge(8)
			.withWeight(5.2)
			.withConditions(["Diabetes"])
			.withNotes("Diabetic cat requiring twice-daily insulin injections")
			.withHousehold(householdId)
			.isNeutered(true)
			.createdDaysAgo(200)
			.build(),

	allergicDog: (householdId: string): NewAnimal =>
		AnimalBuilder.create()
			.withBasicInfo({
				name: random.arrayElement([
					"Buster",
					"Rosie",
					"Tucker",
					"Penny",
					"Gus",
				]),
				species: "dog",
				breed: "German Shepherd",
				sex: random.arrayElement(["male", "female"]),
			})
			.withAge(5)
			.withWeight(32)
			.withAllergies(["Environmental allergies", "Chicken allergy"])
			.withConditions(["Skin allergies"])
			.withNotes("Severe allergies - avoid chicken-based foods and treats")
			.withHousehold(householdId)
			.isNeutered(true)
			.createdDaysAgo(180)
			.build(),
};

// Utility functions for animal management
export const animalUtils = {
	// Calculate age in years from date of birth
	calculateAge: (dob: string): number => {
		const birthDate = new Date(dob);
		const today = new Date();
		const age = today.getFullYear() - birthDate.getFullYear();
		const monthDiff = today.getMonth() - birthDate.getMonth();

		if (
			monthDiff < 0 ||
			(monthDiff === 0 && today.getDate() < birthDate.getDate())
		) {
			return age - 1;
		}
		return age;
	},

	// Generate appropriate weight for species and age
	calculateAppropriateWeight: (
		species: string,
		ageYears: number,
		breed?: string,
	): number => {
		const baseWeight = animal.weight(species);

		// Adjust for age (puppies/kittens are lighter, senior animals may vary)
		let ageMultiplier = 1;
		if (ageYears < 1) {
			ageMultiplier = 0.3 + ageYears * 0.7; // 30% to 100% of adult weight
		} else if (ageYears > 10 && species === "dog") {
			ageMultiplier = random.float(0.9, 1.1); // Senior dogs may be slightly lighter or heavier
		}

		return parseFloat((baseWeight * ageMultiplier).toFixed(2));
	},

	// Check if animal needs special considerations based on breed
	getBreedConsiderations: (breed: string): string[] => {
		const considerations: Record<string, string[]> = {
			"Border Collie": ["MDR1 gene sensitivity - use caution with ivermectin"],
			Greyhound: ["Sighthound sensitivity to anesthesia"],
			"German Shepherd": ["Hip dysplasia screening recommended"],
			"Golden Retriever": ["Cancer screening recommended after age 8"],
			Bulldog: ["Brachycephalic airway considerations"],
			"French Bulldog": ["Brachycephalic airway considerations"],
			Persian: ["Polycystic kidney disease screening"],
			"Maine Coon": ["Hypertrophic cardiomyopathy screening"],
		};

		return considerations[breed] || [];
	},
};
