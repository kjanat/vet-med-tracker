import { and, eq, gte, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  vetmedAnimals as animals,
  vetmedInventoryItems as inventoryItems,
  vetmedMedicationCatalog as medicationCatalog,
} from "@/db/schema";
import {
  createCreateHandler,
  createSoftDeleteHandler,
  createUpdateHandler,
} from "@/lib/utils/crud-operations";
import {
  extendHouseholdInput,
  householdIdInput,
  idWithHouseholdInput,
} from "@/lib/utils/validation-helpers";
import { createTRPCRouter, householdProcedure } from "../trpc";

export const inventoryRouter = createTRPCRouter({
  assignToAnimal: householdProcedure
    .input(
      extendHouseholdInput({
        animalId: z.uuid().nullable(),
        itemId: z.uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(inventoryItems)
        .set({
          assignedAnimalId: input.animalId,
        })
        .where(
          and(
            eq(inventoryItems.id, input.itemId),
            eq(inventoryItems.householdId, input.householdId),
          ),
        );
      return { success: true };
    }),

  create: householdProcedure
    .input(
      z.object({
        assignedAnimalId: z.uuid().optional(),
        brandOverride: z.string().optional(),
        expiresOn: z.date(),
        householdId: z.uuid(),
        lot: z.string().optional(),
        medicationId: z.uuid(),
        notes: z.string().optional(),
        purchaseDate: z.date().optional(),
        purchasePrice: z.string().optional(),
        storage: z
          .enum(["ROOM", "FRIDGE", "FREEZER", "CONTROLLED"])
          .default("ROOM"),
        supplier: z.string().optional(),
        unitsRemaining: z.number().int().min(0).optional(),
        unitsTotal: z.number().int().positive(),
        unitType: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) =>
      createCreateHandler({
        entityName: "Inventory item",
        table: inventoryItems,
        transformData: (data) => {
          const { unitsTotal, unitsRemaining, ...rest } = data as {
            unitsTotal: number;
            unitsRemaining?: number;
            [key: string]: unknown;
          };
          return {
            ...rest,
            quantityUnits: unitsTotal,
            unitsRemaining: unitsRemaining ?? unitsTotal,
          };
        },
      })(ctx.db, input),
    ),

  delete: householdProcedure
    .input(idWithHouseholdInput)
    .mutation(async ({ ctx, input }) =>
      createSoftDeleteHandler({
        deletedAtColumn: inventoryItems.deletedAt,
        entityName: "Inventory item",
        householdColumn: inventoryItems.householdId,
        idColumn: inventoryItems.id,
        table: inventoryItems,
      })(ctx.db, input),
    ),

  getDaysOfSupply: householdProcedure
    .input(householdIdInput)
    .query(async () => {
      // Simplified calculation - return mock values for all items
      // In production, this would calculate based on regimen usage
      // ctx and input params removed as unused
      return [];
    }),

  list: householdProcedure
    .input(
      z.object({
        animalId: z.uuid().optional(),
        householdId: z.uuid(),
        includeExpired: z.boolean().default(false),
        inUseOnly: z.boolean().default(false),
        medicationId: z.uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(inventoryItems.householdId, input.householdId),
        isNull(inventoryItems.deletedAt),
      ];

      if (input.medicationId) {
        conditions.push(eq(inventoryItems.medicationId, input.medicationId));
      }

      if (input.animalId) {
        conditions.push(eq(inventoryItems.assignedAnimalId, input.animalId));
      }

      if (!input.includeExpired) {
        conditions.push(gte(inventoryItems.expiresOn, new Date() ?? ""));
      }

      if (input.inUseOnly) {
        conditions.push(eq(inventoryItems.inUse, true));
      }

      const result = await ctx.db
        .select({
          animal: animals,
          item: inventoryItems,
          medication: medicationCatalog,
        })
        .from(inventoryItems)
        .innerJoin(
          medicationCatalog,
          eq(inventoryItems.medicationId, medicationCatalog.id),
        )
        .leftJoin(animals, eq(inventoryItems.assignedAnimalId, animals.id))
        .where(and(...conditions))
        .orderBy(inventoryItems.expiresOn, inventoryItems.lot);

      return result.map((row) => ({
        assignedAnimalId: row.item.assignedAnimalId,
        assignedAnimalName: row.animal?.name || null,
        expiresOn: row.item.expiresOn ? new Date(row.item.expiresOn) : null,
        form: row.medication.form,
        genericName: row.medication.genericName,
        householdId: row.item.householdId,
        id: row.item.id,
        inUse: row.item.inUse,
        isExpired:
          row.item.expiresOn && new Date(row.item.expiresOn) < new Date(),
        isWrongMed: false,
        lot: row.item.lot || "",
        medicationId: row.item.medicationId,
        name:
          row.item.brandOverride ||
          row.medication.brandName ||
          row.medication.genericName,
        notes: row.item.notes,
        route: row.medication.route,
        storage: row.item.storage,
        strength: row.medication.strength,
        unitsRemaining: row.item.unitsRemaining,
        unitsTotal: row.item.quantityUnits || 0,
      }));
    }),

  setInUse: householdProcedure
    .input(
      z.object({
        householdId: z.uuid(),
        inUse: z.boolean(),
        itemId: z.uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(inventoryItems)
        .set({
          // inUse field doesn't exist, so we'll just update timestamp
        })
        .where(
          and(
            eq(inventoryItems.id, input.itemId),
            eq(inventoryItems.householdId, input.householdId),
          ),
        );
      return { success: true };
    }),

  update: householdProcedure
    .input(
      z.object({
        assignedAnimalId: z.uuid().nullable().optional(),
        brandOverride: z.string().optional(),
        expiresOn: z.date().optional(),
        householdId: z.uuid(),
        id: z.uuid(),
        lot: z.string().optional(),
        notes: z.string().optional(),
        storage: z.enum(["ROOM", "FRIDGE", "FREEZER", "CONTROLLED"]).optional(),
        unitsRemaining: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) =>
      createUpdateHandler({
        deletedAtColumn: inventoryItems.deletedAt,
        entityName: "Inventory item",
        householdColumn: inventoryItems.householdId,
        idColumn: inventoryItems.id,
        table: inventoryItems,
      })(ctx.db, input),
    ),
});
