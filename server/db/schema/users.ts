import { pgTable, text, timestamp, uuid, pgEnum } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// User roles enum
export const roleEnum = pgEnum("vetmed_role", [
	"OWNER",
	"CAREGIVER",
	"VETREADONLY",
]);

// Users table
export const users = pgTable("vetmed_users", {
	id: uuid("id").defaultRandom().primaryKey(),
	email: text("email").notNull().unique(),
	name: text("name"),
	image: text("image"),
	emailVerified: timestamp("email_verified", { withTimezone: true }),
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
