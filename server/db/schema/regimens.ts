import { relations } from "drizzle-orm";
import {
	boolean,
	date,
	index,
	integer,
	pgEnum,
	pgTable,
	text,
	time,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { animals } from "./animals";
import { households } from "./households";
import { inventoryItems, medicationCatalog } from "./medications";
import { users } from "./users";

// Enums
export const scheduleTypeEnum = pgEnum("vetmed_schedule_type", [
	"FIXED",
	"PRN",
	"INTERVAL",
	"TAPER",
]);
export const adminStatusEnum = pgEnum("vetmed_admin_status", [
	"ON_TIME",
	"LATE",
	"VERY_LATE",
	"MISSED",
	"PRN",
]);

// Regimens (medication plans)
export const regimens = pgTable(
	"vetmed_regimens",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		animalId: uuid("animal_id")
			.notNull()
			.references(() => animals.id, { onDelete: "cascade" }),
		medicationId: uuid("medication_id")
			.notNull()
			.references(() => medicationCatalog.id),

		// Display information
		name: text("name"), // Optional custom name like "Morning antibiotics"
		instructions: text("instructions"), // Free text instructions

		// Schedule configuration
		scheduleType: scheduleTypeEnum("schedule_type").notNull(),
		timesLocal: time("times_local").array(), // ["08:00", "18:00"] for FIXED
		intervalHours: integer("interval_hours"), // For INTERVAL type (e.g., q8h)

		// Duration
		startDate: date("start_date").notNull(),
		endDate: date("end_date"), // null = ongoing

		// PRN configuration
		prnReason: text("prn_reason"), // "for pain", "for anxiety"
		maxDailyDoses: integer("max_daily_doses"), // For PRN

		// Safety configuration
		cutoffMinutes: integer("cutoff_minutes").notNull().default(240), // Minutes after scheduled time before auto-miss
		highRisk: boolean("high_risk").default(false).notNull(), // Requires co-sign
		requiresCoSign: boolean("requires_co_sign").default(false).notNull(),

		// Status
		active: boolean("active").default(true).notNull(),
		pausedAt: timestamp("paused_at", { withTimezone: true }),
		pauseReason: text("pause_reason"),

		// Dosing information (display only, not calculation)
		dose: text("dose"), // "1 tablet", "2.5 ml"
		route: text("route"), // Can override medication catalog

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	(table) => ({
		// Indexes for common queries
		animalIdIdx: index("regimen_animal_id_idx").on(table.animalId),
		activeIdx: index("regimen_active_idx").on(table.active),
		startDateIdx: index("regimen_start_date_idx").on(table.startDate),
		deletedAtIdx: index("regimen_deleted_at_idx").on(table.deletedAt),
	}),
);

// Administrations (recorded medication events)
export const administrations = pgTable(
	"vetmed_administrations",
	{
		id: uuid("id").defaultRandom().primaryKey(),

		// Core relationships
		regimenId: uuid("regimen_id")
			.notNull()
			.references(() => regimens.id),
		animalId: uuid("animal_id")
			.notNull()
			.references(() => animals.id),
		householdId: uuid("household_id")
			.notNull()
			.references(() => households.id),
		caregiverId: uuid("caregiver_id")
			.notNull()
			.references(() => users.id),

		// Timing
		scheduledFor: timestamp("scheduled_for", { withTimezone: true }), // null for PRN
		recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull(),

		// Status
		status: adminStatusEnum("status").notNull(),

		// Source tracking
		sourceItemId: uuid("source_item_id").references(() => inventoryItems.id),

		// Administration details
		site: text("site"), // "left ear", "scruff", etc.
		dose: text("dose"), // Actual dose given (may differ from regimen)
		notes: text("notes"),

		// Media
		mediaUrls: text("media_urls").array(),

		// Co-signing
		coSignUserId: uuid("co_sign_user_id").references(() => users.id),
		coSignedAt: timestamp("co_signed_at", { withTimezone: true }),
		coSignNotes: text("co_sign_notes"),

		// Adverse events
		adverseEvent: boolean("adverse_event").default(false).notNull(),
		adverseEventDescription: text("adverse_event_description"),

		// Idempotency
		idempotencyKey: text("idempotency_key").notNull().unique(),

		// Audit
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => ({
		// Indexes for common queries
		regimenIdIdx: index("admin_regimen_id_idx").on(table.regimenId),
		animalIdIdx: index("admin_animal_id_idx").on(table.animalId),
		householdIdIdx: index("admin_household_id_idx").on(table.householdId),
		scheduledForIdx: index("admin_scheduled_for_idx").on(table.scheduledFor),
		recordedAtIdx: index("admin_recorded_at_idx").on(table.recordedAt),
		statusIdx: index("admin_status_idx").on(table.status),
		idempotencyKeyIdx: index("admin_idempotency_key_idx").on(
			table.idempotencyKey,
		),
	}),
);

// Relations
export const regimensRelations = relations(regimens, ({ one, many }) => ({
	animal: one(animals, {
		fields: [regimens.animalId],
		references: [animals.id],
	}),
	medication: one(medicationCatalog, {
		fields: [regimens.medicationId],
		references: [medicationCatalog.id],
	}),
	administrations: many(administrations),
}));

export const administrationsRelations = relations(
	administrations,
	({ one }) => ({
		regimen: one(regimens, {
			fields: [administrations.regimenId],
			references: [regimens.id],
		}),
		animal: one(animals, {
			fields: [administrations.animalId],
			references: [animals.id],
		}),
		household: one(households, {
			fields: [administrations.householdId],
			references: [households.id],
		}),
		caregiver: one(users, {
			fields: [administrations.caregiverId],
			references: [users.id],
		}),
		coSignUser: one(users, {
			fields: [administrations.coSignUserId],
			references: [users.id],
		}),
		sourceItem: one(inventoryItems, {
			fields: [administrations.sourceItemId],
			references: [inventoryItems.id],
		}),
	}),
);

// Type exports
export type Regimen = typeof regimens.$inferSelect;
export type NewRegimen = typeof regimens.$inferInsert;
export type Administration = typeof administrations.$inferSelect;
export type NewAdministration = typeof administrations.$inferInsert;
