/**
 * Zod schemas for push notification validation
 */

import { z } from "zod";

/**
 * Standard Web Push subscription format
 */
export const pushSubscriptionSchema = z.object({
  endpoint: z.url("Invalid endpoint URL"),
  keys: z.object({
    auth: z.string().min(1, "auth key is required"),
    p256dh: z.string().min(1, "p256dh key is required"),
  }),
});

/**
 * Extended subscription with device info
 */
export const pushSubscriptionWithDeviceSchema = pushSubscriptionSchema.extend({
  deviceInfo: z
    .object({
      deviceName: z.string().optional(),
      userAgent: z.string().optional(),
    })
    .optional(),
});

/**
 * Database push subscription record
 */
export const pushSubscriptionRecordSchema = z.object({
  authKey: z.string(),
  createdAt: z.iso.datetime(),
  deviceName: z.string().nullable(),
  endpoint: z.url(),
  id: z.uuid(),
  isActive: z.boolean(),
  lastUsed: z.iso.datetime(),
  p256dhKey: z.string(),
  updatedAt: z.iso.datetime(),
  userAgent: z.string().nullable(),
  userId: z.uuid(),
});

/**
 * Push notification payload
 */
export const pushNotificationPayloadSchema = z.object({
  actions: z
    .array(
      z.object({
        action: z.string(),
        icon: z.url().optional(),
        title: z.string(),
      }),
    )
    .optional(),
  badge: z.url().optional(),
  body: z.string().min(1, "Body is required"),
  data: z.record(z.string(), z.any()).optional(),
  icon: z.url().optional(),
  image: z.url().optional(),
  requireInteraction: z.boolean().optional(),
  silent: z.boolean().optional(),
  tag: z.string().optional(),
  timestamp: z.number().optional(),
  title: z.string().min(1, "Title is required"),
  ttl: z.number().optional(),
  urgency: z.enum(["very-low", "low", "normal", "high"]).optional(),
});

/**
 * Medication reminder notification
 */
export const medicationReminderSchema = pushNotificationPayloadSchema.extend({
  data: z.object({
    animalId: z.uuid(),
    animalName: z.string(),
    dose: z.string(),
    dueTime: z.iso.datetime(),
    isOverdue: z.boolean(),
    medicationName: z.string(),
    minutesLate: z.number().optional(),
    regimenId: z.uuid(),
    type: z.literal("medication_reminder"),
  }),
});

/**
 * Low inventory warning notification
 */
export const lowInventoryWarningSchema = pushNotificationPayloadSchema.extend({
  data: z.object({
    currentQuantity: z.number(),
    daysRemaining: z.number(),
    inventoryItemId: z.uuid(),
    lowThreshold: z.number(),
    medicationName: z.string(),
    type: z.literal("low_inventory"),
  }),
});

/**
 * Co-sign request notification
 */
export const cosignRequestSchema = pushNotificationPayloadSchema.extend({
  data: z.object({
    animalName: z.string(),
    cosignRequestId: z.uuid(),
    expiresAt: z.iso.datetime(),
    medicationName: z.string(),
    requesterId: z.uuid(),
    requesterName: z.string(),
    type: z.literal("cosign_request"),
  }),
});

/**
 * System announcement notification
 */
export const systemAnnouncementSchema = pushNotificationPayloadSchema.extend({
  data: z.object({
    announcementId: z.uuid(),
    category: z.enum(["maintenance", "feature", "security", "general"]),
    priority: z.enum(["low", "medium", "high", "critical"]),
    type: z.literal("system_announcement"),
  }),
});

/**
 * Union of all notification types
 */
export const notificationDataSchema = z.discriminatedUnion("type", [
  medicationReminderSchema.shape.data,
  lowInventoryWarningSchema.shape.data,
  cosignRequestSchema.shape.data,
  systemAnnouncementSchema.shape.data,
]);

/**
 * Notification preferences
 */
export const notificationPreferencesSchema = z.object({
  cosignRequests: z.boolean().default(true),
  leadTimeMinutes: z.number().min(0).max(120).default(15),
  lowInventoryWarnings: z.boolean().default(true),
  medicationReminders: z.boolean().default(true),
  quietHours: z
    .object({
      enabled: z.boolean().default(false),
      endTime: z
        .string()
        .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
      startTime: z
        .string()
        .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    })
    .optional(),
  systemAnnouncements: z.boolean().default(true),
});

// Type exports for TypeScript
export type PushSubscription = z.infer<typeof pushSubscriptionSchema>;
export type PushSubscriptionWithDevice = z.infer<
  typeof pushSubscriptionWithDeviceSchema
>;
export type PushSubscriptionRecord = z.infer<
  typeof pushSubscriptionRecordSchema
>;
export type PushNotificationPayload = z.infer<
  typeof pushNotificationPayloadSchema
>;
export type MedicationReminder = z.infer<typeof medicationReminderSchema>;
export type LowInventoryWarning = z.infer<typeof lowInventoryWarningSchema>;
export type CosignRequest = z.infer<typeof cosignRequestSchema>;
export type SystemAnnouncement = z.infer<typeof systemAnnouncementSchema>;
export type NotificationData = z.infer<typeof notificationDataSchema>;
export type NotificationPreferences = z.infer<
  typeof notificationPreferencesSchema
>;
