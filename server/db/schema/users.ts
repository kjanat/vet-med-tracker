import { relations } from "drizzle-orm";
import {
	boolean,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";

// User roles enum
export const roleEnum = pgEnum("vetmed_role", [
	"OWNER",
	"CAREGIVER",
	"VETREADONLY",
]);

// Temperature unit enum
export const temperatureUnitEnum = pgEnum("temperature_unit", [
	"celsius",
	"fahrenheit",
]);

// Weight unit enum
export const weightUnitEnum = pgEnum("weight_unit", ["kg", "lbs"]);

// Users table
export const users = pgTable("vetmed_users", {
	id: uuid("id").defaultRandom().primaryKey(),
	clerkUserId: text("clerk_user_id").unique(), // Link to Clerk user
	email: text("email").notNull().unique(),
	name: text("name"),
	image: text("image"),
	emailVerified: timestamp("email_verified", { withTimezone: true }),

	// Profile information
	preferredTimezone: text("preferred_timezone").default("America/New_York"),
	preferredPhoneNumber: text("preferred_phone_number"),

	// Display preferences
	use24HourTime: boolean("use_24_hour_time").default(false),
	temperatureUnit:
		temperatureUnitEnum("temperature_unit").default("fahrenheit"),
	weightUnit: weightUnitEnum("weight_unit").default("lbs"),

	// Notification preferences
	emailReminders: boolean("email_reminders").default(true),
	smsReminders: boolean("sms_reminders").default(false),
	pushNotifications: boolean("push_notifications").default(true),
	reminderLeadTimeMinutes: text("reminder_lead_time_minutes").default("15"), // stored as string for flexibility

	// Emergency contact
	emergencyContactName: text("emergency_contact_name"),
	emergencyContactPhone: text("emergency_contact_phone"),

	// Onboarding status
	onboardingComplete: boolean("onboarding_complete").default(false),
	onboardingCompletedAt: timestamp("onboarding_completed_at", {
		withTimezone: true,
	}),

	// Full preferences backup (stored as JSON for complex nested data)
	preferencesBackup: jsonb("preferences_backup"), // For storing complete Clerk metadata backup

	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
	memberships: many(memberships),
	administrations: many(administrations),
}));

// Type exports
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

// Import other tables for relations (circular dependency handled by Drizzle)
import { memberships } from "./households";
import { administrations } from "./regimens";
