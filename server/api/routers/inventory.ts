import { and, count, eq, gte, inArray, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  administrations,
  animals,
  inventoryItems,
  medicationCatalog,
  regimens,
} from "@/db/schema";
import { createTRPCRouter, householdProcedure } from "@/server/api/trpc";

export const inventoryRouter = createTRPCRouter({
  // List inventory items for a household
  list: householdProcedure
    .input(
      z.object({
        householdId: z.uuid(),
        medicationId: z.uuid().optional(),
        animalId: z.uuid().optional(),
        includeExpired: z.boolean().default(false),
        inUseOnly: z.boolean().default(false),
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
        conditions.push(
          gte(
            inventoryItems.expiresOn,
            new Date().toISOString().split("T")[0] ?? "",
          ),
        );
      }

      if (input.inUseOnly) {
        conditions.push(eq(inventoryItems.inUse, true));
      }

      const result = await ctx.db
        .select({
          item: inventoryItems,
          medication: medicationCatalog,
          animal: animals,
        })
        .from(inventoryItems)
        .innerJoin(
          medicationCatalog,
          eq(inventoryItems.medicationId, medicationCatalog.id),
        )
        .leftJoin(animals, eq(inventoryItems.assignedAnimalId, animals.id))
        .where(and(...conditions))
        .orderBy(inventoryItems.expiresOn, inventoryItems.lot);

      // Transform results to match frontend expectations
      return result.map((row) => ({
        id: row.item.id,
        householdId: row.item.householdId,
        medicationId: row.item.medicationId,
        name:
          row.item.brandOverride ||
          row.medication.brandName ||
          row.medication.genericName,
        genericName: row.medication.genericName,
        strength: row.medication.strength,
        form: row.medication.form,
        route: row.medication.route,
        lot: row.item.lot || "",
        expiresOn: row.item.expiresOn ? new Date(row.item.expiresOn) : null,
        unitsRemaining: row.item.unitsRemaining,
        unitsTotal: row.item.quantityUnits || 0,
        isExpired: !!(
          row.item.expiresOn && new Date(row.item.expiresOn) < new Date()
        ),
        isWrongMed: false, // TODO: Implement logic to check if it matches the regimen
        inUse: row.item.inUse,
        assignedAnimalId: row.item.assignedAnimalId,
        assignedAnimalName: row.animal?.name || null,
        storage: row.item.storage,
        notes: row.item.notes,
      }));
    }),

  // Get sources for a specific medication
  getSources: householdProcedure
    .input(
      z.object({
        householdId: z.uuid(),
        medicationName: z.string(),
        includeExpired: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      // For now, just get all inventory items for the household
      // TODO: Implement proper text search for medication names
      const conditions = [
        eq(inventoryItems.householdId, input.householdId),
        isNull(inventoryItems.deletedAt),
      ];

      if (!input.includeExpired) {
        conditions.push(
          gte(
            inventoryItems.expiresOn,
            new Date().toISOString().split("T")[0] ?? "",
          ),
        );
      }

      const result = await ctx.db
        .select({
          item: inventoryItems,
          medication: medicationCatalog,
        })
        .from(inventoryItems)
        .innerJoin(
          medicationCatalog,
          eq(inventoryItems.medicationId, medicationCatalog.id),
        )
        .where(and(...conditions))
        .orderBy(inventoryItems.inUse, inventoryItems.expiresOn);

      // Filter by medication name on the application side for now
      const filtered = result.filter((row) => {
        const itemName = (
          row.item.brandOverride ||
          row.medication.brandName ||
          row.medication.genericName ||
          ""
        ).toLowerCase();
        return itemName.includes(input.medicationName.toLowerCase());
      });

      return filtered.map((row) => ({
        id: row.item.id,
        name:
          row.item.brandOverride ||
          row.medication.brandName ||
          row.medication.genericName,
        lot: row.item.lot || "",
        expiresOn: row.item.expiresOn ? new Date(row.item.expiresOn) : null,
        unitsRemaining: row.item.unitsRemaining || 0,
        isExpired: !!(
          row.item.expiresOn && new Date(row.item.expiresOn) < new Date()
        ),
        isWrongMed: false,
        inUse: row.item.inUse,
      }));
    }),

  // Create new inventory item
  create: householdProcedure
    .input(
      z.object({
        householdId: z.uuid(),
        medicationId: z.uuid(),
        brandOverride: z.string().optional(),
        lot: z.string().optional(),
        expiresOn: z.date(),
        storage: z
          .enum(["ROOM", "FRIDGE", "FREEZER", "CONTROLLED"])
          .default("ROOM"),
        unitsTotal: z.number().int().positive(),
        unitsRemaining: z.number().int().min(0).optional(), // Optional, defaults to unitsTotal
        unitType: z.string(),
        purchaseDate: z.date().optional(),
        purchasePrice: z.string().optional(),
        supplier: z.string().optional(),
        notes: z.string().optional(),
        assignedAnimalId: z.uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const {
        unitsTotal,
        unitsRemaining,
        expiresOn,
        purchaseDate,
        ...restInput
      } = input;

      // Build the values object, excluding undefined optional fields
      const expiryDateStr = expiresOn.toISOString().split("T")[0];
      if (!expiryDateStr) {
        throw new Error("Invalid expiry date");
      }

      const values: Record<string, unknown> = {
        householdId: restInput.householdId,
        medicationId: restInput.medicationId,
        expiresOn: expiryDateStr,
        storage: restInput.storage,
        quantityUnits: unitsTotal,
        unitsRemaining: unitsRemaining ?? unitsTotal, // Use provided value or default to unitsTotal
        unitType: restInput.unitType,
      };

      // Add optional fields only if they have values
      if (restInput.brandOverride)
        values.brandOverride = restInput.brandOverride;
      if (restInput.lot) values.lot = restInput.lot;
      if (restInput.notes) values.notes = restInput.notes;
      if (restInput.assignedAnimalId)
        values.assignedAnimalId = restInput.assignedAnimalId;
      if (restInput.supplier) values.supplier = restInput.supplier;
      if (restInput.purchasePrice)
        values.purchasePrice = restInput.purchasePrice;
      if (purchaseDate) {
        const purchaseDateStr = purchaseDate.toISOString().split("T")[0];
        if (purchaseDateStr) {
          values.purchaseDate = purchaseDateStr;
        }
      }

      // Clean undefined values to prevent database issues
      const cleanValues = Object.fromEntries(
        Object.entries(values).filter(([_, value]) => value !== undefined),
      ) as typeof inventoryItems.$inferInsert;

      try {
        console.log(
          "Attempting to insert inventory item with cleanValues:",
          JSON.stringify(cleanValues, null, 2),
        );

        const newItem = await ctx.db
          .insert(inventoryItems)
          .values(cleanValues)
          .returning();

        return newItem[0];
      } catch (error: unknown) {
        const errorObj = error as Error & {
          cause?: { message?: string };
          code?: string;
          detail?: string;
        };
        console.error("Inventory insert error details:", {
          message: errorObj?.message,
          cause: errorObj?.cause?.message,
          code: errorObj?.code,
          detail: errorObj?.detail,
          values: JSON.stringify(values, null, 2),
          stack: errorObj?.stack,
        });
        throw error;
      }
    }),

  // Update inventory item
  update: householdProcedure
    .input(
      z.object({
        id: z.uuid(),
        householdId: z.uuid(),
        brandOverride: z.string().optional(),
        lot: z.string().optional(),
        expiresOn: z.date().optional(),
        storage: z.enum(["ROOM", "FRIDGE", "FREEZER", "CONTROLLED"]).optional(),
        unitsRemaining: z.number().int().optional(),
        notes: z.string().optional(),
        assignedAnimalId: z.uuid().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, householdId, expiresOn, ...updateData } = input;

      const updates: Record<string, unknown> = {
        ...updateData,
        updatedAt: new Date().toISOString(),
      };

      if (expiresOn) {
        updates.expiresOn = expiresOn.toISOString().split("T")[0];
      }

      const updated = await ctx.db
        .update(inventoryItems)
        .set(updates)
        .where(
          and(
            eq(inventoryItems.id, id),
            eq(inventoryItems.householdId, householdId),
            isNull(inventoryItems.deletedAt),
          ),
        )
        .returning();

      if (!updated[0]) {
        throw new Error("Inventory item not found or already deleted");
      }

      return updated[0];
    }),

  // Set in-use status
  setInUse: householdProcedure
    .input(
      z.object({
        id: z.uuid(),
        householdId: z.uuid(),
        inUse: z.boolean(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, unknown> = {
        inUse: input.inUse,
        updatedAt: new Date().toISOString(),
      };

      if (input.inUse) {
        updates.openedOn = new Date().toISOString().split("T")[0];
      }

      const updated = await ctx.db
        .update(inventoryItems)
        .set(updates)
        .where(
          and(
            eq(inventoryItems.id, input.id),
            eq(inventoryItems.householdId, input.householdId),
            isNull(inventoryItems.deletedAt),
          ),
        )
        .returning();

      if (!updated[0]) {
        throw new Error("Inventory item not found or already deleted");
      }

      return updated[0];
    }),

  // Delete inventory item (soft delete)
  delete: householdProcedure
    .input(
      z.object({
        id: z.uuid(),
        householdId: z.uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const deleted = await ctx.db
        .update(inventoryItems)
        .set({
          deletedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(inventoryItems.id, input.id),
            eq(inventoryItems.householdId, input.householdId),
            isNull(inventoryItems.deletedAt),
          ),
        )
        .returning();

      if (!deleted[0]) {
        throw new Error("Inventory item not found or already deleted");
      }

      return deleted[0];
    }),

  // Assign to animal
  assignToAnimal: householdProcedure
    .input(
      z.object({
        id: z.uuid(),
        householdId: z.uuid(),
        animalId: z.uuid().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updated = await ctx.db
        .update(inventoryItems)
        .set({
          assignedAnimalId: input.animalId,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(inventoryItems.id, input.id),
            eq(inventoryItems.householdId, input.householdId),
            isNull(inventoryItems.deletedAt),
          ),
        )
        .returning();

      if (!updated[0]) {
        throw new Error("Inventory item not found or already deleted");
      }

      return updated[0];
    }),

  // Update quantity (used by offline queue)
  updateQuantity: householdProcedure
    .input(
      z.object({
        id: z.uuid(),
        householdId: z.uuid(),
        quantityChange: z.number().int(), // negative for decrement
        reason: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // First get current quantity
      const current = await ctx.db
        .select({ unitsRemaining: inventoryItems.unitsRemaining })
        .from(inventoryItems)
        .where(
          and(
            eq(inventoryItems.id, input.id),
            eq(inventoryItems.householdId, input.householdId),
            isNull(inventoryItems.deletedAt),
          ),
        )
        .limit(1)
        .execute();

      if (!current[0]) {
        throw new Error("Inventory item not found or already deleted");
      }

      const newQuantity =
        (current[0].unitsRemaining || 0) + input.quantityChange;
      if (newQuantity < 0) {
        throw new Error("Insufficient quantity");
      }

      const updated = await ctx.db
        .update(inventoryItems)
        .set({
          unitsRemaining: newQuantity,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(inventoryItems.id, input.id),
            eq(inventoryItems.householdId, input.householdId),
            isNull(inventoryItems.deletedAt),
          ),
        )
        .returning();

      return updated[0];
    }),

  // Mark as in use (convenience method for offline queue)
  markAsInUse: householdProcedure
    .input(
      z.object({
        id: z.uuid(),
        householdId: z.uuid(),
        animalId: z.uuid().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const updates: Record<string, unknown> = {
        inUse: true,
        openedOn: new Date().toISOString().split("T")[0],
        updatedAt: new Date().toISOString(),
      };

      if (input.animalId) {
        updates.assignedAnimalId = input.animalId;
      }

      const updated = await ctx.db
        .update(inventoryItems)
        .set(updates)
        .where(
          and(
            eq(inventoryItems.id, input.id),
            eq(inventoryItems.householdId, input.householdId),
            isNull(inventoryItems.deletedAt),
          ),
        )
        .returning();

      if (!updated[0]) {
        throw new Error("Inventory item not found or already deleted");
      }

      return updated[0];
    }),

  // Calculate days of supply for inventory items
  getDaysOfSupply: householdProcedure
    .input(
      z.object({
        householdId: z.uuid(),
        itemIds: z.array(z.uuid()).optional(), // If provided, only calculate for these items
      }),
    )
    .query(async ({ ctx, input }) => {
      // Get inventory items with their medication info and assigned animals
      const inventoryConditions = [
        eq(inventoryItems.householdId, input.householdId),
        isNull(inventoryItems.deletedAt),
        gte(inventoryItems.unitsRemaining, 1), // Only items with remaining units
      ];

      if (input.itemIds?.length) {
        inventoryConditions.push(inArray(inventoryItems.id, input.itemIds));
      }

      const inventoryResult = await ctx.db
        .select({
          itemId: inventoryItems.id,
          medicationId: inventoryItems.medicationId,
          assignedAnimalId: inventoryItems.assignedAnimalId,
          unitsRemaining: inventoryItems.unitsRemaining,
          animalName: animals.name,
        })
        .from(inventoryItems)
        .leftJoin(animals, eq(inventoryItems.assignedAnimalId, animals.id))
        .where(and(...inventoryConditions));

      // Calculate days of supply for each item
      const daysOfSupplyResults = await Promise.all(
        inventoryResult.map(async (item) => {
          try {
            // Calculate average daily usage from the last 30 days of administrations
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            // Build conditions array dynamically
            const conditions = [
              eq(administrations.householdId, input.householdId),
              eq(regimens.medicationId, item.medicationId),
              gte(administrations.recordedAt, thirtyDaysAgo.toISOString()),
            ];

            // Only count administrations for the assigned animal if item is assigned
            if (item.assignedAnimalId) {
              conditions.push(
                eq(administrations.animalId, item.assignedAnimalId),
              );
            }

            const usageQuery = ctx.db
              .select({
                adminCount: count(administrations.id),
              })
              .from(administrations)
              .innerJoin(regimens, eq(administrations.regimenId, regimens.id))
              .where(and(...conditions));

            const usageResult = await usageQuery;
            const totalAdministrations = usageResult[0]?.adminCount || 0;

            // Calculate average daily usage (administrations per day)
            const averageDailyUsage = totalAdministrations / 30;

            // If no usage data, return null (will display as "—")
            if (averageDailyUsage === 0 || !item.unitsRemaining) {
              return {
                itemId: item.itemId,
                daysLeft: null,
                animalName: item.animalName,
              };
            }

            // Calculate days of supply
            const daysLeft = Math.floor(
              item.unitsRemaining / averageDailyUsage,
            );

            return {
              itemId: item.itemId,
              daysLeft: daysLeft > 0 ? daysLeft : 0,
              animalName: item.animalName,
            };
          } catch (error) {
            console.error(
              `Error calculating days of supply for item ${item.itemId}:`,
              error,
            );
            return {
              itemId: item.itemId,
              daysLeft: null,
              animalName: item.animalName,
            };
          }
        }),
      );

      return daysOfSupplyResults;
    }),

  // Get household inventory (used by offline queue)
  getHouseholdInventory: householdProcedure
    .input(
      z.object({
        householdId: z.uuid(),
        medicationId: z.uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const conditions = [
        eq(inventoryItems.householdId, input.householdId),
        isNull(inventoryItems.deletedAt),
        gte(
          inventoryItems.expiresOn,
          new Date().toISOString().split("T")[0] ?? "",
        ),
      ];

      if (input.medicationId) {
        conditions.push(eq(inventoryItems.medicationId, input.medicationId));
      }

      const result = await ctx.db
        .select({
          item: inventoryItems,
          medication: medicationCatalog,
        })
        .from(inventoryItems)
        .innerJoin(
          medicationCatalog,
          eq(inventoryItems.medicationId, medicationCatalog.id),
        )
        .where(and(...conditions))
        .orderBy(inventoryItems.expiresOn, inventoryItems.lot)
        .execute();

      return result.map((row) => ({
        id: row.item.id,
        quantity: row.item.unitsRemaining,
        medicationName:
          row.item.brandOverride ||
          row.medication.brandName ||
          row.medication.genericName,
        expiresOn: row.item.expiresOn,
        inUse: row.item.inUse,
      }));
    }),
});
