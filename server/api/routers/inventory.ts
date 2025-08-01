import { and, eq, gte, isNull } from "drizzle-orm";
import { z } from "zod";
import { inventoryItems, medicationCatalog } from "../../db/schema";
import { createTRPCRouter, householdProcedure } from "../trpc/init";

export const inventoryRouter = createTRPCRouter({
	// List inventory items for a household
	list: householdProcedure
		.input(
			z.object({
				householdId: z.string().uuid(),
				medicationId: z.string().uuid().optional(),
				animalId: z.string().uuid().optional(),
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
					gte(inventoryItems.expiresOn, new Date().toISOString().split("T")[0]),
				);
			}

			if (input.inUseOnly) {
				conditions.push(eq(inventoryItems.inUse, true));
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
				.orderBy(inventoryItems.expiresOn, inventoryItems.lotNumber);

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
				lot: row.item.lotNumber || "",
				expiresOn: row.item.expiresOn ? new Date(row.item.expiresOn) : null,
				unitsRemaining: row.item.unitsRemaining,
				unitsTotal: row.item.unitsTotal,
				isExpired:
					row.item.expiresOn && new Date(row.item.expiresOn) < new Date(),
				isWrongMed: false, // TODO: Implement logic to check if it matches the regimen
				inUse: row.item.inUse,
				assignedAnimalId: row.item.assignedAnimalId,
				storageLocation: row.item.storageLocation,
				notes: row.item.notes,
			}));
		}),

	// Get sources for a specific medication
	getSources: householdProcedure
		.input(
			z.object({
				householdId: z.string().uuid(),
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
					gte(inventoryItems.expiresOn, new Date().toISOString().split("T")[0]),
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
				lot: row.item.lotNumber || "",
				expiresOn: row.item.expiresOn ? new Date(row.item.expiresOn) : null,
				unitsRemaining: row.item.unitsRemaining,
				isExpired:
					row.item.expiresOn && new Date(row.item.expiresOn) < new Date(),
				isWrongMed: false,
				inUse: row.item.inUse,
			}));
		}),
});
