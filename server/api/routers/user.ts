import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import type { VetMedPreferences } from "@/hooks/use-user-preferences";
import { animals, households, memberships } from "../../db/schema";
import { updateUserPreferences } from "../clerk-sync";
import { createTRPCRouter, protectedProcedure } from "../trpc/clerk-init";

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
			clerkUserId: ctx.dbUser.clerkUserId,
			email: ctx.dbUser.email,
			name: ctx.dbUser.name,
			image: ctx.dbUser.image,
			preferences: {
				timezone: ctx.dbUser.preferredTimezone,
				phoneNumber: ctx.dbUser.preferredPhoneNumber,
				use24HourTime: ctx.dbUser.use24HourTime,
				temperatureUnit: ctx.dbUser.temperatureUnit,
				weightUnit: ctx.dbUser.weightUnit,
				emailReminders: ctx.dbUser.emailReminders,
				smsReminders: ctx.dbUser.smsReminders,
				pushNotifications: ctx.dbUser.pushNotifications,
				reminderLeadTime: ctx.dbUser.reminderLeadTimeMinutes,
				emergencyContact: {
					name: ctx.dbUser.emergencyContactName,
					phone: ctx.dbUser.emergencyContactPhone,
				},
			},
			onboarding: {
				complete: ctx.dbUser.onboardingComplete,
				completedAt: ctx.dbUser.onboardingCompletedAt,
			},
			availableHouseholds: ctx.availableHouseholds,
			currentHouseholdId: ctx.currentHouseholdId,
		};
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
			if (!ctx.dbUser.clerkUserId) {
				throw new Error("User must have a Clerk ID to update preferences");
			}
			await updateUserPreferences(ctx.dbUser.clerkUserId, {
				vetMedPreferences: input.vetMedPreferences as
					| Partial<VetMedPreferences>
					| undefined,
				householdSettings: input.householdSettings,
			});

			return { success: true };
		}),

	// Check if user needs onboarding
	needsOnboarding: protectedProcedure.query(async ({ ctx }) => {
		const hasPreferences =
			ctx.clerkUser?.unsafeMetadata?.vetMedPreferences ||
			ctx.clerkUser?.unsafeMetadata?.householdSettings;
		const hasCompletedOnboarding =
			ctx.clerkUser?.unsafeMetadata?.onboardingComplete;

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
