import { sql } from "drizzle-orm";
import {
	boolean,
	date,
	foreignKey,
	index,
	integer,
	jsonb,
	numeric,
	pgEnum,
	pgTable,
	text,
	time,
	timestamp,
	unique,
	uuid,
} from "drizzle-orm/pg-core";

// =====================================================
// ENUMS - Reusable across tables
// =====================================================
export const temperatureUnit = pgEnum("temperature_unit", [
	"celsius",
	"fahrenheit",
]);

export const weightUnit = pgEnum("weight_unit", ["kg", "lbs"]);

export const vetmedAdminStatus = pgEnum("vetmed_admin_status", [
	"ON_TIME",
	"LATE",
	"VERY_LATE",
	"MISSED",
	"PRN",
]);

export const vetmedForm = pgEnum("vetmed_form", [
	"TABLET",
	"CAPSULE",
	"LIQUID",
	"INJECTION",
	"CREAM",
	"OINTMENT",
	"DROPS",
	"SPRAY",
	"POWDER",
	"PATCH",
	"OTHER",
]);

export const vetmedRole = pgEnum("vetmed_role", [
	"OWNER",
	"CAREGIVER",
	"VETREADONLY",
]);

export const vetmedRoute = pgEnum("vetmed_route", [
	"ORAL",
	"SC",
	"IM",
	"IV",
	"TOPICAL",
	"OTIC",
	"OPHTHALMIC",
	"INHALED",
	"RECTAL",
	"OTHER",
]);

export const vetmedScheduleType = pgEnum("vetmed_schedule_type", [
	"FIXED",
	"PRN",
	"INTERVAL",
	"TAPER",
]);

export const vetmedStorage = pgEnum("vetmed_storage", [
	"ROOM",
	"FRIDGE",
	"FREEZER",
	"CONTROLLED",
]);

export const vetmedNotificationStatus = pgEnum("vetmed_notification_status", [
	"draft",
	"scheduled",
	"sent",
	"delivered",
	"read",
	"dismissed",
	"failed",
]);

export const vetmedDeliveryMethod = pgEnum("vetmed_delivery_method", [
	"in_app",
	"push",
	"email",
	"sms",
]);

export const vetmedSeverity = pgEnum("vetmed_severity", [
	"mild",
	"moderate",
	"severe",
	"critical",
]);

export const vetmedAllergenType = pgEnum("vetmed_allergen_type", [
	"food",
	"environmental",
	"medication",
	"contact",
	"other",
]);

export const vetmedCosignStatus = pgEnum("vetmed_cosign_status", [
	"pending",
	"approved",
	"rejected",
	"expired",
]);

export const vetmedSuggestionStatus = pgEnum("vetmed_suggestion_status", [
	"pending",
	"applied",
	"reverted",
	"dismissed",
]);

// =====================================================
// CORE ENTITIES - Foundational tables
// =====================================================

// Households - Core organization unit
export const vetmedHouseholds = pgTable("vetmed_households", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: text().notNull(),
	timezone: text().default("America/New_York").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
		.defaultNow()
		.notNull(),
});

// Users - Core authentication and basic info only
export const vetmedUsers = pgTable(
	"vetmed_users",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		email: text().notNull(),
		name: text(),
		firstName: text("first_name"),
		lastName: text("last_name"),
		image: text(),
		emailVerified: timestamp("email_verified", {
			withTimezone: true,
			mode: "string",
		}),
		stackUserId: text("stack_user_id").unique(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		unique("vetmed_users_email_unique").on(table.email),
		unique("vetmed_users_stack_user_id_unique").on(table.stackUserId),
	],
);

// User Profiles - Extended profile information
export const vetmedUserProfiles = pgTable(
	"vetmed_user_profiles",
	{
		userId: uuid("user_id").primaryKey().notNull(),
		bio: text(),
		pronouns: text(),
		location: text(),
		website: text(),
		socialLinks: jsonb("social_links").default(sql`'{}'::jsonb`),
		profileData: jsonb("profile_data").default(sql`'{}'::jsonb`),
		profileVisibility: jsonb("profile_visibility").default(
			sql`'{"name": true, "email": false, "bio": true, "location": true}'::jsonb`,
		),
		profileCompletedAt: timestamp("profile_completed_at", {
			withTimezone: true,
			mode: "string",
		}),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.userId],
			foreignColumns: [vetmedUsers.id],
			name: "vetmed_user_profiles_user_id_fk",
		}).onDelete("cascade"),
	],
);

// User Preferences - Settings and preferences
export const vetmedUserPreferences = pgTable(
	"vetmed_user_preferences",
	{
		userId: uuid("user_id").primaryKey().notNull(),
		preferredTimezone: text("preferred_timezone").default("America/New_York"),
		preferredPhoneNumber: text("preferred_phone_number"),
		use24HourTime: boolean("use_24_hour_time").default(false),
		temperatureUnit: temperatureUnit("temperature_unit").default("fahrenheit"),
		weightUnit: weightUnit("weight_unit").default("lbs"),
		emailReminders: boolean("email_reminders").default(true),
		smsReminders: boolean("sms_reminders").default(false),
		pushNotifications: boolean("push_notifications").default(true),
		reminderLeadTimeMinutes: text("reminder_lead_time_minutes").default("15"),
		weekStartsOn: integer("week_starts_on").default(0), // 0 = Sunday, 1 = Monday
		theme: text("theme").default("system"), // system, light, dark
		defaultHouseholdId: uuid("default_household_id"),
		defaultAnimalId: uuid("default_animal_id"),
		onboardingComplete: boolean("onboarding_complete").default(false),
		onboardingCompletedAt: timestamp("onboarding_completed_at", {
			withTimezone: true,
			mode: "string",
		}),
		preferencesBackup: jsonb("preferences_backup"),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		foreignKey({
			columns: [table.userId],
			foreignColumns: [vetmedUsers.id],
			name: "vetmed_user_preferences_user_id_fk",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.defaultHouseholdId],
			foreignColumns: [vetmedHouseholds.id],
			name: "vetmed_user_preferences_default_household_id_fk",
		}).onDelete("set null"),
	],
);

// Emergency Contacts - Separate for security/privacy
export const vetmedEmergencyContacts = pgTable(
	"vetmed_emergency_contacts",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		userId: uuid("user_id").notNull(),
		contactName: text("contact_name").notNull(),
		contactPhone: text("contact_phone").notNull(),
		relationship: text(),
		isPrimary: boolean("is_primary").default(false),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("emergency_contacts_user_id_idx").using(
			"btree",
			table.userId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [vetmedUsers.id],
			name: "vetmed_emergency_contacts_user_id_fk",
		}).onDelete("cascade"),
	],
);

// Household Memberships
export const vetmedMemberships = pgTable(
	"vetmed_memberships",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		userId: uuid("user_id").notNull(),
		householdId: uuid("household_id").notNull(),
		role: vetmedRole().default("CAREGIVER").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("membership_household_id_idx").using(
			"btree",
			table.householdId.asc().nullsLast().op("uuid_ops"),
		),
		index("membership_user_id_idx").using(
			"btree",
			table.userId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [vetmedUsers.id],
			name: "vetmed_memberships_user_id_fk",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.householdId],
			foreignColumns: [vetmedHouseholds.id],
			name: "vetmed_memberships_household_id_fk",
		}).onDelete("cascade"),
		unique("vetmed_memberships_user_id_household_id_unique").on(
			table.userId,
			table.householdId,
		),
	],
);

// =====================================================
// VETERINARY ENTITIES - Normalized medical data
// =====================================================

// Veterinarians - Reusable across animals and households
export const vetmedVeterinarians = pgTable(
	"vetmed_veterinarians",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		name: text().notNull(),
		phone: text(),
		email: text(),
		clinicName: text("clinic_name"),
		specialties: text().array(),
		address: jsonb(), // Structured address data
		emergencyContact: boolean("emergency_contact").default(false),
		licenseNumber: text("license_number"),
		notes: text(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("veterinarians_name_idx").using(
			"btree",
			table.name.asc().nullsLast().op("text_ops"),
		),
		index("veterinarians_clinic_name_idx").using(
			"btree",
			table.clinicName.asc().nullsLast().op("text_ops"),
		),
	],
);

// Animals - Core animal information only
export const vetmedAnimals = pgTable(
	"vetmed_animals",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		householdId: uuid("household_id").notNull(),
		name: text().notNull(),
		species: text().notNull(),
		breed: text(),
		sex: text(),
		neutered: boolean().default(false).notNull(),
		dob: date(),
		weightKg: numeric("weight_kg", { precision: 5, scale: 2 }),
		microchipId: text("microchip_id"),
		color: text(),
		photoUrl: text("photo_url"),
		timezone: text().default("America/New_York").notNull(),
		notes: text(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
	},
	(table) => [
		index("animals_deleted_at_idx").using(
			"btree",
			table.deletedAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("animals_household_id_idx").using(
			"btree",
			table.householdId.asc().nullsLast().op("uuid_ops"),
		),
		index("animals_species_idx").using(
			"btree",
			table.species.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.householdId],
			foreignColumns: [vetmedHouseholds.id],
			name: "vetmed_animals_household_id_fk",
		}).onDelete("cascade"),
	],
);

// Animal-Veterinarian relationships (many-to-many)
export const vetmedAnimalVeterinarians = pgTable(
	"vetmed_animal_veterinarians",
	{
		animalId: uuid("animal_id").notNull(),
		veterinarianId: uuid("veterinarian_id").notNull(),
		isPrimary: boolean("is_primary").default(false),
		relationshipType: text("relationship_type"), // "primary", "specialist", "emergency"
		notes: text(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("animal_veterinarians_animal_id_idx").using(
			"btree",
			table.animalId.asc().nullsLast().op("uuid_ops"),
		),
		index("animal_veterinarians_veterinarian_id_idx").using(
			"btree",
			table.veterinarianId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.animalId],
			foreignColumns: [vetmedAnimals.id],
			name: "vetmed_animal_veterinarians_animal_id_fk",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.veterinarianId],
			foreignColumns: [vetmedVeterinarians.id],
			name: "vetmed_animal_veterinarians_veterinarian_id_fk",
		}).onDelete("cascade"),
		unique("vetmed_animal_veterinarians_unique").on(
			table.animalId,
			table.veterinarianId,
		),
	],
);

// Animal Medical Records - Normalized medical history
export const vetmedAnimalMedicalRecords = pgTable(
	"vetmed_animal_medical_records",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		animalId: uuid("animal_id").notNull(),
		recordType: text("record_type").notNull(), // "condition", "diagnosis", "procedure", "note"
		title: text().notNull(),
		description: text(),
		diagnosedDate: date("diagnosed_date"),
		severity: vetmedSeverity(),
		status: text().default("active"), // "active", "resolved", "chronic", "monitoring"
		veterinarianId: uuid("veterinarian_id"),
		attachments: text().array(), // URLs to documents/images
		notes: text(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("medical_records_animal_id_idx").using(
			"btree",
			table.animalId.asc().nullsLast().op("uuid_ops"),
		),
		index("medical_records_type_idx").using(
			"btree",
			table.recordType.asc().nullsLast().op("text_ops"),
		),
		index("medical_records_diagnosed_date_idx").using(
			"btree",
			table.diagnosedDate.asc().nullsLast().op("date_ops"),
		),
		foreignKey({
			columns: [table.animalId],
			foreignColumns: [vetmedAnimals.id],
			name: "vetmed_animal_medical_records_animal_id_fk",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.veterinarianId],
			foreignColumns: [vetmedVeterinarians.id],
			name: "vetmed_animal_medical_records_veterinarian_id_fk",
		}).onDelete("set null"),
	],
);

// Animal Allergies - Separate table for better tracking and reporting
export const vetmedAnimalAllergies = pgTable(
	"vetmed_animal_allergies",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		animalId: uuid("animal_id").notNull(),
		allergen: text().notNull(),
		allergenType: vetmedAllergenType("allergen_type"),
		severity: vetmedSeverity(),
		reactionType: text("reaction_type"), // "skin", "respiratory", "digestive", "systemic"
		symptoms: text().array(),
		discoveredDate: date("discovered_date"),
		confirmedBy: uuid("confirmed_by"), // veterinarian_id
		notes: text(),
		isActive: boolean("is_active").default(true),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("animal_allergies_animal_id_idx").using(
			"btree",
			table.animalId.asc().nullsLast().op("uuid_ops"),
		),
		index("animal_allergies_allergen_type_idx").using(
			"btree",
			table.allergenType.asc().nullsLast().op("enum_ops"),
		),
		index("animal_allergies_severity_idx").using(
			"btree",
			table.severity.asc().nullsLast().op("enum_ops"),
		),
		foreignKey({
			columns: [table.animalId],
			foreignColumns: [vetmedAnimals.id],
			name: "vetmed_animal_allergies_animal_id_fk",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.confirmedBy],
			foreignColumns: [vetmedVeterinarians.id],
			name: "vetmed_animal_allergies_confirmed_by_fk",
		}).onDelete("set null"),
	],
);

// =====================================================
// MEDICATION ENTITIES - Properly normalized
// =====================================================

// Core Medication Catalog - Simple and focused
export const vetmedMedications = pgTable(
	"vetmed_medications",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		genericName: text("generic_name").notNull(),
		brandName: text("brand_name"),
		strength: text(),
		route: vetmedRoute().notNull(),
		form: vetmedForm().notNull(),
		controlledSubstance: boolean("controlled_substance")
			.default(false)
			.notNull(),
		commonDosing: text("common_dosing"),
		warnings: text(),
		contraindications: text().array(),
		// Basic dosage info only - complex calculations in separate tables
		concentrationMgMl: numeric("concentration_mg_ml", { precision: 10, scale: 4 }),
		unitsPerTablet: numeric("units_per_tablet", { precision: 10, scale: 4 }),
		unitType: text("unit_type").default("mg"),
		typicalFrequencyHours: integer("typical_frequency_hours"),
		maxFrequencyPerDay: integer("max_frequency_per_day"),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("medications_brand_name_idx").using(
			"btree",
			table.brandName.asc().nullsLast().op("text_ops"),
		),
		index("medications_generic_name_idx").using(
			"btree",
			table.genericName.asc().nullsLast().op("text_ops"),
		),
		index("medications_route_form_idx").using(
			"btree",
			table.route.asc().nullsLast().op("enum_ops"),
			table.form.asc().nullsLast().op("enum_ops"),
		),
	],
);

// Dosage Guidelines - Flexible dosing rules
export const vetmedDosageGuidelines = pgTable(
	"vetmed_dosage_guidelines",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		medicationId: uuid("medication_id").notNull(),
		species: text().notNull(),
		minDoseMgKg: numeric("min_dose_mg_kg", { precision: 10, scale: 4 }),
		maxDoseMgKg: numeric("max_dose_mg_kg", { precision: 10, scale: 4 }),
		typicalDoseMgKg: numeric("typical_dose_mg_kg", { precision: 10, scale: 4 }),
		maxDailyDoseMg: numeric("max_daily_dose_mg", { precision: 10, scale: 2 }),
		typicalFrequencyHours: integer("typical_frequency_hours"),
		maxFrequencyPerDay: integer("max_frequency_per_day"),
		ageMinMonths: integer("age_min_months"),
		ageMaxMonths: integer("age_max_months"),
		weightMinKg: numeric("weight_min_kg", { precision: 5, scale: 2 }),
		weightMaxKg: numeric("weight_max_kg", { precision: 5, scale: 2 }),
		specialInstructions: text("special_instructions"),
		notes: text(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("dosage_guidelines_medication_id_idx").using(
			"btree",
			table.medicationId.asc().nullsLast().op("uuid_ops"),
		),
		index("dosage_guidelines_species_idx").using(
			"btree",
			table.species.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.medicationId],
			foreignColumns: [vetmedMedications.id],
			name: "vetmed_dosage_guidelines_medication_id_fk",
		}).onDelete("cascade"),
	],
);

// Species-specific adjustments
export const vetmedSpeciesAdjustments = pgTable(
	"vetmed_species_adjustments",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		medicationId: uuid("medication_id").notNull(),
		species: text().notNull(),
		doseMultiplier: numeric("dose_multiplier", { precision: 5, scale: 3 }),
		specialInstructions: text("special_instructions"),
		contraindications: text().array(),
		warnings: text().array(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("species_adjustments_medication_id_idx").using(
			"btree",
			table.medicationId.asc().nullsLast().op("uuid_ops"),
		),
		index("species_adjustments_species_idx").using(
			"btree",
			table.species.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.medicationId],
			foreignColumns: [vetmedMedications.id],
			name: "vetmed_species_adjustments_medication_id_fk",
		}).onDelete("cascade"),
		unique("vetmed_species_adjustments_medication_species_unique").on(
			table.medicationId,
			table.species,
		),
	],
);

// Breed-specific considerations
export const vetmedBreedConsiderations = pgTable(
	"vetmed_breed_considerations",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		medicationId: uuid("medication_id").notNull(),
		breed: text().notNull(),
		adjustmentType: text("adjustment_type").notNull(), // "dose_reduction", "contraindicated", "monitoring_required"
		doseMultiplier: numeric("dose_multiplier", { precision: 5, scale: 3 }),
		contraindications: text().array(),
		specialNotes: text("special_notes"),
		geneticFactor: text("genetic_factor"), // e.g., "MDR1 gene"
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("breed_considerations_medication_id_idx").using(
			"btree",
			table.medicationId.asc().nullsLast().op("uuid_ops"),
		),
		index("breed_considerations_breed_idx").using(
			"btree",
			table.breed.asc().nullsLast().op("text_ops"),
		),
		foreignKey({
			columns: [table.medicationId],
			foreignColumns: [vetmedMedications.id],
			name: "vetmed_breed_considerations_medication_id_fk",
		}).onDelete("cascade"),
	],
);

// Route-specific adjustments
export const vetmedRouteAdjustments = pgTable(
	"vetmed_route_adjustments",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		medicationId: uuid("medication_id").notNull(),
		route: vetmedRoute().notNull(),
		doseMultiplier: numeric("dose_multiplier", { precision: 5, scale: 3 }),
		additionalWarnings: text("additional_warnings").array(),
		preparationNotes: text("preparation_notes"),
		administrationNotes: text("administration_notes"),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("route_adjustments_medication_id_idx").using(
			"btree",
			table.medicationId.asc().nullsLast().op("uuid_ops"),
		),
		index("route_adjustments_route_idx").using(
			"btree",
			table.route.asc().nullsLast().op("enum_ops"),
		),
		foreignKey({
			columns: [table.medicationId],
			foreignColumns: [vetmedMedications.id],
			name: "vetmed_route_adjustments_medication_id_fk",
		}).onDelete("cascade"),
		unique("vetmed_route_adjustments_medication_route_unique").on(
			table.medicationId,
			table.route,
		),
	],
);

// =====================================================
// INVENTORY & ADMINISTRATION - Keep existing good design
// =====================================================

// Inventory Items (already well-designed)
export const vetmedInventoryItems = pgTable(
	"vetmed_inventory_items",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		householdId: uuid("household_id").notNull(),
		medicationId: uuid("medication_id").notNull(),
		assignedAnimalId: uuid("assigned_animal_id"),
		brandOverride: text("brand_override"),
		concentration: text(),
		lot: text(),
		expiresOn: date("expires_on").notNull(),
		storage: vetmedStorage().default("ROOM").notNull(),
		quantityUnits: integer("quantity_units"),
		unitsRemaining: integer("units_remaining"),
		unitType: text("unit_type"),
		openedOn: date("opened_on"),
		inUse: boolean("in_use").default(false).notNull(),
		barcode: text(),
		purchaseDate: date("purchase_date"),
		purchasePrice: numeric("purchase_price", { precision: 10, scale: 2 }),
		supplier: text(),
		notes: text(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
	},
	(table) => [
		index("inventory_animal_id_idx").using(
			"btree",
			table.assignedAnimalId.asc().nullsLast().op("uuid_ops"),
		),
		index("inventory_deleted_at_idx").using(
			"btree",
			table.deletedAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("inventory_expires_on_idx").using(
			"btree",
			table.expiresOn.asc().nullsLast().op("date_ops"),
		),
		index("inventory_household_id_idx").using(
			"btree",
			table.householdId.asc().nullsLast().op("uuid_ops"),
		),
		index("inventory_in_use_idx").using(
			"btree",
			table.inUse.asc().nullsLast().op("bool_ops"),
		),
		foreignKey({
			columns: [table.householdId],
			foreignColumns: [vetmedHouseholds.id],
			name: "vetmed_inventory_items_household_id_fk",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.assignedAnimalId],
			foreignColumns: [vetmedAnimals.id],
			name: "vetmed_inventory_items_assigned_animal_id_fk",
		}).onDelete("set null"),
		foreignKey({
			columns: [table.medicationId],
			foreignColumns: [vetmedMedications.id],
			name: "vetmed_inventory_items_medication_id_fk",
		}),
	],
);

// Regimens (already well-designed)
export const vetmedRegimens = pgTable(
	"vetmed_regimens",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		animalId: uuid("animal_id").notNull(),
		medicationId: uuid("medication_id").notNull(),
		name: text(),
		instructions: text(),
		scheduleType: vetmedScheduleType("schedule_type").notNull(),
		timesLocal: time("times_local").array(),
		intervalHours: integer("interval_hours"),
		startDate: date("start_date").notNull(),
		endDate: date("end_date"),
		prnReason: text("prn_reason"),
		maxDailyDoses: integer("max_daily_doses"),
		cutoffMinutes: integer("cutoff_minutes").default(240).notNull(),
		highRisk: boolean("high_risk").default(false).notNull(),
		requiresCoSign: boolean("requires_co_sign").default(false).notNull(),
		active: boolean().default(true).notNull(),
		pausedAt: timestamp("paused_at", { withTimezone: true, mode: "string" }),
		pauseReason: text("pause_reason"),
		dose: text(),
		route: text(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
	},
	(table) => [
		index("regimens_active_idx").using(
			"btree",
			table.active.asc().nullsLast().op("bool_ops"),
		),
		index("regimens_animal_id_idx").using(
			"btree",
			table.animalId.asc().nullsLast().op("uuid_ops"),
		),
		index("regimens_deleted_at_idx").using(
			"btree",
			table.deletedAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("regimens_start_date_idx").using(
			"btree",
			table.startDate.asc().nullsLast().op("date_ops"),
		),
		foreignKey({
			columns: [table.animalId],
			foreignColumns: [vetmedAnimals.id],
			name: "vetmed_regimens_animal_id_fk",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.medicationId],
			foreignColumns: [vetmedMedications.id],
			name: "vetmed_regimens_medication_id_fk",
		}),
	],
);

// Administrations (already well-designed and atomic)
export const vetmedAdministrations = pgTable(
	"vetmed_administrations",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		regimenId: uuid("regimen_id").notNull(),
		animalId: uuid("animal_id").notNull(),
		householdId: uuid("household_id").notNull(),
		caregiverId: uuid("caregiver_id").notNull(),
		scheduledFor: timestamp("scheduled_for", {
			withTimezone: true,
			mode: "string",
		}),
		recordedAt: timestamp("recorded_at", {
			withTimezone: true,
			mode: "string",
		}).notNull(),
		status: vetmedAdminStatus().notNull(),
		sourceItemId: uuid("source_item_id"),
		site: text(),
		dose: text(),
		notes: text(),
		mediaUrls: text("media_urls").array(),
		coSignUserId: uuid("co_sign_user_id"),
		coSignedAt: timestamp("co_signed_at", {
			withTimezone: true,
			mode: "string",
		}),
		coSignNotes: text("co_sign_notes"),
		adverseEvent: boolean("adverse_event").default(false).notNull(),
		adverseEventDescription: text("adverse_event_description"),
		idempotencyKey: text("idempotency_key").notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("administrations_animal_id_idx").using(
			"btree",
			table.animalId.asc().nullsLast().op("uuid_ops"),
		),
		index("administrations_household_id_idx").using(
			"btree",
			table.householdId.asc().nullsLast().op("uuid_ops"),
		),
		index("administrations_idempotency_key_idx").using(
			"btree",
			table.idempotencyKey.asc().nullsLast().op("text_ops"),
		),
		index("administrations_recorded_at_idx").using(
			"btree",
			table.recordedAt.asc().nullsLast().op("timestamptz_ops"),
		),
		index("administrations_regimen_id_idx").using(
			"btree",
			table.regimenId.asc().nullsLast().op("uuid_ops"),
		),
		index("administrations_scheduled_for_idx").using(
			"btree",
			table.scheduledFor.asc().nullsLast().op("timestamptz_ops"),
		),
		index("administrations_status_idx").using(
			"btree",
			table.status.asc().nullsLast().op("enum_ops"),
		),
		foreignKey({
			columns: [table.regimenId],
			foreignColumns: [vetmedRegimens.id],
			name: "vetmed_administrations_regimen_id_fk",
		}),
		foreignKey({
			columns: [table.animalId],
			foreignColumns: [vetmedAnimals.id],
			name: "vetmed_administrations_animal_id_fk",
		}),
		foreignKey({
			columns: [table.householdId],
			foreignColumns: [vetmedHouseholds.id],
			name: "vetmed_administrations_household_id_fk",
		}),
		foreignKey({
			columns: [table.caregiverId],
			foreignColumns: [vetmedUsers.id],
			name: "vetmed_administrations_caregiver_id_fk",
		}),
		foreignKey({
			columns: [table.coSignUserId],
			foreignColumns: [vetmedUsers.id],
			name: "vetmed_administrations_co_sign_user_id_fk",
		}),
		foreignKey({
			columns: [table.sourceItemId],
			foreignColumns: [vetmedInventoryItems.id],
			name: "vetmed_administrations_source_item_id_fk",
		}),
		unique("vetmed_administrations_idempotency_key_unique").on(
			table.idempotencyKey,
		),
	],
);

// =====================================================
// NOTIFICATION SYSTEM - Consolidated and improved
// =====================================================

// Unified Notifications - Consolidated from two separate tables
export const vetmedNotifications = pgTable(
	"vetmed_notifications",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		userId: uuid("user_id").notNull(),
		householdId: uuid("household_id").notNull(),
		type: text().notNull(), // "medication", "inventory", "system", "due", "overdue", "reminder"
		title: text().notNull(),
		message: text().notNull(),
		priority: text().default("medium").notNull(), // "low", "medium", "high", "critical"
		
		// Status workflow: draft -> scheduled -> sent -> delivered -> read/dismissed
		status: vetmedNotificationStatus().default("draft").notNull(),
		
		// Scheduling and delivery
		scheduledFor: timestamp("scheduled_for", {
			withTimezone: true,
			mode: "string",
		}),
		deliveryMethod: vetmedDeliveryMethod("delivery_method").default("in_app"),
		deliveryData: jsonb("delivery_data"), // Method-specific delivery data
		
		// Timing tracking
		sentAt: timestamp("sent_at", { withTimezone: true, mode: "string" }),
		deliveredAt: timestamp("delivered_at", { withTimezone: true, mode: "string" }),
		readAt: timestamp("read_at", { withTimezone: true, mode: "string" }),
		dismissedAt: timestamp("dismissed_at", { withTimezone: true, mode: "string" }),
		snoozedUntil: timestamp("snoozed_until", {
			withTimezone: true,
			mode: "string",
		}),
		
		// Error handling
		attempts: integer().default(0).notNull(),
		lastError: text("last_error"),
		failedAt: timestamp("failed_at", { withTimezone: true, mode: "string" }),
		
		// Metadata
		actionUrl: text("action_url"),
		data: jsonb(), // Additional context data (animalId, regimenId, etc.)
		
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("notifications_user_status_idx").using(
			"btree",
			table.userId.asc().nullsLast().op("uuid_ops"),
			table.status.asc().nullsLast().op("enum_ops"),
		),
		index("notifications_household_idx").using(
			"btree",
			table.householdId.asc().nullsLast().op("uuid_ops"),
		),
		index("notifications_created_at_idx").using(
			"btree",
			table.createdAt.desc().nullsLast().op("timestamptz_ops"),
		),
		index("notifications_scheduled_for_idx").using(
			"btree",
			table.scheduledFor.asc().nullsLast().op("timestamptz_ops"),
		),
		index("notifications_type_idx").using(
			"btree",
			table.type.asc().nullsLast().op("text_ops"),
		),
		index("notifications_priority_idx").using(
			"btree",
			table.priority.asc().nullsLast().op("text_ops"),
		),
		// Partial index for unread notifications (most common query)
		index("notifications_user_unread_idx").using(
			"btree",
			table.userId.asc().nullsLast().op("uuid_ops"),
			table.createdAt.desc().nullsLast().op("timestamptz_ops"),
		).where(sql`status IN ('sent', 'delivered') AND read_at IS NULL AND dismissed_at IS NULL`),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [vetmedUsers.id],
			name: "vetmed_notifications_user_id_fk",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.householdId],
			foreignColumns: [vetmedHouseholds.id],
			name: "vetmed_notifications_household_id_fk",
		}).onDelete("cascade"),
	],
);

// =====================================================
// SYSTEM TABLES - Audit, suggestions, etc. (keep existing design)
// =====================================================

// Audit Log (already well-designed)
export const vetmedAuditLog = pgTable(
	"vetmed_audit_log",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		userId: uuid("user_id").notNull(),
		householdId: uuid("household_id").notNull(),
		action: text().notNull(),
		resourceType: text("resource_type").notNull(),
		resourceId: uuid("resource_id"),
		oldValues: jsonb("old_values"),
		newValues: jsonb("new_values"),
		details: jsonb(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		sessionId: text("session_id"),
		timestamp: timestamp({ withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("audit_household_id_idx").using(
			"btree",
			table.householdId.asc().nullsLast().op("uuid_ops"),
		),
		index("audit_resource_idx").using(
			"btree",
			table.resourceType.asc().nullsLast().op("text_ops"),
			table.resourceId.asc().nullsLast().op("uuid_ops"),
		),
		index("audit_timestamp_idx").using(
			"btree",
			table.timestamp.asc().nullsLast().op("timestamptz_ops"),
		),
		index("audit_user_id_idx").using(
			"btree",
			table.userId.asc().nullsLast().op("uuid_ops"),
		),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [vetmedUsers.id],
			name: "vetmed_audit_log_user_id_fk",
		}),
		foreignKey({
			columns: [table.householdId],
			foreignColumns: [vetmedHouseholds.id],
			name: "vetmed_audit_log_household_id_fk",
		}),
	],
);

// Suggestions (keep existing design)
export const vetmedSuggestions = pgTable(
	"vetmed_suggestions",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		householdId: uuid("household_id").notNull(),
		type: text().notNull(),
		summary: text().notNull(),
		rationale: text().notNull(),
		priority: text().default("medium").notNull(),
		estimatedImpact: text("estimated_impact"),
		status: vetmedSuggestionStatus().default("pending").notNull(),
		action: jsonb().notNull(),
		originalValues: jsonb("original_values"),
		appliedAt: timestamp("applied_at", { withTimezone: true, mode: "string" }),
		appliedByUserId: uuid("applied_by_user_id"),
		revertedAt: timestamp("reverted_at", { withTimezone: true, mode: "string" }),
		revertedByUserId: uuid("reverted_by_user_id"),
		dismissedAt: timestamp("dismissed_at", { withTimezone: true, mode: "string" }),
		dismissedByUserId: uuid("dismissed_by_user_id"),
		expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" }),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("suggestions_household_id_idx").using(
			"btree",
			table.householdId.asc().nullsLast().op("uuid_ops"),
		),
		index("suggestions_status_idx").using(
			"btree",
			table.status.asc().nullsLast().op("enum_ops"),
		),
		index("suggestions_type_idx").using(
			"btree",
			table.type.asc().nullsLast().op("text_ops"),
		),
		index("suggestions_created_at_idx").using(
			"btree",
			table.createdAt.desc().nullsLast().op("timestamptz_ops"),
		),
		foreignKey({
			columns: [table.householdId],
			foreignColumns: [vetmedHouseholds.id],
			name: "vetmed_suggestions_household_id_fk",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.appliedByUserId],
			foreignColumns: [vetmedUsers.id],
			name: "vetmed_suggestions_applied_by_user_id_fk",
		}).onDelete("set null"),
		foreignKey({
			columns: [table.revertedByUserId],
			foreignColumns: [vetmedUsers.id],
			name: "vetmed_suggestions_reverted_by_user_id_fk",
		}).onDelete("set null"),
		foreignKey({
			columns: [table.dismissedByUserId],
			foreignColumns: [vetmedUsers.id],
			name: "vetmed_suggestions_dismissed_by_user_id_fk",
		}).onDelete("set null"),
	],
);

// Co-sign requests (keep existing design)
export const vetmedCosignRequests = pgTable(
	"vetmed_cosign_requests",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		administrationId: uuid("administration_id").notNull(),
		requesterId: uuid("requester_id").notNull(),
		cosignerId: uuid("cosigner_id").notNull(),
		householdId: uuid("household_id").notNull(),
		status: vetmedCosignStatus().default("pending").notNull(),
		signature: text(),
		rejectionReason: text("rejection_reason"),
		signedAt: timestamp("signed_at", { withTimezone: true, mode: "string" }),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		expiresAt: timestamp("expires_at", { withTimezone: true, mode: "string" })
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("cosign_requests_administration_id_idx").using(
			"btree",
			table.administrationId.asc().nullsLast().op("uuid_ops"),
		),
		index("cosign_requests_requester_id_idx").using(
			"btree",
			table.requesterId.asc().nullsLast().op("uuid_ops"),
		),
		index("cosign_requests_cosigner_id_idx").using(
			"btree",
			table.cosignerId.asc().nullsLast().op("uuid_ops"),
		),
		index("cosign_requests_household_id_idx").using(
			"btree",
			table.householdId.asc().nullsLast().op("uuid_ops"),
		),
		index("cosign_requests_status_idx").using(
			"btree",
			table.status.asc().nullsLast().op("enum_ops"),
		),
		index("cosign_requests_expires_at_idx").using(
			"btree",
			table.expiresAt.asc().nullsLast().op("timestamptz_ops"),
		),
		foreignKey({
			columns: [table.administrationId],
			foreignColumns: [vetmedAdministrations.id],
			name: "vetmed_cosign_requests_administration_id_fk",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.requesterId],
			foreignColumns: [vetmedUsers.id],
			name: "vetmed_cosign_requests_requester_id_fk",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.cosignerId],
			foreignColumns: [vetmedUsers.id],
			name: "vetmed_cosign_requests_cosigner_id_fk",
		}).onDelete("cascade"),
		foreignKey({
			columns: [table.householdId],
			foreignColumns: [vetmedHouseholds.id],
			name: "vetmed_cosign_requests_household_id_fk",
		}).onDelete("cascade"),
		unique("vetmed_cosign_requests_administration_id_unique").on(
			table.administrationId,
		),
	],
);

// Push Subscriptions (keep existing design)
export const vetmedPushSubscriptions = pgTable(
	"vetmed_push_subscriptions",
	{
		id: uuid().defaultRandom().primaryKey().notNull(),
		userId: uuid("user_id").notNull(),
		endpoint: text().notNull(),
		p256dhKey: text("p256dh_key").notNull(),
		authKey: text("auth_key").notNull(),
		userAgent: text("user_agent"),
		deviceName: text("device_name"),
		isActive: boolean("is_active").default(true).notNull(),
		lastUsed: timestamp("last_used", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
			.defaultNow()
			.notNull(),
	},
	(table) => [
		index("push_subscription_user_idx").using(
			"btree",
			table.userId.asc().nullsLast().op("uuid_ops"),
		),
		index("push_subscription_endpoint_idx").using(
			"btree",
			table.endpoint.asc().nullsLast().op("text_ops"),
		),
		index("push_subscription_active_idx").using(
			"btree",
			table.isActive.asc().nullsLast().op("bool_ops"),
		),
		unique("vetmed_push_subscriptions_endpoint_unique").on(table.endpoint),
		foreignKey({
			columns: [table.userId],
			foreignColumns: [vetmedUsers.id],
			name: "vetmed_push_subscriptions_user_id_fk",
		}).onDelete("cascade"),
	],
);

// =====================================================
// ALIASES & EXPORTS - Maintain compatibility
// =====================================================

// Export main tables with both original and short names for compatibility
export const users = vetmedUsers;
export const userProfiles = vetmedUserProfiles;
export const userPreferences = vetmedUserPreferences;
export const emergencyContacts = vetmedEmergencyContacts;
export const animals = vetmedAnimals;
export const animalVeterinarians = vetmedAnimalVeterinarians;
export const animalMedicalRecords = vetmedAnimalMedicalRecords;
export const animalAllergies = vetmedAnimalAllergies;
export const veterinarians = vetmedVeterinarians;
export const households = vetmedHouseholds;
export const memberships = vetmedMemberships;
export const medications = vetmedMedications;
export const dosageGuidelines = vetmedDosageGuidelines;
export const speciesAdjustments = vetmedSpeciesAdjustments;
export const breedConsiderations = vetmedBreedConsiderations;
export const routeAdjustments = vetmedRouteAdjustments;
export const inventoryItems = vetmedInventoryItems;
export const regimens = vetmedRegimens;
export const administrations = vetmedAdministrations;
export const auditLog = vetmedAuditLog;
export const notifications = vetmedNotifications;
export const suggestions = vetmedSuggestions;
export const cosignRequests = vetmedCosignRequests;
export const pushSubscriptions = vetmedPushSubscriptions;

// Legacy compatibility exports (to be deprecated)
export const medicationCatalog = vetmedMedications;
export const notificationQueue = vetmedNotifications; // Consolidated into main notifications table

// Export enum types and utilities
export const adminStatusEnum = vetmedAdminStatus;
export const roleEnum = vetmedRole;
export const scheduleTypeEnum = vetmedScheduleType;
export const routeEnum = vetmedRoute;
export const formEnum = vetmedForm;
export const storageEnum = vetmedStorage;
export const cosignStatusEnum = vetmedCosignStatus;
export const notificationStatusEnum = vetmedNotificationStatus;
export const deliveryMethodEnum = vetmedDeliveryMethod;
export const severityEnum = vetmedSeverity;
export const allergenTypeEnum = vetmedAllergenType;

// Type exports for easier use
export type NewUser = typeof vetmedUsers.$inferInsert;
export type NewUserProfile = typeof vetmedUserProfiles.$inferInsert;
export type NewUserPreferences = typeof vetmedUserPreferences.$inferInsert;
export type NewEmergencyContact = typeof vetmedEmergencyContacts.$inferInsert;
export type NewAnimal = typeof vetmedAnimals.$inferInsert;
export type NewAnimalMedicalRecord = typeof vetmedAnimalMedicalRecords.$inferInsert;
export type NewAnimalAllergy = typeof vetmedAnimalAllergies.$inferInsert;
export type NewVeterinarian = typeof vetmedVeterinarians.$inferInsert;
export type NewHousehold = typeof vetmedHouseholds.$inferInsert;
export type NewMembership = typeof vetmedMemberships.$inferInsert;
export type NewMedication = typeof vetmedMedications.$inferInsert;
export type NewDosageGuideline = typeof vetmedDosageGuidelines.$inferInsert;
export type NewInventoryItem = typeof vetmedInventoryItems.$inferInsert;
export type NewRegimen = typeof vetmedRegimens.$inferInsert;
export type NewAdministration = typeof vetmedAdministrations.$inferInsert;
export type NewNotification = typeof vetmedNotifications.$inferInsert;
export type NewSuggestion = typeof vetmedSuggestions.$inferInsert;
export type NewCosignRequest = typeof vetmedCosignRequests.$inferInsert;
export type NewPushSubscription = typeof vetmedPushSubscriptions.$inferInsert;