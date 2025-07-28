import {
	pgTable,
	text,
	timestamp,
	uuid,
	integer,
	boolean,
	date,
	decimal,
	index,
	pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { households } from "./households";
import { animals } from "./animals";

// Enums
export const routeEnum = pgEnum("vetmed_route", [
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

export const formEnum = pgEnum("vetmed_form", [
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

export const storageEnum = pgEnum("vetmed_storage", [
	"ROOM",
	"FRIDGE",
	"FREEZER",
	"CONTROLLED",
]);

// Medication Catalog (shared reference data)
export const medicationCatalog = pgTable(
	"vetmed_medication_catalog",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		genericName: text("generic_name").notNull(),
		brandName: text("brand_name"),
		strength: text("strength"), // "250 mg", "U100", etc.
		route: routeEnum("route").notNull(),
		form: formEnum("form").notNull(),
		controlledSubstance: boolean("controlled_substance")
			.default(false)
			.notNull(),

		// Common dosing information (for reference only, not prescribing)
		commonDosing: text("common_dosing"),
		warnings: text("warnings"),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => ({
		// Index for searching medications
		genericNameIdx: index("med_catalog_generic_name_idx").on(table.genericName),
		brandNameIdx: index("med_catalog_brand_name_idx").on(table.brandName),
	}),
);

// Inventory Items (household-specific medication stock)
export const inventoryItems = pgTable(
	"vetmed_inventory_items",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		householdId: uuid("household_id")
			.notNull()
			.references(() => households.id, { onDelete: "cascade" }),
		medicationId: uuid("medication_id")
			.notNull()
			.references(() => medicationCatalog.id),
		assignedAnimalId: uuid("assigned_animal_id").references(() => animals.id, {
			onDelete: "set null",
		}),

		// Override catalog info if needed
		brandOverride: text("brand_override"),
		concentration: text("concentration"), // For liquids: "5mg/ml"

		// Stock information
		lot: text("lot"),
		expiresOn: date("expires_on").notNull(),
		storage: storageEnum("storage").notNull().default("ROOM"),

		// Quantity tracking
		quantityUnits: integer("quantity_units"), // Number of pills, ml, etc.
		unitsRemaining: integer("units_remaining"),
		unitType: text("unit_type"), // "tablets", "ml", "vials"

		// Usage tracking
		openedOn: date("opened_on"),
		inUse: boolean("in_use").default(false).notNull(),

		// Barcode for scanning
		barcode: text("barcode"),

		// Purchase information
		purchaseDate: date("purchase_date"),
		purchasePrice: decimal("purchase_price", { precision: 10, scale: 2 }),
		supplier: text("supplier"),

		notes: text("notes"),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		deletedAt: timestamp("deleted_at", { withTimezone: true }), // Soft delete
	},
	(table) => ({
		// Indexes for common queries
		householdIdIdx: index("inventory_household_id_idx").on(table.householdId),
		animalIdIdx: index("inventory_animal_id_idx").on(table.assignedAnimalId),
		expiresOnIdx: index("inventory_expires_on_idx").on(table.expiresOn),
		inUseIdx: index("inventory_in_use_idx").on(table.inUse),
		deletedAtIdx: index("inventory_deleted_at_idx").on(table.deletedAt),
	}),
);

// Relations
export const medicationCatalogRelations = relations(
	medicationCatalog,
	({ many }) => ({
		inventoryItems: many(inventoryItems),
		regimens: many(regimens),
	}),
);

export const inventoryItemsRelations = relations(
	inventoryItems,
	({ one, many }) => ({
		household: one(households, {
			fields: [inventoryItems.householdId],
			references: [households.id],
		}),
		medication: one(medicationCatalog, {
			fields: [inventoryItems.medicationId],
			references: [medicationCatalog.id],
		}),
		assignedAnimal: one(animals, {
			fields: [inventoryItems.assignedAnimalId],
			references: [animals.id],
		}),
		administrations: many(administrations),
	}),
);

// Type exports
export type MedicationCatalog = typeof medicationCatalog.$inferSelect;
export type NewMedicationCatalog = typeof medicationCatalog.$inferInsert;
export type InventoryItem = typeof inventoryItems.$inferSelect;
export type NewInventoryItem = typeof inventoryItems.$inferInsert;

// Import for relations
import { regimens, administrations } from "./regimens";
