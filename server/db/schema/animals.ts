import { relations } from "drizzle-orm";
import {
	boolean,
	date,
	decimal,
	index,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { households } from "./households";

// Animals table
export const animals = pgTable(
	"vetmed_animals",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		householdId: uuid("household_id")
			.notNull()
			.references(() => households.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		species: text("species").notNull(), // dog, cat, rabbit, etc.
		breed: text("breed"),
		sex: text("sex"), // male, female
		neutered: boolean("neutered").default(false).notNull(),
		dob: date("dob"),
		weightKg: decimal("weight_kg", { precision: 5, scale: 2 }),
		microchipId: text("microchip_id"),
		color: text("color"),
		photoUrl: text("photo_url"),
		timezone: text("timezone").notNull().default("America/New_York"), // Can override household timezone

		// Vet information
		vetName: text("vet_name"),
		vetPhone: text("vet_phone"),
		vetEmail: text("vet_email"),
		clinicName: text("clinic_name"),

		// Health information stored as JSON arrays for flexibility
		allergies: text("allergies").array(),
		conditions: text("conditions").array(),
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
		// Index for household queries
		householdIdIdx: index("animal_household_id_idx").on(table.householdId),
		// Index for soft delete queries
		deletedAtIdx: index("animal_deleted_at_idx").on(table.deletedAt),
	}),
);

// Relations
export const animalsRelations = relations(animals, ({ one, many }) => ({
	household: one(households, {
		fields: [animals.householdId],
		references: [households.id],
	}),
	regimens: many(regimens),
	administrations: many(administrations),
}));

// Type exports
export type Animal = typeof animals.$inferSelect;
export type NewAnimal = typeof animals.$inferInsert;

// Import other tables for relations
import { administrations, regimens } from "./regimens";
