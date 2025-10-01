import { and } from "drizzle-orm";
import { z } from "zod";
import { vetmedAnimals as animals } from "@/db/schema";
import {
  createCreateHandler,
  createGetByIdHandler,
  createListQueryConditions,
  createSoftDeleteHandler,
  createUpdateHandler,
} from "@/lib/utils/crud-operations";
import {
  householdIdInput,
  idWithHouseholdInput,
} from "@/lib/utils/validation-helpers";
import { createTRPCRouter, householdProcedure } from "../trpc";

export const animalsRouter = createTRPCRouter({
  create: householdProcedure
    .input(
      z.object({
        allergies: z.array(z.string()).optional(),
        breed: z.string().optional(),
        conditions: z.array(z.string()).optional(),
        householdId: z.uuid(),
        name: z.string().min(1),
        photoUrl: z.url().optional(),
        species: z.string(),
        timezone: z.string().default("UTC"),
        weightKg: z.number().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) =>
      createCreateHandler({
        entityName: "Animal",
        table: animals,
        transformData: (data) => ({
          ...data,
          allergies: (data["allergies"] as string[]) || [],
          conditions: (data["conditions"] as string[]) || [],
          weightKg: data["weightKg"]
            ? (data["weightKg"] as number).toString()
            : undefined,
        }),
      })(ctx.db, input),
    ),

  delete: householdProcedure
    .input(idWithHouseholdInput)
    .mutation(async ({ ctx, input }) =>
      createSoftDeleteHandler({
        deletedAtColumn: animals.deletedAt,
        entityName: "Animal",
        householdColumn: animals.householdId,
        idColumn: animals.id,
        table: animals,
      })(ctx.db, input),
    ),

  getById: householdProcedure
    .input(idWithHouseholdInput)
    .query(async ({ ctx, input }) =>
      createGetByIdHandler({
        deletedAtColumn: animals.deletedAt,
        entityName: "Animal",
        householdColumn: animals.householdId,
        idColumn: animals.id,
        table: animals,
      })(ctx.db, input),
    ),

  list: householdProcedure
    .input(householdIdInput)
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select()
        .from(animals)
        .where(
          and(
            ...createListQueryConditions(
              animals,
              input.householdId,
              animals.householdId,
              animals.deletedAt,
            ),
          ),
        )
        .orderBy(animals.name);
    }),

  update: householdProcedure
    .input(
      z.object({
        allergies: z.array(z.string()).optional(),
        breed: z.string().optional(),
        conditions: z.array(z.string()).optional(),
        householdId: z.uuid(),
        id: z.uuid(),
        name: z.string().min(1).optional(),
        photoUrl: z.url().optional(),
        species: z.string().optional(),
        timezone: z.string().optional(),
        weightKg: z.number().positive().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) =>
      createUpdateHandler({
        deletedAtColumn: animals.deletedAt,
        entityName: "Animal",
        householdColumn: animals.householdId,
        idColumn: animals.id,
        table: animals,
        transformData: (data) => ({
          ...data,
          weightKg: data["weightKg"] ? data["weightKg"].toString() : undefined,
        }),
      })(ctx.db, input),
    ),
});
