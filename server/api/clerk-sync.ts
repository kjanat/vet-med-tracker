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

	console.log("Syncing user to database:", { clerkUserId, email, name });

	// Validate required fields
	if (!clerkUserId) {
		throw new Error("Clerk user ID is required for sync");
	}
	if (!email) {
		throw new Error("Email is required for sync");
	}

	try {
		// Check if user exists by clerkUserId
		const existingUserByClerkId = await db
			.select()
			.from(users)
			.where(eq(users.clerkUserId, clerkUserId))
			.limit(1);

		// Also check if user exists by email (for migration from old auth system)
		const existingUserByEmail = await db
			.select()
			.from(users)
			.where(eq(users.email, email))
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

		// Handle different scenarios
		if (existingUserByClerkId.length > 0) {
			// User already exists with this Clerk ID - just update
			console.log("Updating existing user by Clerk ID:", clerkUserId);
			await db
				.update(users)
				.set(userData)
				.where(eq(users.clerkUserId, clerkUserId));

			// Fetch the updated user
			const [updatedUser] = await db
				.select()
				.from(users)
				.where(eq(users.clerkUserId, clerkUserId))
				.limit(1);
			if (!updatedUser) {
				throw new Error("Failed to fetch updated user");
			}
			return updatedUser;
		} else if (existingUserByEmail.length > 0) {
			// User exists with same email but different/no Clerk ID (migration scenario)
			console.log("Migrating user from old auth system:", email);
			console.log("Old user ID:", existingUserByEmail[0]?.id);
			console.log("Updating with new Clerk ID:", clerkUserId);

			// Update the existing user with the new Clerk ID
			await db
				.update(users)
				.set({
					...userData,
					// Preserve the existing user's ID and creation date
					id: existingUserByEmail[0]?.id,
					createdAt: existingUserByEmail[0]?.createdAt,
				})
				.where(eq(users.email, email));

			// Return the updated user
			const updatedUser = await db
				.select()
				.from(users)
				.where(eq(users.clerkUserId, clerkUserId))
				.limit(1);

			console.log("User migrated successfully");
			if (!updatedUser[0]) {
				throw new Error("Failed to retrieve updated user after migration");
			}
			return updatedUser[0];
		} else {
			// Create new user
			console.log("Creating new user:", clerkUserId);
			const newUser = await db
				.insert(users)
				.values({
					...userData,
					createdAt: new Date(),
				})
				.returning();

			if (!newUser[0]) {
				throw new Error("Failed to create new user");
			}
			console.log("New user created successfully:", newUser[0].id);
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

// Helper function to map VetMed preferences to database columns
function mapVetMedPreferencesToDbColumns(
	prefs: Partial<VetMedPreferences>,
	updateData: Record<string, unknown>,
) {
	if (prefs.defaultTimezone) {
		updateData.preferredTimezone = prefs.defaultTimezone;
	}
	if (prefs.preferredPhoneNumber !== undefined) {
		updateData.preferredPhoneNumber = prefs.preferredPhoneNumber;
	}
	if (prefs.emergencyContactName !== undefined) {
		updateData.emergencyContactName = prefs.emergencyContactName;
	}
	if (prefs.emergencyContactPhone !== undefined) {
		updateData.emergencyContactPhone = prefs.emergencyContactPhone;
	}

	mapDisplayPreferences(prefs.displayPreferences, updateData);
	mapNotificationPreferences(prefs.notificationPreferences, updateData);
}

// Helper function to map display preferences
function mapDisplayPreferences(
	displayPrefs: Partial<VetMedPreferences["displayPreferences"]> | undefined,
	updateData: Record<string, unknown>,
) {
	if (!displayPrefs) return;

	if (displayPrefs.use24HourTime !== undefined) {
		updateData.use24HourTime = displayPrefs.use24HourTime;
	}
	if (displayPrefs.temperatureUnit) {
		updateData.temperatureUnit = displayPrefs.temperatureUnit;
	}
	if (displayPrefs.weightUnit) {
		updateData.weightUnit = displayPrefs.weightUnit;
	}
}

// Helper function to map notification preferences
function mapNotificationPreferences(
	notificationPrefs:
		| Partial<VetMedPreferences["notificationPreferences"]>
		| undefined,
	updateData: Record<string, unknown>,
) {
	if (!notificationPrefs) return;

	if (notificationPrefs.emailReminders !== undefined) {
		updateData.emailReminders = notificationPrefs.emailReminders;
	}
	if (notificationPrefs.smsReminders !== undefined) {
		updateData.smsReminders = notificationPrefs.smsReminders;
	}
	if (notificationPrefs.pushNotifications !== undefined) {
		updateData.pushNotifications = notificationPrefs.pushNotifications;
	}
	if (notificationPrefs.reminderLeadTime !== undefined) {
		updateData.reminderLeadTimeMinutes =
			notificationPrefs.reminderLeadTime.toString();
	}
}

// Helper function to update preferences backup
async function updatePreferencesBackup(
	clerkUserId: string,
	preferences: {
		vetMedPreferences?: Partial<VetMedPreferences>;
		householdSettings?: Partial<HouseholdSettings>;
	},
) {
	const currentUser = await db
		.select({ preferencesBackup: users.preferencesBackup })
		.from(users)
		.where(eq(users.clerkUserId, clerkUserId))
		.limit(1);

	const currentBackup =
		(currentUser[0]?.preferencesBackup as {
			vetMedPreferences?: VetMedPreferences;
			householdSettings?: HouseholdSettings;
		}) || {};

	return {
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
		const updateData: Record<string, unknown> = {
			updatedAt: new Date(),
		};

		// Map VetMed preferences to database columns
		if (preferences.vetMedPreferences) {
			mapVetMedPreferencesToDbColumns(
				preferences.vetMedPreferences,
				updateData,
			);
		}

		// Update the preferences backup with the new data
		if (preferences.vetMedPreferences || preferences.householdSettings) {
			updateData.preferencesBackup = await updatePreferencesBackup(
				clerkUserId,
				preferences,
			);
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
