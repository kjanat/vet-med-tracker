/**
 * Notification factory for test data generation
 */

import type { NewNotification } from "@/db/schema";
import { dates } from "./utils/dates";
import { random } from "./utils/random";

// Notification factory function
export function createNotification(
	overrides: Partial<NewNotification> = {},
): NewNotification {
	const type = random.arrayElement([
		"medication",
		"inventory",
		"system",
		"due",
		"overdue",
		"reminder",
	]);
	const priority = random.weightedArrayElement([
		{ weight: 10, value: "low" },
		{ weight: 60, value: "medium" },
		{ weight: 25, value: "high" },
		{ weight: 5, value: "critical" },
	]);

	const notificationData = generateNotificationData(type, priority);

	return {
		id: random.uuid(),
		userId: random.uuid(), // Should be overridden with actual user ID
		householdId: random.uuid(), // Should be overridden with actual household ID
		type: type,
		title: notificationData.title,
		message: notificationData.message,
		priority: priority,
		read: random.boolean(0.6), // 60% are read
		dismissed: random.boolean(0.3), // 30% are dismissed
		actionUrl: notificationData.actionUrl,
		data: notificationData.data,
		createdAt: dates.dateRecent(7).toISOString(),
		readAt: random.boolean(0.6) ? dates.dateRecent(3).toISOString() : null,
		dismissedAt: random.boolean(0.3) ? dates.dateRecent(1).toISOString() : null,
		...overrides,
	};
}

// Helper functions for notification-specific data
function generateNotificationData(type: string, priority: string) {
	const data: {
		title: string;
		message: string;
		actionUrl: string | null;
		data: any;
	} = {
		title: "",
		message: "",
		actionUrl: null,
		data: {},
	};

	switch (type) {
		case "medication":
			data.title = "Medication Due";
			data.message = generateMedicationMessage(priority);
			data.actionUrl = `/animals/${random.uuid()}/medications`;
			data.data = {
				animalId: random.uuid(),
				regimenId: random.uuid(),
				medicationName: random.arrayElement([
					"Amoxicillin",
					"Carprofen",
					"Prednisone",
				]),
			};
			break;

		case "inventory":
			data.title = "Inventory Alert";
			data.message = generateInventoryMessage(priority);
			data.actionUrl = `/inventory`;
			data.data = {
				inventoryItemId: random.uuid(),
				medicationName: random.arrayElement([
					"Meloxicam",
					"Gabapentin",
					"Furosemide",
				]),
				quantityRemaining: random.int(0, 10),
			};
			break;

		case "system":
			data.title = "System Notification";
			data.message = generateSystemMessage(priority);
			data.actionUrl = priority === "critical" ? "/settings" : null;
			data.data = {
				component: random.arrayElement([
					"backup",
					"sync",
					"update",
					"maintenance",
				]),
			};
			break;

		case "due":
			data.title = "Medication Due Soon";
			data.message = generateDueMessage();
			data.actionUrl = `/animals/${random.uuid()}/medications`;
			data.data = {
				animalId: random.uuid(),
				regimenId: random.uuid(),
				dueAt: dates.hoursFromNow(1).toISOString(),
				medicationName: random.arrayElement([
					"Insulin",
					"Heart medication",
					"Seizure medication",
				]),
			};
			break;

		case "overdue":
			data.title = "Overdue Medication";
			data.message = generateOverdueMessage(priority);
			data.actionUrl = `/animals/${random.uuid()}/medications`;
			data.data = {
				animalId: random.uuid(),
				regimenId: random.uuid(),
				scheduledFor: dates.hoursFromNow(-random.int(2, 24)).toISOString(),
				medicationName: random.arrayElement([
					"Antibiotic",
					"Pain medication",
					"Anti-inflammatory",
				]),
			};
			break;

		case "reminder":
			data.title = "Reminder";
			data.message = generateReminderMessage();
			data.actionUrl = `/animals/${random.uuid()}`;
			data.data = {
				animalId: random.uuid(),
				reminderType: random.arrayElement([
					"vet_appointment",
					"vaccination",
					"checkup",
					"grooming",
				]),
			};
			break;

		default:
			data.title = "Notification";
			data.message = "You have a new notification";
	}

	return data;
}

function generateMedicationMessage(priority: string): string {
	const messages = {
		low: [
			"Medication reminder for later today",
			"Daily medication scheduled for this evening",
			"Routine medication due in 2 hours",
		],
		medium: [
			"Medication due now for your pet",
			"Time for scheduled medication",
			"Medication reminder - due within 30 minutes",
		],
		high: [
			"Important medication is overdue",
			"Critical medication missed - administer as soon as possible",
			"High-priority medication requires immediate attention",
		],
		critical: [
			"URGENT: Life-saving medication severely overdue",
			"CRITICAL: Emergency medication required immediately",
			"ALERT: Contact veterinarian - medication crisis",
		],
	};

	return random.arrayElement(
		messages[priority as keyof typeof messages] || messages.medium,
	);
}

function generateInventoryMessage(priority: string): string {
	const messages = {
		low: [
			"Inventory item expires in 3 months",
			"Consider reordering medication soon",
			"Medication inventory at 50% capacity",
		],
		medium: [
			"Low inventory - 5 doses remaining",
			"Medication expires in 30 days",
			"Reorder recommended for continued care",
		],
		high: [
			"Very low inventory - only 2 doses left",
			"Medication expires in 1 week",
			"Critical reorder needed immediately",
		],
		critical: [
			"OUT OF STOCK: No medication remaining",
			"EXPIRED: Medication past expiration date",
			"EMERGENCY: Contact vet for immediate refill",
		],
	};

	return random.arrayElement(
		messages[priority as keyof typeof messages] || messages.medium,
	);
}

function generateSystemMessage(priority: string): string {
	const messages = {
		low: [
			"App updated to latest version",
			"Backup completed successfully",
			"Data sync completed",
		],
		medium: [
			"Update available - install when convenient",
			"Scheduled maintenance tonight at 2 AM",
			"New features available in settings",
		],
		high: [
			"Security update recommended",
			"Data backup incomplete - retry needed",
			"System maintenance required",
		],
		critical: [
			"SECURITY ALERT: Update required immediately",
			"SYSTEM ERROR: Contact support",
			"DATA LOSS RISK: Backup failure detected",
		],
	};

	return random.arrayElement(
		messages[priority as keyof typeof messages] || messages.medium,
	);
}

function generateDueMessage(): string {
	const messages = [
		"Medication due in 1 hour",
		"Scheduled dose coming up soon",
		"Prepare medication for administration",
		"Next dose reminder set",
		"Medication due within 30 minutes",
	];

	return random.arrayElement(messages);
}

function generateOverdueMessage(priority: string): string {
	const timeDescriptions = {
		medium: ["30 minutes late", "1 hour overdue", "2 hours past due"],
		high: [
			"4 hours overdue",
			"6 hours past scheduled time",
			"significantly delayed",
		],
		critical: ["12+ hours overdue", "1 day past due", "critically delayed"],
	};

	const timeDesc = random.arrayElement(
		timeDescriptions[priority as keyof typeof timeDescriptions] ||
			timeDescriptions.medium,
	);

	return `Medication is ${timeDesc}. Please administer as soon as possible.`;
}

function generateReminderMessage(): string {
	const messages = [
		"Veterinary appointment scheduled for tomorrow",
		"Annual vaccination due next week",
		"Monthly heartworm prevention reminder",
		"Grooming appointment in 2 days",
		"Health checkup recommended",
		"Dental cleaning scheduled this week",
	];

	return random.arrayElement(messages);
}

// Notification builder class for complex scenarios
export class NotificationBuilder {
	private notification: Partial<NewNotification> = {};

	static create(): NotificationBuilder {
		return new NotificationBuilder();
	}

	forUser(userId: string): NotificationBuilder {
		this.notification.userId = userId;
		return this;
	}

	inHousehold(householdId: string): NotificationBuilder {
		this.notification.householdId = householdId;
		return this;
	}

	withType(
		type:
			| "medication"
			| "inventory"
			| "system"
			| "due"
			| "overdue"
			| "reminder",
	): NotificationBuilder {
		this.notification.type = type;
		return this;
	}

	withPriority(
		priority: "low" | "medium" | "high" | "critical",
	): NotificationBuilder {
		this.notification.priority = priority;
		return this;
	}

	withTitle(title: string): NotificationBuilder {
		this.notification.title = title;
		return this;
	}

	withMessage(message: string): NotificationBuilder {
		this.notification.message = message;
		return this;
	}

	withActionUrl(url: string): NotificationBuilder {
		this.notification.actionUrl = url;
		return this;
	}

	withData(data: any): NotificationBuilder {
		this.notification.data = data;
		return this;
	}

	isRead(readAt?: Date): NotificationBuilder {
		this.notification.read = true;
		this.notification.readAt = (readAt || dates.dateRecent(1)).toISOString();
		return this;
	}

	isUnread(): NotificationBuilder {
		this.notification.read = false;
		this.notification.readAt = null;
		return this;
	}

	isDismissed(dismissedAt?: Date): NotificationBuilder {
		this.notification.dismissed = true;
		this.notification.dismissedAt = (
			dismissedAt || dates.dateRecent(1)
		).toISOString();
		return this;
	}

	createdHoursAgo(hours: number): NotificationBuilder {
		this.notification.createdAt = dates.hoursFromNow(-hours).toISOString();
		return this;
	}

	build(): NewNotification {
		return createNotification(this.notification);
	}
}

// Preset notification types for common scenarios
export const notificationPresets = {
	medicationDue: (
		userId: string,
		householdId: string,
		animalId: string,
		medicationName: string,
	): NewNotification =>
		NotificationBuilder.create()
			.forUser(userId)
			.inHousehold(householdId)
			.withType("due")
			.withPriority("medium")
			.withTitle("Medication Due")
			.withMessage(`Time to give ${medicationName} to your pet`)
			.withActionUrl(`/animals/${animalId}/medications`)
			.withData({
				animalId,
				medicationName,
				dueAt: dates.now().toISOString(),
			})
			.isUnread()
			.createdHoursAgo(0)
			.build(),

	medicationOverdue: (
		userId: string,
		householdId: string,
		animalId: string,
		medicationName: string,
		hoursOverdue: number,
	): NewNotification =>
		NotificationBuilder.create()
			.forUser(userId)
			.inHousehold(householdId)
			.withType("overdue")
			.withPriority(hoursOverdue > 6 ? "high" : "medium")
			.withTitle("Overdue Medication")
			.withMessage(`${medicationName} is ${hoursOverdue} hours overdue`)
			.withActionUrl(`/animals/${animalId}/medications`)
			.withData({
				animalId,
				medicationName,
				hoursOverdue,
				scheduledFor: dates.hoursFromNow(-hoursOverdue).toISOString(),
			})
			.isUnread()
			.createdHoursAgo(1)
			.build(),

	lowInventory: (
		userId: string,
		householdId: string,
		medicationName: string,
		quantityRemaining: number,
	): NewNotification =>
		NotificationBuilder.create()
			.forUser(userId)
			.inHousehold(householdId)
			.withType("inventory")
			.withPriority(quantityRemaining <= 3 ? "high" : "medium")
			.withTitle("Low Inventory Alert")
			.withMessage(
				`Only ${quantityRemaining} doses of ${medicationName} remaining`,
			)
			.withActionUrl("/inventory")
			.withData({
				medicationName,
				quantityRemaining,
				reorderRecommended: true,
			})
			.isUnread()
			.createdHoursAgo(2)
			.build(),

	expiredMedication: (
		userId: string,
		householdId: string,
		medicationName: string,
	): NewNotification =>
		NotificationBuilder.create()
			.forUser(userId)
			.inHousehold(householdId)
			.withType("inventory")
			.withPriority("critical")
			.withTitle("EXPIRED MEDICATION")
			.withMessage(`${medicationName} has expired and should not be used`)
			.withActionUrl("/inventory")
			.withData({
				medicationName,
				expired: true,
				action: "replace_immediately",
			})
			.isUnread()
			.createdHoursAgo(0)
			.build(),

	systemUpdate: (userId: string, householdId: string): NewNotification =>
		NotificationBuilder.create()
			.forUser(userId)
			.inHousehold(householdId)
			.withType("system")
			.withPriority("low")
			.withTitle("App Updated")
			.withMessage("VetMed Tracker has been updated with new features")
			.withData({
				version: "2.1.0",
				features: ["improved notifications", "better inventory tracking"],
			})
			.isRead(dates.hoursFromNow(-1))
			.createdHoursAgo(6)
			.build(),

	vetAppointmentReminder: (
		userId: string,
		householdId: string,
		animalId: string,
		animalName: string,
	): NewNotification =>
		NotificationBuilder.create()
			.forUser(userId)
			.inHousehold(householdId)
			.withType("reminder")
			.withPriority("medium")
			.withTitle("Vet Appointment Reminder")
			.withMessage(`${animalName} has a vet appointment tomorrow at 2:00 PM`)
			.withActionUrl(`/animals/${animalId}`)
			.withData({
				animalId,
				animalName,
				appointmentDate: dates.tomorrow().toISOString(),
				appointmentTime: "14:00",
				clinic: "City Animal Hospital",
			})
			.isUnread()
			.createdHoursAgo(12)
			.build(),

	emergencyAlert: (
		userId: string,
		householdId: string,
		animalId: string,
		message: string,
	): NewNotification =>
		NotificationBuilder.create()
			.forUser(userId)
			.inHousehold(householdId)
			.withType("system")
			.withPriority("critical")
			.withTitle("EMERGENCY ALERT")
			.withMessage(message)
			.withActionUrl(`/animals/${animalId}`)
			.withData({
				animalId,
				emergency: true,
				contactVet: true,
			})
			.isUnread()
			.createdHoursAgo(0)
			.build(),

	readNotification: (userId: string, householdId: string): NewNotification =>
		NotificationBuilder.create()
			.forUser(userId)
			.inHousehold(householdId)
			.withType("medication")
			.withPriority("medium")
			.withTitle("Medication Completed")
			.withMessage("Morning medication has been administered successfully")
			.isRead(dates.hoursFromNow(-2))
			.createdHoursAgo(6)
			.build(),
};
