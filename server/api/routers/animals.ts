import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { animals, type NewAnimal } from "@/db/schema";
import {
  auditDatabaseOperation,
  createFailureAudit,
  logAuditEvent,
} from "@/lib/security/audit-logger";
import { createTRPCRouter, householdProcedure } from "@/server/api/trpc";

// Input validation schemas
const createAnimalSchema = z.object({
  allergies: z.array(z.string()).optional(),
  breed: z.string().optional(),
  clinicName: z.string().optional(),
  color: z.string().optional(),
  conditions: z.array(z.string()).optional(),
  dob: z.string().optional(), // Date as string
  microchipId: z.string().optional(),
  name: z.string().min(1).max(100),
  neutered: z.boolean().default(false),
  notes: z.string().optional(),
  sex: z.enum(["Male", "Female"]).optional(),
  species: z.string().min(1).max(50),
  timezone: z.string().default("America/New_York"),
  vetEmail: z.email().optional(),
  vetName: z.string().optional(),
  vetPhone: z.string().optional(),
  weightKg: z.number().positive().optional(),
});

const updateAnimalSchema = createAnimalSchema.partial().extend({
  id: z.uuid(),
});

export const animalRouter = createTRPCRouter({
  // Create a new animal
  create: householdProcedure
    .input(createAnimalSchema)
    .mutation(async ({ ctx, input }) => {
      const newAnimal: NewAnimal = {
        ...input,
        dob: input.dob,
        householdId: ctx.householdId, // Use householdId from context
        weightKg: input.weightKg?.toString(),
      };

      try {
        const result = await ctx.db
          .insert(animals)
          .values(newAnimal)
          .returning();

        // Create audit log entry for successful animal creation
        await auditDatabaseOperation(
          ctx.dbUser.id,
          "CREATE",
          "ANIMAL",
          result[0]?.id,
          {
            animalName: input.name,
            householdId: ctx.householdId,
            species: input.species,
          },
        );

        return result[0];
      } catch (error) {
        // Log failed animal creation attempt
        await logAuditEvent(
          createFailureAudit(
            ctx.dbUser.id,
            "CREATE",
            "ANIMAL",
            error instanceof Error
              ? error.message
              : "Unknown error creating animal",
            undefined,
            {
              animalName: input.name,
              householdId: ctx.householdId,
              species: input.species,
            },
          ),
        );
        throw error;
      }
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
        // Log failed deletion attempt (animal not found)
        await logAuditEvent(
          createFailureAudit(
            ctx.dbUser.id,
            "DELETE",
            "ANIMAL",
            "Animal not found or not authorized",
            input.id,
            {
              householdId: ctx.householdId,
            },
          ),
        );

        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Animal not found",
        });
      }

      try {
        const result = await ctx.db
          .update(animals)
          .set({
            deletedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(animals.id, input.id))
          .returning();

        // Create audit log entry for successful animal deletion
        await auditDatabaseOperation(
          ctx.dbUser.id,
          "DELETE",
          "ANIMAL",
          input.id,
          {
            animalName: existing[0].name,
            householdId: ctx.householdId,
            species: existing[0].species,
          },
        );

        return { animal: result[0], success: true };
      } catch (error) {
        // Log failed deletion attempt
        await logAuditEvent(
          createFailureAudit(
            ctx.dbUser.id,
            "DELETE",
            "ANIMAL",
            error instanceof Error
              ? error.message
              : "Unknown error deleting animal",
            input.id,
            {
              animalName: existing[0].name,
              householdId: ctx.householdId,
              species: existing[0].species,
            },
          ),
        );
        throw error;
      }
    }),

  // Get a single animal by ID
  getById: householdProcedure
    .input(
      z.object({
        householdId: z.uuid(),
        id: z.uuid(),
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

      return ctx.db
        .select()
        .from(animals)
        .where(and(...conditions))
        .orderBy(animals.name);
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
        // Log failed update attempt (animal not found)
        await logAuditEvent(
          createFailureAudit(
            ctx.dbUser.id,
            "UPDATE",
            "ANIMAL",
            "Animal not found or not authorized",
            id,
            {
              householdId: ctx.householdId,
              updateData,
            },
          ),
        );

        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Animal not found",
        });
      }

      try {
        const result = await ctx.db
          .update(animals)
          .set({
            ...updateData,
            dob: updateData.dob,
            updatedAt: new Date(),
            weightKg: updateData.weightKg?.toString(),
          })
          .where(eq(animals.id, id))
          .returning();

        // Create audit log entry for successful animal update
        await auditDatabaseOperation(ctx.dbUser.id, "UPDATE", "ANIMAL", id, {
          animalName: existing[0].name,
          householdId: ctx.householdId,
          previousValues: {
            name: existing[0].name,
            species: existing[0].species,
            weightKg: existing[0].weightKg,
          },
          species: existing[0].species,
          updatedFields: Object.keys(updateData),
        });

        return result[0];
      } catch (error) {
        // Log failed update attempt
        await logAuditEvent(
          createFailureAudit(
            ctx.dbUser.id,
            "UPDATE",
            "ANIMAL",
            error instanceof Error
              ? error.message
              : "Unknown error updating animal",
            id,
            {
              animalName: existing[0].name,
              householdId: ctx.householdId,
              species: existing[0].species,
              updateData,
            },
          ),
        );
        throw error;
      }
    }),
});
