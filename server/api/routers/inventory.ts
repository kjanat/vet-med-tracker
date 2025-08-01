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
				unitsTotal: row.item.unitsTotal,
				isExpired:
					row.item.expiresOn && new Date(row.item.expiresOn) < new Date(),
				isWrongMed: false, // TODO: Implement logic to check if it matches the regimen
				inUse: row.item.inUse,
				assignedAnimalId: row.item.assignedAnimalId,
				storage: row.item.storage,
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
				lot: row.item.lot || "",
				expiresOn: row.item.expiresOn ? new Date(row.item.expiresOn) : null,
				unitsRemaining: row.item.unitsRemaining,
				isExpired:
					row.item.expiresOn && new Date(row.item.expiresOn) < new Date(),
				isWrongMed: false,
				inUse: row.item.inUse,
			}));
		}),

	// Create new inventory item
	create: householdProcedure
		.input(
			z.object({
				householdId: z.string().uuid(),
				medicationId: z.string().uuid(),
				brandOverride: z.string().optional(),
				lot: z.string().optional(),
				expiresOn: z.date(),
				storage: z
					.enum(["ROOM", "FRIDGE", "FREEZER", "CONTROLLED"])
					.default("ROOM"),
				unitsTotal: z.number().int().positive(),
				unitType: z.string(),
				purchaseDate: z.date().optional(),
				purchasePrice: z.string().optional(),
				supplier: z.string().optional(),
				notes: z.string().optional(),
				assignedAnimalId: z.string().uuid().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const newItem = await ctx.db
				.insert(inventoryItems)
				.values({
					...input,
					expiresOn: input.expiresOn.toISOString().split("T")[0],
					purchaseDate: input.purchaseDate?.toISOString().split("T")[0],
					unitsRemaining: input.unitsTotal,
				})
				.returning();

			return newItem[0];
		}),

	// Update inventory item
	update: householdProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				householdId: z.string().uuid(),
				brandOverride: z.string().optional(),
				lot: z.string().optional(),
				expiresOn: z.date().optional(),
				storage: z.enum(["ROOM", "FRIDGE", "FREEZER", "CONTROLLED"]).optional(),
				unitsRemaining: z.number().int().optional(),
				notes: z.string().optional(),
				assignedAnimalId: z.string().uuid().nullable().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { id, householdId, expiresOn, ...updateData } = input;

			const updates: Record<string, unknown> = {
				...updateData,
				updatedAt: new Date(),
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
				id: z.string().uuid(),
				householdId: z.string().uuid(),
				inUse: z.boolean(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const updates: Record<string, unknown> = {
				inUse: input.inUse,
				updatedAt: new Date(),
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
				id: z.string().uuid(),
				householdId: z.string().uuid(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const deleted = await ctx.db
				.update(inventoryItems)
				.set({
					deletedAt: new Date(),
					updatedAt: new Date(),
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
				id: z.string().uuid(),
				householdId: z.string().uuid(),
				animalId: z.string().uuid().nullable(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const updated = await ctx.db
				.update(inventoryItems)
				.set({
					assignedAnimalId: input.animalId,
					updatedAt: new Date(),
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
});
