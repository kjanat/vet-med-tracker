import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc/init";

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

			const medications = await ctx.db.medicationCatalog.findMany({
				where: {
					OR: [
						{
							genericName: {
								contains: query,
								mode: "insensitive",
							},
						},
						{
							brandName: {
								contains: query,
								mode: "insensitive",
							},
						},
					],
				},
				take: limit,
				orderBy: [{ genericName: "asc" }, { brandName: "asc" }],
			});

			return medications;
		}),

	getById: protectedProcedure
		.input(
			z.object({
				id: z.string().uuid(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const medication = await ctx.db.medicationCatalog.findUnique({
				where: { id: input.id },
			});

			if (!medication) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Medication not found",
				});
			}

			return medication;
		}),

	// Get frequently used medications for a household
	getFrequentlyUsed: protectedProcedure
		.input(
			z.object({
				householdId: z.string().uuid(),
				limit: z.number().min(1).max(10).default(5),
			}),
		)
		.query(async ({ ctx, input }) => {
			const { householdId, limit } = input;

			// Verify household access
			await ctx.verifyHouseholdMembership(householdId);

			// Get medications used in inventory items for this household
			const frequentMeds = await ctx.db.inventoryItem.groupBy({
				by: ["medicationId"],
				where: {
					householdId,
					deletedAt: null,
				},
				_count: {
					medicationId: true,
				},
				orderBy: {
					_count: {
						medicationId: "desc",
					},
				},
				take: limit,
			});

			if (frequentMeds.length === 0) {
				return [];
			}

			// Get medication details
			const medications = await ctx.db.medicationCatalog.findMany({
				where: {
					id: {
						in: frequentMeds.map((med) => med.medicationId),
					},
				},
			});

			// Sort by usage count
			const medicationMap = new Map(medications.map((med) => [med.id, med]));
			return frequentMeds
				.map((freq) => medicationMap.get(freq.medicationId))
				.filter(Boolean);
		}),
});
