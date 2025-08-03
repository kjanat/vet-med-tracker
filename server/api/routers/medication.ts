import { TRPCError } from "@trpc/server";
import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import { z } from "zod";
import { inventoryItems, medicationCatalog } from "@/db/schema";
import {
	createTRPCRouter,
	householdProcedure,
	protectedProcedure,
} from "../trpc/clerk-init";

export const medicationRouter = createTRPCRouter({
	search: protectedProcedure
		.input(
			z.object({
				query: z.string().min(1),
				limit: z.number().min(1).max(50).default(10),
			}),
		)
		.query(async ({ ctx, input }) => {
			const { query, limit } = input;

			const medications = await ctx.db
				.select()
				.from(medicationCatalog)
				.where(
					or(
						ilike(medicationCatalog.genericName, `%${query}%`),
						ilike(medicationCatalog.brandName, `%${query}%`),
					),
				)
				.orderBy(medicationCatalog.genericName, medicationCatalog.brandName)
				.limit(limit);

			return medications;
		}),

	getById: protectedProcedure
		.input(
			z.object({
				id: z.string().uuid(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const medications = await ctx.db
				.select()
				.from(medicationCatalog)
				.where(eq(medicationCatalog.id, input.id))
				.limit(1);

			if (medications.length === 0) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Medication not found",
				});
			}

			return medications[0];
		}),

	// Get frequently used medications for a household
	getFrequentlyUsed: householdProcedure
		.input(
			z.object({
				householdId: z.string().uuid(),
				limit: z.number().min(1).max(10).default(5),
			}),
		)
		.query(async ({ ctx, input }) => {
			const { householdId, limit } = input;

			// Get medications used in inventory items for this household
			const frequentMeds = await ctx.db
				.select({
					medicationId: inventoryItems.medicationId,
					count: sql<number>`count(*)::int`,
				})
				.from(inventoryItems)
				.where(
					and(
						eq(inventoryItems.householdId, householdId),
						isNull(inventoryItems.deletedAt),
					),
				)
				.groupBy(inventoryItems.medicationId)
				.orderBy(desc(sql`count(*)`))
				.limit(limit);

			if (frequentMeds.length === 0) {
				return [];
			}

			// Get medication details
			const medicationIds = frequentMeds
				.map((fm) => fm.medicationId)
				.filter((id): id is string => id !== null);
			if (medicationIds.length === 0) {
				return [];
			}

			const medications = await ctx.db
				.select()
				.from(medicationCatalog)
				.where(sql`${medicationCatalog.id} = ANY(${medicationIds})`);

			// Sort by usage count
			const medicationMap = new Map(medications.map((med) => [med.id, med]));
			return frequentMeds
				.map((freq) =>
					freq.medicationId ? medicationMap.get(freq.medicationId) : undefined,
				)
				.filter((med): med is (typeof medications)[0] => med !== undefined);
		}),
});
