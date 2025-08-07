import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { animals, households, memberships, users } from "@/db/schema";
import type { VetMedPreferences } from "@/hooks/shared/use-user-preferences";
import { createTRPCRouter, protectedProcedure } from "@/server/api/trpc";

// Stub for updating user preferences - this would update Stack Auth metadata in production
async function updateUserPreferences(
	stackUserId: string,
	preferences: {
		vetMedPreferences?: Partial<VetMedPreferences>;
		householdSettings?: any;
	},
	_dbContext: {
		userId: string;
		householdId: string | null;
	},
) {
	// In production, this would update Stack Auth user metadata
	// For now, we'll just log the update
	console.log("Updating preferences for user:", stackUserId, preferences);
	return true;
}

export const userRouter = createTRPCRouter({
	// Get current user's memberships
	getMemberships: protectedProcedure.query(async ({ ctx }) => {
		const userMemberships = await ctx.db
			.select({
				id: memberships.id,
				role: memberships.role,
				joinedAt: memberships.createdAt,
				household: {
					id: households.id,
					name: households.name,
					timezone: households.timezone,
					createdAt: households.createdAt,
				},
			})
			.from(memberships)
			.innerJoin(households, eq(memberships.householdId, households.id))
			.where(eq(memberships.userId, ctx.dbUser.id));

		// Add member and animal counts
		const enrichedMemberships = await Promise.all(
			userMemberships.map(async (membership) => {
				const [memberCount, animalCount] = await Promise.all([
					ctx.db
						.select()
						.from(memberships)
						.where(eq(memberships.householdId, membership.household.id)),
					ctx.db
						.select()
						.from(animals)
						.where(
							and(
								eq(animals.householdId, membership.household.id),
								isNull(animals.deletedAt),
							),
						),
				]);

				return {
					...membership,
					household: {
						...membership.household,
						_count: {
							members: memberCount.length,
							animals: animalCount.length,
						},
					},
				};
			}),
		);

		return enrichedMemberships;
	}),

	// Get user's membership in a specific household
	getMembership: protectedProcedure
		.input(z.object({ householdId: z.string() }))
		.query(async ({ ctx, input }) => {
			const membership = await ctx.db
				.select()
				.from(memberships)
				.where(
					and(
						eq(memberships.userId, ctx.dbUser.id),
						eq(memberships.householdId, input.householdId),
					),
				)
				.limit(1);

			if (!membership[0]) {
				throw new Error("Membership not found");
			}

			return {
				id: membership[0].id,
				role: membership[0].role,
				joinedAt: membership[0].createdAt,
			};
		}),

	// Get user profile
	getProfile: protectedProcedure.query(async ({ ctx }) => {
		return {
			id: ctx.dbUser.id,
			stackUserId: ctx.dbUser.stackUserId,
			email: ctx.dbUser.email,
			name: ctx.dbUser.name,
			image: ctx.dbUser.image,
			// Flexible profile fields
			firstName: ctx.dbUser.firstName,
			lastName: ctx.dbUser.lastName,
			bio: ctx.dbUser.bio,
			pronouns: ctx.dbUser.pronouns,
			location: ctx.dbUser.location,
			website: ctx.dbUser.website,
			socialLinks: ctx.dbUser.socialLinks as Record<string, any>,
			profileData: ctx.dbUser.profileData as Record<string, any>,
			profileVisibility: ctx.dbUser.profileVisibility as Record<
				string,
				boolean
			>,
			profileCompletedAt: ctx.dbUser.profileCompletedAt,
			preferences: {
				timezone: ctx.dbUser.preferredTimezone,
				phoneNumber: ctx.dbUser.preferredPhoneNumber,
				use24HourTime: ctx.dbUser.use24HourTime,
				temperatureUnit: ctx.dbUser.temperatureUnit,
				weightUnit: ctx.dbUser.weightUnit,
				weekStartsOn: ctx.dbUser.weekStartsOn,
				theme: ctx.dbUser.theme,
				emailReminders: ctx.dbUser.emailReminders,
				smsReminders: ctx.dbUser.smsReminders,
				pushNotifications: ctx.dbUser.pushNotifications,
				reminderLeadTime: ctx.dbUser.reminderLeadTimeMinutes,
				emergencyContact: {
					name: ctx.dbUser.emergencyContactName,
					phone: ctx.dbUser.emergencyContactPhone,
				},
				defaultHouseholdId: ctx.dbUser.defaultHouseholdId,
				defaultAnimalId: ctx.dbUser.defaultAnimalId,
			},
			onboarding: {
				complete: ctx.dbUser.onboardingComplete,
				completedAt: ctx.dbUser.onboardingCompletedAt,
			},
			availableHouseholds: ctx.availableHouseholds,
			currentHouseholdId: ctx.currentHouseholdId,
		};
	}),

	// Update user profile (flexible fields)
	updateProfile: protectedProcedure
		.input(
			z.object({
				firstName: z.string().optional(),
				lastName: z.string().optional(),
				bio: z.string().optional(),
				pronouns: z.string().optional(),
				location: z.string().optional(),
				website: z.string().url().optional().or(z.literal("")),
				socialLinks: z
					.object({
						linkedin: z.string().optional(),
						twitter: z.string().optional(),
						github: z.string().optional(),
						instagram: z.string().optional(),
						custom: z
							.array(
								z.object({
									label: z.string(),
									url: z.string().url(),
								}),
							)
							.optional(),
					})
					.optional(),
				profileVisibility: z
					.object({
						name: z.boolean().optional(),
						email: z.boolean().optional(),
						bio: z.boolean().optional(),
						location: z.boolean().optional(),
						social: z.boolean().optional(),
					})
					.optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { db, dbUser } = ctx;

			// Update user profile in database
			const [updatedUser] = await db
				.update(users)
				.set({
					firstName:
						input.firstName !== undefined ? input.firstName : dbUser.firstName,
					lastName:
						input.lastName !== undefined ? input.lastName : dbUser.lastName,
					bio: input.bio !== undefined ? input.bio : dbUser.bio,
					pronouns:
						input.pronouns !== undefined ? input.pronouns : dbUser.pronouns,
					location:
						input.location !== undefined ? input.location : dbUser.location,
					website: input.website !== undefined ? input.website : dbUser.website,
					socialLinks:
						input.socialLinks !== undefined
							? input.socialLinks
							: dbUser.socialLinks,
					profileVisibility:
						input.profileVisibility !== undefined
							? input.profileVisibility
							: dbUser.profileVisibility,
					profileCompletedAt:
						dbUser.profileCompletedAt || new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				})
				.where(eq(users.id, dbUser.id))
				.returning();

			return updatedUser;
		}),

	// Update user preferences
	updatePreferences: protectedProcedure
		.input(
			z.object({
				vetMedPreferences: z
					.object({
						defaultTimezone: z.string().optional(),
						preferredPhoneNumber: z.string().optional(),
						displayPreferences: z
							.object({
								use24HourTime: z.boolean().optional(),
								temperatureUnit: z.enum(["celsius", "fahrenheit"]).optional(),
								weightUnit: z.enum(["kg", "lbs"]).optional(),
								weekStartsOn: z.union([z.literal(0), z.literal(1)]).optional(),
								theme: z.enum(["system", "light", "dark"]).optional(),
							})
							.optional(),
						notificationPreferences: z
							.object({
								emailReminders: z.boolean().optional(),
								smsReminders: z.boolean().optional(),
								pushNotifications: z.boolean().optional(),
								reminderLeadTime: z.number().optional(),
							})
							.optional(),
						emergencyContactName: z.string().optional(),
						emergencyContactPhone: z.string().optional(),
						defaultHouseholdId: z.string().optional(),
						defaultAnimalId: z.string().optional(),
					})
					.optional(),
				householdSettings: z
					.object({
						primaryHouseholdName: z.string().optional(),
					})
					.optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Update preferences in database
			if (!ctx.dbUser.stackUserId) {
				throw new Error("User must have a Clerk ID to update preferences");
			}
			await updateUserPreferences(
				ctx.dbUser.stackUserId,
				{
					vetMedPreferences: input.vetMedPreferences as
						| Partial<VetMedPreferences>
						| undefined,
					householdSettings: input.householdSettings,
				},
				{
					userId: ctx.dbUser.id,
					householdId:
						ctx.currentHouseholdId || ctx.availableHouseholds[0]?.id || "",
				},
			);

			return { success: true };
		}),

	// Check if user needs onboarding
	needsOnboarding: protectedProcedure.query(async ({ ctx }) => {
		const hasPreferences =
			ctx.stackUser?.clientMetadata?.vetMedPreferences ||
			ctx.stackUser?.clientMetadata?.householdSettings;
		const hasCompletedOnboarding =
			ctx.stackUser?.clientMetadata?.onboardingComplete;

		return !hasPreferences && !hasCompletedOnboarding;
	}),

	// Get current household context
	getCurrentHousehold: protectedProcedure.query(async ({ ctx }) => {
		if (!ctx.currentHouseholdId) {
			return null;
		}

		const currentHousehold = ctx.availableHouseholds.find(
			(h) => h.id === ctx.currentHouseholdId,
		);
		return currentHousehold || null;
	}),
});
