/**
 * Push Notification Service
 * Handles sending push notifications to subscribed users
 */

import { and, eq } from "drizzle-orm";
import webpush from "web-push";
import type { db } from "@/db/drizzle";
import { pushSubscriptions } from "@/db/schema";
import type {
	CosignRequest,
	LowInventoryWarning,
	MedicationReminder,
	PushNotificationPayload,
	SystemAnnouncement,
} from "@/lib/schemas/push-notifications";
import { getVAPIDConfig } from "./vapid-config";

export interface PushSubscriptionData {
	id: string;
	endpoint: string;
	p256dhKey: string;
	authKey: string;
}

export interface SendNotificationOptions {
	TTL?: number; // Time to live in seconds
	urgency?: "very-low" | "low" | "normal" | "high";
	topic?: string; // For collapsing notifications
}

export class PushNotificationService {
	private db: typeof db;
	private initialized = false;
	private enabled = false;

	constructor(db: typeof db) {
		this.db = db;
		this.initializeWebPush();
	}

	private initializeWebPush(): void {
		if (this.initialized) return;

		try {
			const vapidConfig = getVAPIDConfig();
			if (!vapidConfig) {
				// VAPID keys not configured, push notifications disabled
				this.enabled = false;
				this.initialized = true;
				return;
			}
			
			webpush.setVapidDetails(
				vapidConfig.subject,
				vapidConfig.publicKey,
				vapidConfig.privateKey,
			);
			this.enabled = true;
			this.initialized = true;
		} catch (error) {
			console.error("Failed to initialize web push:", error);
			this.enabled = false;
			this.initialized = true;
		}
	}

	/**
	 * Check if push notifications are enabled
	 */
	public isEnabled(): boolean {
		return this.enabled;
	}

	/**
	 * Send notification to a single subscription
	 */
	private async sendToSubscription(
		subscription: PushSubscriptionData,
		payload: PushNotificationPayload,
		options: SendNotificationOptions = {},
	): Promise<{ success: boolean; error?: string }> {
		if (!this.enabled) {
			return { success: false, error: "Push notifications disabled - VAPID keys not configured" };
		}
		
		try {
			await webpush.sendNotification(
				{
					endpoint: subscription.endpoint,
					keys: {
						p256dh: subscription.p256dhKey,
						auth: subscription.authKey,
					},
				},
				JSON.stringify(payload),
				{
					TTL: options.TTL || 3600, // Default 1 hour
					urgency: options.urgency || "normal",
					topic: options.topic,
				},
			);

			// Update last used timestamp
			await this.db
				.update(pushSubscriptions)
				.set({
					lastUsed: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				})
				.where(eq(pushSubscriptions.id, subscription.id));

			return { success: true };
		} catch (error: any) {
			console.error(
				`Push notification failed for subscription ${subscription.id}:`,
				error,
			);

			// Handle different error types
			if (error.statusCode === 410) {
				// Subscription is no longer valid, mark as inactive
				await this.db
					.update(pushSubscriptions)
					.set({
						isActive: false,
						updatedAt: new Date().toISOString(),
					})
					.where(eq(pushSubscriptions.id, subscription.id));
			}

			return {
				success: false,
				error: error.message || "Unknown error",
			};
		}
	}

	/**
	 * Get active push subscriptions for a user
	 */
	private async getUserSubscriptions(
		userId: string,
	): Promise<PushSubscriptionData[]> {
		return await this.db
			.select({
				id: pushSubscriptions.id,
				endpoint: pushSubscriptions.endpoint,
				p256dhKey: pushSubscriptions.p256dhKey,
				authKey: pushSubscriptions.authKey,
			})
			.from(pushSubscriptions)
			.where(
				and(
					eq(pushSubscriptions.userId, userId),
					eq(pushSubscriptions.isActive, true),
				),
			);
	}

	/**
	 * Send notification to a specific user
	 */
	async sendToUser(
		userId: string,
		payload: PushNotificationPayload,
		options: SendNotificationOptions = {},
	): Promise<{
		sent: number;
		failed: number;
		results: Array<{
			success: boolean;
			subscriptionId: string;
			error?: string;
		}>;
	}> {
		const subscriptions = await this.getUserSubscriptions(userId);

		if (subscriptions.length === 0) {
			return { sent: 0, failed: 0, results: [] };
		}

		const results = [];
		for (const subscription of subscriptions) {
			const result = await this.sendToSubscription(
				subscription,
				payload,
				options,
			);
			results.push({
				...result,
				subscriptionId: subscription.id,
			});
		}

		return {
			sent: results.filter((r) => r.success).length,
			failed: results.filter((r) => !r.success).length,
			results,
		};
	}

	/**
	 * Send notification to multiple users
	 */
	async sendToUsers(
		userIds: string[],
		payload: PushNotificationPayload,
		options: SendNotificationOptions = {},
	): Promise<{
		totalSent: number;
		totalFailed: number;
		userResults: Array<{ userId: string; sent: number; failed: number }>;
	}> {
		const userResults = [];
		let totalSent = 0;
		let totalFailed = 0;

		for (const userId of userIds) {
			const result = await this.sendToUser(userId, payload, options);
			userResults.push({
				userId,
				sent: result.sent,
				failed: result.failed,
			});
			totalSent += result.sent;
			totalFailed += result.failed;
		}

		return {
			totalSent,
			totalFailed,
			userResults,
		};
	}

	/**
	 * Send medication reminder notification
	 */
	async sendMedicationReminder(
		userId: string,
		data: MedicationReminder["data"],
		options: SendNotificationOptions = {},
	): Promise<{ sent: number; failed: number }> {
		const isOverdue = data.isOverdue;
		const minutesLate = data.minutesLate || 0;

		let title: string;
		let body: string;
		let urgency: SendNotificationOptions["urgency"] = "normal";

		if (isOverdue) {
			if (minutesLate > 180) {
				title = `⚠️ ${data.animalName} - Very Late Medication`;
				urgency = "high";
			} else if (minutesLate > 60) {
				title = `⚠️ ${data.animalName} - Late Medication`;
				urgency = "normal";
			} else {
				title = `⏰ ${data.animalName} - Medication Due`;
				urgency = "normal";
			}
			body = `${data.medicationName} (${data.dose}) was due ${minutesLate} minutes ago`;
		} else {
			title = `💊 ${data.animalName} - Medication Reminder`;
			body = `Time for ${data.medicationName} (${data.dose})`;
			urgency = "normal";
		}

		const payload: PushNotificationPayload = {
			title,
			body,
			icon: "/icon-192x192.png",
			badge: "/badge-72x72.png",
			tag: `medication-${data.regimenId}`,
			data,
			actions: [
				{
					action: "record",
					title: "Record Now",
					icon: "/icon-check.png",
				},
				{
					action: "snooze",
					title: "Remind in 15min",
					icon: "/icon-clock.png",
				},
			],
			requireInteraction: isOverdue,
			timestamp: Date.now(),
		};

		const result = await this.sendToUser(userId, payload, {
			...options,
			urgency,
			topic: `medication-${data.animalId}`, // Collapse multiple reminders for same animal
		});

		return { sent: result.sent, failed: result.failed };
	}

	/**
	 * Send low inventory warning notification
	 */
	async sendLowInventoryWarning(
		userId: string,
		data: LowInventoryWarning["data"],
		options: SendNotificationOptions = {},
	): Promise<{ sent: number; failed: number }> {
		const payload: PushNotificationPayload = {
			title: "📦 Low Inventory Warning",
			body: `${data.medicationName} is running low (${data.currentQuantity} remaining, ~${data.daysRemaining} days left)`,
			icon: "/icon-192x192.png",
			badge: "/badge-72x72.png",
			tag: `inventory-${data.inventoryItemId}`,
			data,
			actions: [
				{
					action: "view_inventory",
					title: "View Inventory",
				},
				{
					action: "dismiss",
					title: "Dismiss",
				},
			],
			timestamp: Date.now(),
		};

		const result = await this.sendToUser(userId, payload, {
			...options,
			urgency: "low",
			TTL: 86400, // 24 hours
		});

		return { sent: result.sent, failed: result.failed };
	}

	/**
	 * Send co-sign request notification
	 */
	async sendCosignRequest(
		userId: string,
		data: CosignRequest["data"],
		options: SendNotificationOptions = {},
	): Promise<{ sent: number; failed: number }> {
		const payload: PushNotificationPayload = {
			title: "✋ Co-sign Required",
			body: `${data.requesterName} needs co-signature for ${data.animalName}'s ${data.medicationName}`,
			icon: "/icon-192x192.png",
			badge: "/badge-72x72.png",
			tag: `cosign-${data.cosignRequestId}`,
			data,
			actions: [
				{
					action: "approve",
					title: "Approve",
					icon: "/icon-check.png",
				},
				{
					action: "review",
					title: "Review",
					icon: "/icon-eye.png",
				},
			],
			requireInteraction: true,
			timestamp: Date.now(),
		};

		const result = await this.sendToUser(userId, payload, {
			...options,
			urgency: "high",
			TTL: 3600, // 1 hour
		});

		return { sent: result.sent, failed: result.failed };
	}

	/**
	 * Send system announcement notification
	 */
	async sendSystemAnnouncement(
		userIds: string[],
		data: SystemAnnouncement["data"],
		title: string,
		body: string,
		options: SendNotificationOptions = {},
	): Promise<{ totalSent: number; totalFailed: number }> {
		const urgencyMap = {
			low: "low" as const,
			medium: "normal" as const,
			high: "high" as const,
			critical: "high" as const,
		};

		const payload: PushNotificationPayload = {
			title,
			body,
			icon: "/icon-192x192.png",
			badge: "/badge-72x72.png",
			tag: `announcement-${data.announcementId}`,
			data,
			requireInteraction: data.priority === "critical",
			timestamp: Date.now(),
		};

		const result = await this.sendToUsers(userIds, payload, {
			...options,
			urgency: urgencyMap[data.priority],
			TTL: data.priority === "critical" ? 3600 : 86400, // Critical: 1 hour, others: 24 hours
		});

		return {
			totalSent: result.totalSent,
			totalFailed: result.totalFailed,
		};
	}
}
