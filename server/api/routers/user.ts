import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc/init";

export const userRouter = createTRPCRouter({
	// Get current user's memberships
	getMemberships: protectedProcedure.query(async () => {
		// Mock data for now
		return [
			{
				id: "mem1",
				role: "OWNER" as const,
				joinedAt: new Date().toISOString(),
				household: {
					id: "h1",
					name: "Smith Family",
					type: "PERSONAL",
					createdAt: new Date().toISOString(),
					_count: {
						members: 3,
						animals: 2,
					},
				},
			},
		];
	}),

	// Get user's membership in a specific household
	getMembership: protectedProcedure
		.input(z.object({ householdId: z.string() }))
		.query(async () => {
			// Mock data
			return {
				id: "mem1",
				role: "OWNER" as const,
				joinedAt: new Date().toISOString(),
			};
		}),

	// Get user profile
	getProfile: protectedProcedure.query(async ({ ctx }) => {
		// Return the authenticated user
		return ctx.user;
	}),

	// Update user preferences
	updatePreferences: protectedProcedure
		.input(
			z.object({
				emailNotifications: z.boolean().optional(),
				pushNotifications: z.boolean().optional(),
				reminderSounds: z.boolean().optional(),
			}),
		)
		.mutation(async () => {
			// Mock implementation
			return {
				success: true,
			};
		}),
});
