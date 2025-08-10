/**
 * Random data generation utilities
 * Simple faker.js-like functions for consistent test data generation
 */

import { randomUUID } from "node:crypto";

// Global seed for consistent random data in tests
let seed = 1;
export function setSeed(newSeed: number) {
	seed = newSeed;
}

// Simple seeded random number generator
function seededRandom() {
	const x = Math.sin(seed++) * 10000;
	return x - Math.floor(x);
}

// Basic random utilities
export const random = {
	uuid: () => randomUUID(),

	// Numbers
	int: (min = 0, max = 100) =>
		Math.floor(seededRandom() * (max - min + 1)) + min,
	float: (min = 0, max = 100, precision = 2) => {
		const num = seededRandom() * (max - min) + min;
		return parseFloat(num.toFixed(precision));
	},

	// Arrays
	arrayElement: <T>(array: T[]): T =>
		array[Math.floor(seededRandom() * array.length)],
	arrayElements: <T>(array: T[], count = 1): T[] => {
		const result: T[] = [];
		const shuffled = [...array].sort(() => seededRandom() - 0.5);
		return shuffled.slice(0, Math.min(count, array.length));
	},

	// Weighted selection
	weightedArrayElement: <T>(items: Array<{ weight: number; value: T }>): T => {
		const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
		let randomWeight = seededRandom() * totalWeight;

		for (const item of items) {
			randomWeight -= item.weight;
			if (randomWeight <= 0) return item.value;
		}
		return items[items.length - 1].value;
	},

	// Strings
	alphaNumeric: (length = 10) => {
		const chars =
			"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
		let result = "";
		for (let i = 0; i < length; i++) {
			result += chars.charAt(Math.floor(seededRandom() * chars.length));
		}
		return result;
	},

	// Booleans
	boolean: (probability = 0.5) => seededRandom() < probability,

	// Dates
	dateRecent: (days = 7) =>
		new Date(Date.now() - seededRandom() * days * 24 * 60 * 60 * 1000),
	dateFuture: (days = 7) =>
		new Date(Date.now() + seededRandom() * days * 24 * 60 * 60 * 1000),
	datePast: (years = 1) =>
		new Date(Date.now() - seededRandom() * years * 365 * 24 * 60 * 60 * 1000),
};

// Person data
export const person = {
	firstNames: {
		male: [
			"James",
			"John",
			"Robert",
			"Michael",
			"William",
			"David",
			"Richard",
			"Joseph",
			"Thomas",
			"Christopher",
		],
		female: [
			"Mary",
			"Patricia",
			"Jennifer",
			"Linda",
			"Elizabeth",
			"Barbara",
			"Susan",
			"Jessica",
			"Sarah",
			"Karen",
		],
		neutral: [
			"Alex",
			"Jordan",
			"Taylor",
			"Casey",
			"Riley",
			"Avery",
			"Quinn",
			"Sage",
			"River",
			"Phoenix",
		],
	},

	lastNames: [
		"Smith",
		"Johnson",
		"Williams",
		"Brown",
		"Jones",
		"Garcia",
		"Miller",
		"Davis",
		"Rodriguez",
		"Martinez",
	],

	firstName: (gender?: "male" | "female" | "neutral") => {
		if (gender) return random.arrayElement(person.firstNames[gender]);
		const allNames = [
			...person.firstNames.male,
			...person.firstNames.female,
			...person.firstNames.neutral,
		];
		return random.arrayElement(allNames);
	},

	lastName: () => random.arrayElement(person.lastNames),

	fullName: (gender?: "male" | "female" | "neutral") =>
		`${person.firstName(gender)} ${person.lastName()}`,

	email: (firstName?: string, lastName?: string) => {
		const first = firstName || person.firstName();
		const last = lastName || person.lastName();
		const domain = random.arrayElement(["example.com", "test.org", "demo.net"]);
		return `${first.toLowerCase()}.${last.toLowerCase()}@${domain}`;
	},

	phone: () => {
		const area = random.int(200, 999);
		const exchange = random.int(200, 999);
		const number = random.int(1000, 9999);
		return `${area}-${exchange}-${number}`;
	},
};

// Animal data
export const animal = {
	species: [
		"dog",
		"cat",
		"bird",
		"rabbit",
		"hamster",
		"guinea pig",
		"ferret",
		"reptile",
	],

	dogBreeds: [
		"Golden Retriever",
		"Labrador Retriever",
		"German Shepherd",
		"French Bulldog",
		"Bulldog",
		"Poodle",
		"Beagle",
		"Rottweiler",
		"Yorkshire Terrier",
		"Siberian Husky",
		"Border Collie",
		"Australian Shepherd",
		"Boxer",
		"Great Dane",
		"Chihuahua",
	],

	catBreeds: [
		"Domestic Shorthair",
		"Persian",
		"Maine Coon",
		"Ragdoll",
		"British Shorthair",
		"Siamese",
		"American Shorthair",
		"Scottish Fold",
		"Sphynx",
		"Russian Blue",
	],

	birdTypes: [
		"Budgerigar",
		"Cockatiel",
		"Canary",
		"Finch",
		"Lovebird",
		"Conure",
		"African Grey Parrot",
		"Macaw",
		"Amazon Parrot",
	],

	petNames: [
		"Buddy",
		"Max",
		"Bella",
		"Charlie",
		"Luna",
		"Cooper",
		"Milo",
		"Daisy",
		"Rocky",
		"Maggie",
		"Jack",
		"Sophie",
		"Tucker",
		"Molly",
		"Bear",
		"Lily",
		"Duke",
		"Sadie",
		"Zeus",
		"Ruby",
		"Oscar",
		"Princess",
	],

	colors: [
		"Black",
		"White",
		"Brown",
		"Golden",
		"Gray",
		"Orange",
		"Cream",
		"Tan",
		"Silver",
		"Brindle",
		"Tricolor",
		"Spotted",
		"Calico",
	],

	name: () => random.arrayElement(animal.petNames),

	breed: (species: string) => {
		switch (species.toLowerCase()) {
			case "dog":
				return random.arrayElement(animal.dogBreeds);
			case "cat":
				return random.arrayElement(animal.catBreeds);
			case "bird":
				return random.arrayElement(animal.birdTypes);
			default:
				return `${species} mix`;
		}
	},

	color: () => random.arrayElement(animal.colors),

	weight: (species: string) => {
		const ranges: Record<string, [number, number]> = {
			dog: [2, 70],
			cat: [2, 15],
			bird: [0.02, 2],
			rabbit: [1, 5],
			hamster: [0.1, 0.2],
			"guinea pig": [0.7, 1.2],
			ferret: [1, 2.5],
		};
		const [min, max] = ranges[species.toLowerCase()] || [1, 10];
		return random.float(min, max, 2);
	},
};

// Location data
export const location = {
	timezones: [
		"America/New_York",
		"America/Chicago",
		"America/Denver",
		"America/Los_Angeles",
		"America/Phoenix",
		"America/Anchorage",
		"Pacific/Honolulu",
		"Europe/London",
		"Europe/Paris",
		"Europe/Berlin",
		"Asia/Tokyo",
	],

	cities: [
		"New York",
		"Los Angeles",
		"Chicago",
		"Houston",
		"Phoenix",
		"Philadelphia",
		"San Antonio",
		"San Diego",
		"Dallas",
		"Austin",
		"San Jose",
		"Jacksonville",
	],

	timezone: () => random.arrayElement(location.timezones),
	city: () => random.arrayElement(location.cities),
};

// Medical data
export const medical = {
	dosageUnits: ["mg", "mL", "mcg", "g", "IU", "units"],
	routes: ["ORAL", "SC", "IM", "IV", "TOPICAL", "OTIC", "OPHTHALMIC"],
	forms: ["TABLET", "CAPSULE", "LIQUID", "INJECTION", "CREAM", "DROPS"],

	commonMedications: [
		"Amoxicillin",
		"Carprofen",
		"Gabapentin",
		"Prednisone",
		"Meloxicam",
		"Tramadol",
		"Furosemide",
		"Enalapril",
		"Metronidazole",
		"Cephalexin",
	],

	conditions: [
		"Arthritis",
		"Allergies",
		"Anxiety",
		"Ear infection",
		"UTI",
		"Pain management",
		"Heart condition",
		"Skin condition",
		"Diabetes",
	],

	microchipId: () => random.int(100000000000000, 999999999999999).toString(),
};
