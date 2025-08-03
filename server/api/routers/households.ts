import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { animals, households, memberships, users } from "@/db/schema";
import {
	createTRPCRouter,
	householdProcedure,
	protectedProcedure,
} from "../trpc/clerk-init";

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
			.where(eq(memberships.userId, ctx.dbUser.id));

		return userMemberships.map(({ household, membership }) => ({
			...household,
			role: membership.role,
			joinedAt: membership.createdAt,
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
			// Get basic household info
			const household = await ctx.db
				.select()
				.from(households)
				.where(eq(households.id, input.householdId))
				.limit(1);

			if (!household[0]) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Household not found",
				});
			}

			// Get animals (non-deleted)
			const householdAnimals = await ctx.db
				.select()
				.from(animals)
				.where(
					and(
						eq(animals.householdId, input.householdId),
						isNull(animals.deletedAt),
					),
				);

			// Get memberships with users
			const householdMemberships = await ctx.db
				.select({
					id: memberships.id,
					userId: memberships.userId,
					householdId: memberships.householdId,
					role: memberships.role,
					createdAt: memberships.createdAt,
					updatedAt: memberships.updatedAt,
				})
				.from(memberships)
				.where(eq(memberships.householdId, input.householdId));

			return {
				...household[0],
				animals: householdAnimals,
				memberships: householdMemberships,
			};
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

			if (!household) {
				throw new TRPCError({
					code: "INTERNAL_SERVER_ERROR",
					message: "Failed to create household",
				});
			}

			// Add creator as owner
			await ctx.db.insert(memberships).values({
				userId: ctx.dbUser.id,
				householdId: household.id,
				role: "OWNER",
			});

			return household;
		}),

	// Get members of a household
	getMembers: householdProcedure
		.input(
			z.object({
				householdId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const members = await ctx.db
				.select({
					id: memberships.id,
					userId: memberships.userId,
					householdId: memberships.householdId,
					role: memberships.role,
					createdAt: memberships.createdAt,
					updatedAt: memberships.updatedAt,
					user: {
						id: users.id,
						name: users.name,
						email: users.email,
						image: users.image,
					},
				})
				.from(memberships)
				.innerJoin(users, eq(memberships.userId, users.id))
				.where(eq(memberships.householdId, input.householdId));

			return members;
		}),

	// Get animals for a household
	getAnimals: householdProcedure
		.input(
			z.object({
				householdId: z.string(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const householdAnimals = await ctx.db
				.select()
				.from(animals)
				.where(
					and(
						eq(animals.householdId, input.householdId),
						isNull(animals.deletedAt),
					),
				);

			return householdAnimals;
		}),
});
