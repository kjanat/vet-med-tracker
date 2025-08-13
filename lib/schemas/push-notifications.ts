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
    p256dh: z.string().min(1, "p256dh key is required"),
    auth: z.string().min(1, "auth key is required"),
  }),
});

/**
 * Extended subscription with device info
 */
export const pushSubscriptionWithDeviceSchema = pushSubscriptionSchema.extend({
  deviceInfo: z
    .object({
      userAgent: z.string().optional(),
      deviceName: z.string().optional(),
    })
    .optional(),
});

/**
 * Database push subscription record
 */
export const pushSubscriptionRecordSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  endpoint: z.url(),
  p256dhKey: z.string(),
  authKey: z.string(),
  userAgent: z.string().nullable(),
  deviceName: z.string().nullable(),
  isActive: z.boolean(),
  lastUsed: z.iso.datetime(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

/**
 * Push notification payload
 */
export const pushNotificationPayloadSchema = z.object({
  title: z.string().min(1, "Title is required"),
  body: z.string().min(1, "Body is required"),
  tag: z.string().optional(),
  icon: z.url().optional(),
  badge: z.url().optional(),
  image: z.url().optional(),
  data: z.record(z.any()).optional(),
  actions: z
    .array(
      z.object({
        action: z.string(),
        title: z.string(),
        icon: z.url().optional(),
      }),
    )
    .optional(),
  requireInteraction: z.boolean().optional(),
  silent: z.boolean().optional(),
  timestamp: z.number().optional(),
  ttl: z.number().optional(),
  urgency: z.enum(["very-low", "low", "normal", "high"]).optional(),
});

/**
 * Medication reminder notification
 */
export const medicationReminderSchema = pushNotificationPayloadSchema.extend({
  data: z.object({
    type: z.literal("medication_reminder"),
    animalId: z.uuid(),
    animalName: z.string(),
    regimenId: z.uuid(),
    medicationName: z.string(),
    dose: z.string(),
    dueTime: z.iso.datetime(),
    isOverdue: z.boolean(),
    minutesLate: z.number().optional(),
  }),
});

/**
 * Low inventory warning notification
 */
export const lowInventoryWarningSchema = pushNotificationPayloadSchema.extend({
  data: z.object({
    type: z.literal("low_inventory"),
    inventoryItemId: z.uuid(),
    medicationName: z.string(),
    currentQuantity: z.number(),
    lowThreshold: z.number(),
    daysRemaining: z.number(),
  }),
});

/**
 * Co-sign request notification
 */
export const cosignRequestSchema = pushNotificationPayloadSchema.extend({
  data: z.object({
    type: z.literal("cosign_request"),
    cosignRequestId: z.uuid(),
    requesterId: z.uuid(),
    requesterName: z.string(),
    animalName: z.string(),
    medicationName: z.string(),
    expiresAt: z.iso.datetime(),
  }),
});

/**
 * System announcement notification
 */
export const systemAnnouncementSchema = pushNotificationPayloadSchema.extend({
  data: z.object({
    type: z.literal("system_announcement"),
    announcementId: z.uuid(),
    category: z.enum(["maintenance", "feature", "security", "general"]),
    priority: z.enum(["low", "medium", "high", "critical"]),
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
  medicationReminders: z.boolean().default(true),
  lowInventoryWarnings: z.boolean().default(true),
  cosignRequests: z.boolean().default(true),
  systemAnnouncements: z.boolean().default(true),
  quietHours: z
    .object({
      enabled: z.boolean().default(false),
      startTime: z
        .string()
        .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
      endTime: z
        .string()
        .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format"),
    })
    .optional(),
  leadTimeMinutes: z.number().min(0).max(120).default(15),
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
