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
  actionUrl: z.string().optional(),
  data: z.record(z.string(), z.any()).optional(),
  householdId: z.uuid(),
  message: z.string().min(1).max(500),
  priority: notificationPrioritySchema.default("medium"),
  title: z.string().min(1).max(200),
  type: notificationTypeSchema,
  userId: z.uuid(),
});

export const updateNotificationSchema = z.object({
  dismissed: z.boolean().optional(),
  read: z.boolean().optional(),
});

export const notificationFiltersSchema = z.object({
  dismissed: z.boolean().optional(),
  householdId: z.uuid().optional(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  priority: notificationPrioritySchema.optional(),
  read: z.boolean().optional(),
  type: notificationTypeSchema.optional(),
  unreadOnly: z.boolean().default(false),
});

export type NotificationType = z.infer<typeof notificationTypeSchema>;
export type NotificationPriority = z.infer<typeof notificationPrioritySchema>;
export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
export type UpdateNotificationInput = z.infer<typeof updateNotificationSchema>;
export type NotificationFilters = z.infer<typeof notificationFiltersSchema>;
