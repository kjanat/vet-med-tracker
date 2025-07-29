import { relations } from "drizzle-orm";
import {
	index,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { households } from "./households";
import { users } from "./users";

// Audit log for all data modifications
export const auditLog = pgTable(
	"vetmed_audit_log",
	{
		id: uuid("id").defaultRandom().primaryKey(),

		// Who performed the action
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id),
		householdId: uuid("household_id")
			.notNull()
			.references(() => households.id),

		// What action was performed
		action: text("action").notNull(), // CREATE, UPDATE, DELETE, etc.
		resourceType: text("resource_type").notNull(), // animal, regimen, administration, etc.
		resourceId: uuid("resource_id"),

		// Details of the change
		oldValues: jsonb("old_values"),
		newValues: jsonb("new_values"),
		details: jsonb("details"), // Additional context

		// Request information
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		sessionId: text("session_id"),

		// When it happened
		timestamp: timestamp("timestamp", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => ({
		// Indexes for audit queries
		userIdIdx: index("audit_user_id_idx").on(table.userId),
		householdIdIdx: index("audit_household_id_idx").on(table.householdId),
		timestampIdx: index("audit_timestamp_idx").on(table.timestamp),
		resourceIdx: index("audit_resource_idx").on(
			table.resourceType,
			table.resourceId,
		),
	}),
);

// Notification queue for reminders
export const notificationQueue = pgTable(
	"vetmed_notification_queue",
	{
		id: uuid("id").defaultRandom().primaryKey(),

		// Target
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id),
		householdId: uuid("household_id")
			.notNull()
			.references(() => households.id),

		// Notification details
		type: text("type").notNull(), // MEDICATION_DUE, MEDICATION_LATE, INVENTORY_LOW, etc.
		title: text("title").notNull(),
		body: text("body").notNull(),
		data: jsonb("data"), // Additional payload

		// Scheduling
		scheduledFor: timestamp("scheduled_for", { withTimezone: true }).notNull(),

		// Status
		sentAt: timestamp("sent_at", { withTimezone: true }),
		failedAt: timestamp("failed_at", { withTimezone: true }),
		error: text("error"),
		attempts: integer("attempts").default(0).notNull(),

		// User interaction
		readAt: timestamp("read_at", { withTimezone: true }),
		dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
		snoozedUntil: timestamp("snoozed_until", { withTimezone: true }),

		createdAt: timestamp("created_at", { withTimezone: true })
			.defaultNow()
			.notNull(),
	},
	(table) => ({
		// Indexes for notification processing
		scheduledForIdx: index("notification_scheduled_for_idx").on(
			table.scheduledFor,
		),
		sentAtIdx: index("notification_sent_at_idx").on(table.sentAt),
		userIdIdx: index("notification_user_id_idx").on(table.userId),
	}),
);

// Relations
export const auditLogRelations = relations(auditLog, ({ one }) => ({
	user: one(users, {
		fields: [auditLog.userId],
		references: [users.id],
	}),
	household: one(households, {
		fields: [auditLog.householdId],
		references: [households.id],
	}),
}));

export const notificationQueueRelations = relations(
	notificationQueue,
	({ one }) => ({
		user: one(users, {
			fields: [notificationQueue.userId],
			references: [users.id],
		}),
		household: one(households, {
			fields: [notificationQueue.householdId],
			references: [households.id],
		}),
	}),
);

// Type exports
export type AuditLog = typeof auditLog.$inferSelect;
export type NewAuditLog = typeof auditLog.$inferInsert;
export type NotificationQueue = typeof notificationQueue.$inferSelect;
export type NewNotificationQueue = typeof notificationQueue.$inferInsert;

// Import for integer type
import { integer } from "drizzle-orm/pg-core";
