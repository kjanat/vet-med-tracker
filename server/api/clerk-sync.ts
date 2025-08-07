import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { dbPooled as db } from "@/db/drizzle";
import { users } from "@/db/schema";
import type {
	HouseholdSettings,
	VetMedPreferences,
} from "@/hooks/shared/use-user-preferences";
import { createAuditLog } from "@/server/utils/audit-log";

export interface ClerkUserData {
	userId: string;
	email: string;
	name?: string;
	firstName?: string;
	lastName?: string;
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
		firstName,
		lastName,
		image,
		vetMedPreferences,
		householdSettings,
		onboardingComplete,
	} = clerkUserData;

	console.log("Syncing user to database:", {
		clerkUserId,
		email,
		name,
		hasPreferences: !!vetMedPreferences,
		hasSettings: !!householdSettings,
	});

	// Validate required fields
	if (!clerkUserId) {
		console.error("Sync failed: Clerk user ID is missing");
		throw new Error("Clerk user ID is required for sync");
	}
	if (!email) {
		console.error("Sync failed: Email is missing for user", clerkUserId);
		throw new Error("Email is required for sync");
	}

	try {
		const userData = {
			clerkUserId,
			email,
			name,
			firstName,
			lastName,
			image,
			// Sync VetMed preferences to database columns
			...(vetMedPreferences && {
				preferredTimezone: vetMedPreferences.defaultTimezone,
				preferredPhoneNumber: vetMedPreferences.preferredPhoneNumber,
				use24HourTime: vetMedPreferences.displayPreferences.use24HourTime,
				temperatureUnit: vetMedPreferences.displayPreferences.temperatureUnit,
				weightUnit: vetMedPreferences.displayPreferences.weightUnit,
				weekStartsOn: vetMedPreferences.displayPreferences.weekStartsOn,
				theme: vetMedPreferences.displayPreferences.theme,
				emailReminders:
					vetMedPreferences.notificationPreferences.emailReminders,
				smsReminders: vetMedPreferences.notificationPreferences.smsReminders,
				pushNotifications:
					vetMedPreferences.notificationPreferences.pushNotifications,
				reminderLeadTimeMinutes:
					vetMedPreferences.notificationPreferences.reminderLeadTime.toString(),
				emergencyContactName: vetMedPreferences.emergencyContactName,
				emergencyContactPhone: vetMedPreferences.emergencyContactPhone,
				defaultHouseholdId: vetMedPreferences.defaultHouseholdId || null,
				defaultAnimalId: vetMedPreferences.defaultAnimalId || null,
			}),
			// Store complete preferences as backup
			preferencesBackup: {
				vetMedPreferences,
				householdSettings,
			},
			// Onboarding status
			...(onboardingComplete !== undefined && {
				onboardingComplete,
				...(onboardingComplete && {
					onboardingCompletedAt: new Date().toISOString(),
				}),
			}),
			updatedAt: new Date().toISOString(),
		};

		// Use a transaction to ensure atomicity
		const result = await db.transaction(async (tx) => {
			// First, try to handle the migration case where user exists with email but no clerkUserId
			const existingUserByEmail = await tx
				.select()
				.from(users)
				.where(eq(users.email, email))
				.limit(1);

			if (
				existingUserByEmail.length > 0 &&
				existingUserByEmail[0] &&
				!existingUserByEmail[0].clerkUserId
			) {
				// Migration case: update the existing user with the Clerk ID
				console.log("Migrating user from old auth system:", email);
				const updated = await tx
					.update(users)
					.set({
						...userData,
						// Preserve the existing user's creation date
						createdAt: existingUserByEmail[0].createdAt,
					})
					.where(eq(users.email, email))
					.returning();

				if (!updated[0]) {
					throw new Error("Failed to migrate user");
				}
				return updated[0];
			}

			// Otherwise, perform atomic upsert using onConflictDoUpdate
			// This handles both new users and existing users with clerkUserId
			const upserted = await tx
				.insert(users)
				.values({
					...userData,
					createdAt: new Date().toISOString(),
				})
				.onConflictDoUpdate({
					target: users.clerkUserId,
					set: userData,
				})
				.returning();

			if (!upserted[0]) {
				throw new Error("Failed to sync user to database");
			}

			return upserted[0];
		});

		console.log("User synced successfully:", {
			id: result.id,
			clerkUserId: result.clerkUserId,
			email: result.email,
		});
		return result;
	} catch (error) {
		console.error("Error syncing user to database:", {
			error,
			clerkUserId,
			email,
			errorMessage: error instanceof Error ? error.message : "Unknown error",
			errorStack: error instanceof Error ? error.stack : undefined,
		});
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
	if (prefs.defaultHouseholdId !== undefined) {
		updateData.defaultHouseholdId = prefs.defaultHouseholdId || null;
	}
	if (prefs.defaultAnimalId !== undefined) {
		updateData.defaultAnimalId = prefs.defaultAnimalId || null;
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
	if (displayPrefs.weekStartsOn !== undefined) {
		updateData.weekStartsOn = displayPrefs.weekStartsOn;
	}
	if (displayPrefs.theme) {
		updateData.theme = displayPrefs.theme;
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

// Type guard to validate preferences backup structure
function isValidPreferencesBackup(backup: unknown): backup is {
	vetMedPreferences?: VetMedPreferences;
	householdSettings?: HouseholdSettings;
} {
	if (!backup || typeof backup !== "object") {
		return false;
	}

	const obj = backup as Record<string, unknown>;

	// Check vetMedPreferences if present
	if (obj.vetMedPreferences !== undefined) {
		if (
			typeof obj.vetMedPreferences !== "object" ||
			obj.vetMedPreferences === null
		) {
			return false;
		}
	}

	// Check householdSettings if present
	if (obj.householdSettings !== undefined) {
		if (
			typeof obj.householdSettings !== "object" ||
			obj.householdSettings === null
		) {
			return false;
		}
	}

	return true;
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

	const rawBackup = currentUser[0]?.preferencesBackup;
	const currentBackup = isValidPreferencesBackup(rawBackup)
		? rawBackup
		: { vetMedPreferences: undefined, householdSettings: undefined };

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
	auditContext?: {
		userId: string;
		householdId: string;
	},
) {
	try {
		// Capture old values for audit logging if audit context is provided
		let oldValues: Record<string, unknown> | undefined;
		if (auditContext) {
			const currentUser = await db
				.select()
				.from(users)
				.where(eq(users.clerkUserId, clerkUserId))
				.limit(1);

			if (currentUser[0]) {
				oldValues = {
					preferredTimezone: currentUser[0].preferredTimezone,
					preferredPhoneNumber: currentUser[0].preferredPhoneNumber,
					use24HourTime: currentUser[0].use24HourTime,
					temperatureUnit: currentUser[0].temperatureUnit,
					weightUnit: currentUser[0].weightUnit,
					emailReminders: currentUser[0].emailReminders,
					smsReminders: currentUser[0].smsReminders,
					pushNotifications: currentUser[0].pushNotifications,
					reminderLeadTimeMinutes: currentUser[0].reminderLeadTimeMinutes,
					emergencyContactName: currentUser[0].emergencyContactName,
					emergencyContactPhone: currentUser[0].emergencyContactPhone,
					preferencesBackup: currentUser[0].preferencesBackup,
				};
			}
		}

		const updateData: Record<string, unknown> = {
			updatedAt: new Date().toISOString(),
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

		// Create audit log if context is provided
		if (auditContext) {
			await createAuditLog(db, {
				userId: auditContext.userId,
				householdId: auditContext.householdId,
				action: "UPDATE",
				tableName: "users",
				recordId: clerkUserId,
				oldValues,
				newValues: {
					...updateData,
					vetMedPreferences: preferences.vetMedPreferences,
					householdSettings: preferences.householdSettings,
				},
				details: {
					clerkUserId,
					preferencesUpdated: {
						vetMed: !!preferences.vetMedPreferences,
						household: !!preferences.householdSettings,
					},
				},
			});
		}

		return { success: true };
	} catch (error) {
		console.error("Error updating user preferences in database:", error);
		throw error;
	}
}
