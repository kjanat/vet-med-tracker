import {
	pgTable,
	text,
	timestamp,
	uuid,
	unique,
	index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { users, roleEnum } from "./users";

// Households table
export const households = pgTable("vetmed_households", {
	id: uuid("id").defaultRandom().primaryKey(),
	name: text("name").notNull(),
	timezone: text("timezone").notNull().default("America/New_York"),
	createdAt: timestamp("created_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true })
		.defaultNow()
		.notNull(),
});

// Membership table (many-to-many between users and households)
export const memberships = pgTable(
	"vetmed_memberships",
	{
		id: uuid("id").defaultRandom().primaryKey(),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		householdId: uuid("household_id")
			.notNull()
			.references(() => households.id, { onDelete: "cascade" }),
		role: roleEnum("role").notNull().default("CAREGIVER"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => ({
		// Ensure a user can only have one membership per household
		uniqueUserHousehold: unique().on(table.userId, table.householdId),
		// Indexes for common queries
		userIdIdx: index("membership_user_id_idx").on(table.userId),
		householdIdIdx: index("membership_household_id_idx").on(table.householdId),
	}),
);

// Relations
export const householdsRelations = relations(households, ({ many }) => ({
	memberships: many(memberships),
	animals: many(animals),
	inventoryItems: many(inventoryItems),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
	user: one(users, {
		fields: [memberships.userId],
		references: [users.id],
	}),
	household: one(households, {
		fields: [memberships.householdId],
		references: [households.id],
	}),
}));

// Type exports
export type Household = typeof households.$inferSelect;
export type NewHousehold = typeof households.$inferInsert;
export type Membership = typeof memberships.$inferSelect;
export type NewMembership = typeof memberships.$inferInsert;

// Import other tables for relations
import { animals } from "./animals";
import { inventoryItems } from "./medications";
