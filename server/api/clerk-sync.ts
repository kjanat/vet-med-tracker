import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import type {
	HouseholdSettings,
	VetMedPreferences,
} from "@/hooks/use-user-preferences";
import { db } from "../db";
import { users } from "../db/schema/users";

export interface ClerkUserData {
	userId: string;
	email: string;
	name?: string;
	image?: string;
	vetMedPreferences?: VetMedPreferences;
	householdSettings?: HouseholdSettings;
	onboardingComplete?: boolean;
}

/**
 * Sync user data from Clerk to our database
 */
export async function syncUserToDatabase(clerkUserData: ClerkUserData) {
	const {
		userId: clerkUserId,
		email,
		name,
		image,
		vetMedPreferences,
		householdSettings,
		onboardingComplete,
	} = clerkUserData;

	try {
		// Check if user exists
		const existingUser = await db
			.select()
			.from(users)
			.where(eq(users.clerkUserId, clerkUserId))
			.limit(1);

		const userData = {
			clerkUserId,
			email,
			name,
			image,
			// Sync VetMed preferences to database columns
			...(vetMedPreferences && {
				preferredTimezone: vetMedPreferences.defaultTimezone,
				preferredPhoneNumber: vetMedPreferences.preferredPhoneNumber,
				use24HourTime: vetMedPreferences.displayPreferences.use24HourTime,
				temperatureUnit: vetMedPreferences.displayPreferences.temperatureUnit,
				weightUnit: vetMedPreferences.displayPreferences.weightUnit,
				emailReminders:
					vetMedPreferences.notificationPreferences.emailReminders,
				smsReminders: vetMedPreferences.notificationPreferences.smsReminders,
				pushNotifications:
					vetMedPreferences.notificationPreferences.pushNotifications,
				reminderLeadTimeMinutes:
					vetMedPreferences.notificationPreferences.reminderLeadTime.toString(),
				emergencyContactName: vetMedPreferences.emergencyContactName,
				emergencyContactPhone: vetMedPreferences.emergencyContactPhone,
			}),
			// Store complete preferences as backup
			preferencesBackup: {
				vetMedPreferences,
				householdSettings,
			},
			// Onboarding status
			...(onboardingComplete !== undefined && {
				onboardingComplete,
				...(onboardingComplete && { onboardingCompletedAt: new Date() }),
			}),
			updatedAt: new Date(),
		};

		if (existingUser.length > 0) {
			// Update existing user
			await db
				.update(users)
				.set(userData)
				.where(eq(users.clerkUserId, clerkUserId));

			return { ...existingUser[0], ...userData };
		} else {
			// Create new user
			const newUser = await db
				.insert(users)
				.values({
					...userData,
					createdAt: new Date(),
				})
				.returning();

			return newUser[0];
		}
	} catch (error) {
		console.error("Error syncing user to database:", error);
		throw error;
	}
}

/**
 * Get or create user in database, syncing from Clerk
 */
export async function getOrCreateUser() {
	const authResult = await auth();

	if (!authResult?.userId) {
		throw new Error("User not authenticated");
	}

	// For now, just return the basic user data
	// In a real implementation, you would fetch additional user data from Clerk
	// and sync it to the database

	return {
		clerkUserId: authResult.userId,
		// Add more user data as needed
	};
}

/**
 * Update user preferences in database
 */
export async function updateUserPreferences(
	clerkUserId: string,
	preferences: {
		vetMedPreferences?: Partial<VetMedPreferences>;
		householdSettings?: Partial<HouseholdSettings>;
	},
) {
	try {
		const updateData: Record<string, any> = {
			updatedAt: new Date(),
		};

		// Map VetMed preferences to database columns
		if (preferences.vetMedPreferences) {
			const prefs = preferences.vetMedPreferences;

			if (prefs.defaultTimezone)
				updateData.preferredTimezone = prefs.defaultTimezone;
			if (prefs.preferredPhoneNumber !== undefined)
				updateData.preferredPhoneNumber = prefs.preferredPhoneNumber;
			if (prefs.emergencyContactName !== undefined)
				updateData.emergencyContactName = prefs.emergencyContactName;
			if (prefs.emergencyContactPhone !== undefined)
				updateData.emergencyContactPhone = prefs.emergencyContactPhone;

			if (prefs.displayPreferences) {
				if (prefs.displayPreferences.use24HourTime !== undefined) {
					updateData.use24HourTime = prefs.displayPreferences.use24HourTime;
				}
				if (prefs.displayPreferences.temperatureUnit) {
					updateData.temperatureUnit = prefs.displayPreferences.temperatureUnit;
				}
				if (prefs.displayPreferences.weightUnit) {
					updateData.weightUnit = prefs.displayPreferences.weightUnit;
				}
			}

			if (prefs.notificationPreferences) {
				if (prefs.notificationPreferences.emailReminders !== undefined) {
					updateData.emailReminders =
						prefs.notificationPreferences.emailReminders;
				}
				if (prefs.notificationPreferences.smsReminders !== undefined) {
					updateData.smsReminders = prefs.notificationPreferences.smsReminders;
				}
				if (prefs.notificationPreferences.pushNotifications !== undefined) {
					updateData.pushNotifications =
						prefs.notificationPreferences.pushNotifications;
				}
				if (prefs.notificationPreferences.reminderLeadTime !== undefined) {
					updateData.reminderLeadTimeMinutes =
						prefs.notificationPreferences.reminderLeadTime.toString();
				}
			}
		}

		// Update the preferences backup with the new data
		if (preferences.vetMedPreferences || preferences.householdSettings) {
			// Get current preferences backup
			const currentUser = await db
				.select({ preferencesBackup: users.preferencesBackup })
				.from(users)
				.where(eq(users.clerkUserId, clerkUserId))
				.limit(1);

			const currentBackup = (currentUser[0]?.preferencesBackup as any) || {};

			updateData.preferencesBackup = {
				...currentBackup,
				...(preferences.vetMedPreferences && {
					vetMedPreferences: {
						...currentBackup.vetMedPreferences,
						...preferences.vetMedPreferences,
					},
				}),
				...(preferences.householdSettings && {
					householdSettings: {
						...currentBackup.householdSettings,
						...preferences.householdSettings,
					},
				}),
			};
		}

		await db
			.update(users)
			.set(updateData)
			.where(eq(users.clerkUserId, clerkUserId));

		return { success: true };
	} catch (error) {
		console.error("Error updating user preferences in database:", error);
		throw error;
	}
}
