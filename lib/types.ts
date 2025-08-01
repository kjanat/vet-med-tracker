// Centralized type definitions
export interface Animal {
	id: string;
	name: string;
	species: string;
	breed?: string;
	sex?: "Male" | "Female";
	neutered?: boolean;
	dob?: Date;
	weightKg?: number;
	microchipId?: string;
	color?: string;
	photo?: string;
	timezone: string;
	vetName?: string;
	vetPhone?: string;
	allergies: string[];
	conditions: string[];
	avatar?: string;
	pendingMeds: number;
}

// Type for minimal Animal representation used in some contexts
export type MinimalAnimal = Pick<Animal, "id" | "name" | "species">;

// Administration status enum values
export type AdminStatus = "ON_TIME" | "LATE" | "VERY_LATE" | "MISSED" | "PRN";

// Inventory storage enum values
export type StorageType = "ROOM" | "FRIDGE" | "FREEZER" | "CONTROLLED";

// Administration record type
export interface AdministrationRecord {
	id: string;
	animalId: string;
	animalName: string;
	medicationName: string;
	strength: string;
	route: string;
	form: string;
	slot?: string; // "Morning", "Evening", "PRN"
	scheduledFor?: Date;
	recordedAt: Date;
	caregiverName: string;
	status: AdminStatus;
	cosignPending: boolean;
	cosignUser?: string;
	cosignedAt?: Date;
	sourceItem?: {
		name?: string;
		lot?: string;
		expiresOn?: Date;
	};
	site?: string;
	notes?: string;
	media?: string[];
	isEdited: boolean;
	isDeleted: boolean;
	editedBy?: string;
	editedAt?: Date;
}
