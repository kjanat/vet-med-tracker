import { z } from "zod";
import { createTRPCRouter, householdProcedure } from "../trpc/init";
import { animals, type NewAnimal } from "../../db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Input validation schemas
const createAnimalSchema = z.object({
	householdId: z.string().uuid(),
	name: z.string().min(1).max(100),
	species: z.string().min(1).max(50),
	breed: z.string().optional(),
	sex: z.enum(["male", "female"]).optional(),
	neutered: z.boolean().default(false),
	dob: z.string().optional(), // Date as string
	weightKg: z.number().positive().optional(),
	microchipId: z.string().optional(),
	color: z.string().optional(),
	timezone: z.string().default("America/New_York"),
	vetName: z.string().optional(),
	vetPhone: z.string().optional(),
	vetEmail: z.string().email().optional(),
	clinicName: z.string().optional(),
	allergies: z.array(z.string()).optional(),
	conditions: z.array(z.string()).optional(),
	notes: z.string().optional(),
});

const updateAnimalSchema = createAnimalSchema.partial().extend({
	id: z.string().uuid(),
});

export const animalRouter = createTRPCRouter({
	// List all animals in a household
	list: householdProcedure
		.input(
			z.object({
				householdId: z.string().uuid(),
				includeDeleted: z.boolean().default(false),
			}),
		)
		.query(async ({ ctx, input }) => {
			const conditions = [eq(animals.householdId, input.householdId)];

			if (!input.includeDeleted) {
				conditions.push(isNull(animals.deletedAt));
			}

			const result = await ctx.db
				.select()
				.from(animals)
				.where(and(...conditions))
				.orderBy(animals.name);

			return result;
		}),

	// Get a single animal by ID
	getById: householdProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				householdId: z.string().uuid(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const animal = await ctx.db
				.select()
				.from(animals)
				.where(
					and(
						eq(animals.id, input.id),
						eq(animals.householdId, input.householdId),
						isNull(animals.deletedAt),
					),
				)
				.limit(1);

			if (!animal[0]) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Animal not found",
				});
			}

			return animal[0];
		}),

	// Create a new animal
	create: householdProcedure
		.input(createAnimalSchema)
		.mutation(async ({ ctx, input }) => {
			const newAnimal: NewAnimal = {
				...input,
				dob: input.dob,
				weightKg: input.weightKg?.toString(),
			};

			const result = await ctx.db.insert(animals).values(newAnimal).returning();

			// TODO: Create audit log entry

			return result[0];
		}),

	// Update an animal
	update: householdProcedure
		.input(updateAnimalSchema)
		.mutation(async ({ ctx, input }) => {
			const { id, householdId, ...updateData } = input;

			// Verify animal belongs to household
			const existing = await ctx.db
				.select()
				.from(animals)
				.where(
					and(
						eq(animals.id, id),
						eq(animals.householdId, householdId),
						isNull(animals.deletedAt),
					),
				)
				.limit(1);

			if (!existing[0]) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Animal not found",
				});
			}

			const result = await ctx.db
				.update(animals)
				.set({
					...updateData,
					dob: updateData.dob,
					weightKg: updateData.weightKg?.toString(),
					updatedAt: new Date(),
				})
				.where(eq(animals.id, id))
				.returning();

			// TODO: Create audit log entry

			return result[0];
		}),

	// Soft delete an animal
	delete: householdProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				householdId: z.string().uuid(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify animal belongs to household
			const existing = await ctx.db
				.select()
				.from(animals)
				.where(
					and(
						eq(animals.id, input.id),
						eq(animals.householdId, input.householdId),
						isNull(animals.deletedAt),
					),
				)
				.limit(1);

			if (!existing[0]) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Animal not found",
				});
			}

			const result = await ctx.db
				.update(animals)
				.set({
					deletedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(animals.id, input.id))
				.returning();

			// TODO: Create audit log entry

			return { success: true, animal: result[0] };
		}),
});
