import { z } from "zod";

export const notificationTypeSchema = z.enum([
  "medication",
  "inventory",
  "system",
  "due",
  "overdue",
  "reminder",
  "alert",
]);

export const notificationPrioritySchema = z.enum([
  "low",
  "medium",
  "high",
  "critical",
]);

export const createNotificationSchema = z.object({
  userId: z.uuid(),
  householdId: z.uuid(),
  type: notificationTypeSchema,
  title: z.string().min(1).max(200),
  message: z.string().min(1).max(500),
  priority: notificationPrioritySchema.default("medium"),
  actionUrl: z.string().optional(),
  data: z.record(z.string(), z.any()).optional(),
});

export const updateNotificationSchema = z.object({
  read: z.boolean().optional(),
  dismissed: z.boolean().optional(),
});

export const notificationFiltersSchema = z.object({
  householdId: z.uuid().optional(),
  type: notificationTypeSchema.optional(),
  priority: notificationPrioritySchema.optional(),
  read: z.boolean().optional(),
  dismissed: z.boolean().optional(),
  unreadOnly: z.boolean().default(false),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export type NotificationType = z.infer<typeof notificationTypeSchema>;
export type NotificationPriority = z.infer<typeof notificationPrioritySchema>;
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type UpdateNotificationInput = z.infer<typeof updateNotificationSchema>;
export type NotificationFilters = z.infer<typeof notificationFiltersSchema>;
