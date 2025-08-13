import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { animals, type NewAnimal } from "@/db/schema";
import { createTRPCRouter, householdProcedure } from "@/server/api/trpc";

// Input validation schemas
const createAnimalSchema = z.object({
  name: z.string().min(1).max(100),
  species: z.string().min(1).max(50),
  breed: z.string().optional(),
  sex: z.enum(["Male", "Female"]).optional(),
  neutered: z.boolean().default(false),
  dob: z.string().optional(), // Date as string
  weightKg: z.number().positive().optional(),
  microchipId: z.string().optional(),
  color: z.string().optional(),
  timezone: z.string().default("America/New_York"),
  vetName: z.string().optional(),
  vetPhone: z.string().optional(),
  vetEmail: z.email().optional(),
  clinicName: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  conditions: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

const updateAnimalSchema = createAnimalSchema.partial().extend({
  id: z.uuid(),
});

export const animalRouter = createTRPCRouter({
  // List all animals in a household
  list: householdProcedure
    .input(
      z.object({
        householdId: z.uuid(),
        includeDeleted: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(animals.householdId, input.householdId)];

      if (!input.includeDeleted) {
        conditions.push(isNull(animals.deletedAt));
      }

      return await ctx.db
        .select()
        .from(animals)
        .where(and(...conditions))
        .orderBy(animals.name);
    }),

  // Get a single animal by ID
  getById: householdProcedure
    .input(
      z.object({
        id: z.uuid(),
        householdId: z.uuid(),
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
        householdId: ctx.householdId, // Use householdId from context
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
      const { id, ...updateData } = input;

      // Verify animal belongs to household
      const existing = await ctx.db
        .select()
        .from(animals)
        .where(
          and(
            eq(animals.id, id),
            eq(animals.householdId, ctx.householdId),
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
          updatedAt: new Date().toISOString(),
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
        id: z.uuid(),
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
            eq(animals.householdId, ctx.householdId),
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
          deletedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(eq(animals.id, input.id))
        .returning();

      // TODO: Create audit log entry

      return { success: true, animal: result[0] };
    }),
});
