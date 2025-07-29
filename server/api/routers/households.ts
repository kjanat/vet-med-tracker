import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { animals, households, memberships } from "../../db/schema";
import {
	createTRPCRouter,
	householdProcedure,
	protectedProcedure,
} from "../trpc/init";

export const householdRouter = createTRPCRouter({
	// List all households for the current user
	list: protectedProcedure.query(async ({ ctx }) => {
		// Get all households where the user is a member
		const userMemberships = await ctx.db
			.select({
				household: households,
				membership: memberships,
			})
			.from(memberships)
			.innerJoin(households, eq(households.id, memberships.householdId))
			.where(eq(memberships.userId, ctx.user.id));

		return userMemberships.map(({ household, membership }) => ({
			...household,
			role: membership.role,
			joinedAt: membership.joinedAt,
		}));
	}),

	// Get a specific household with animals
	get: householdProcedure
		.input(
			z.object({
				householdId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const household = await ctx.db.query.households.findFirst({
				where: eq(households.id, input.householdId),
				with: {
					animals: true,
					memberships: {
						with: {
							user: true,
						},
					},
				},
			});

			if (!household) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Household not found",
				});
			}

			return household;
		}),

	// Create a new household
	create: protectedProcedure
		.input(
			z.object({
				name: z.string().min(1).max(100),
				timezone: z.string().default("America/New_York"),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Create household
			const [household] = await ctx.db
				.insert(households)
				.values({
					name: input.name,
					timezone: input.timezone,
				})
				.returning();

			// Add creator as owner
			await ctx.db.insert(memberships).values({
				userId: ctx.user.id,
				householdId: household.id,
				role: "OWNER",
			});

			return household;
		}),

	// Get animals for a household
	getAnimals: householdProcedure
		.input(
			z.object({
				householdId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const householdAnimals = await ctx.db.query.animals.findMany({
				where: eq(animals.householdId, input.householdId),
			});

			return householdAnimals;
		}),
});
