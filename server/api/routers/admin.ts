import { TRPCError } from "@trpc/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";
import {
	administrations,
	type adminStatusEnum,
	animals,
	inventoryItems,
	type NewAdministration,
	regimens,
} from "../../db/schema";
import { createAuditLog } from "../../db/schema/audit";
import { createTRPCRouter, householdProcedure } from "../trpc/init";

// Input validation schema for recording administration
const recordAdministrationSchema = z.object({
	householdId: z.string().uuid(),
	animalId: z.string().uuid(),
	regimenId: z.string().uuid(),
	administeredAt: z.string().datetime().optional(), // ISO datetime, defaults to now
	inventorySourceId: z.string().uuid().optional(),
	notes: z.string().optional(),
	site: z.string().optional(),
	conditionTags: z.array(z.string()).optional(),
	requiresCoSign: z.boolean().default(false),
	allowOverride: z.boolean().default(false),
	idempotencyKey: z.string(),
	// Optional fields for offline sync
	dose: z.string().optional(), // Actual dose given if different from regimen
	status: z.enum(["ON_TIME", "LATE", "VERY_LATE", "PRN"]).optional(),
});

// Helper function to calculate administration status
function calculateAdministrationStatus(
	adminMinutes: number,
	scheduledMinutes: number,
	cutoffMinutes: number,
): (typeof adminStatusEnum.enumValues)[number] {
	const diffMinutes = adminMinutes - scheduledMinutes;

	if (diffMinutes <= 60) {
		return "ON_TIME";
	}
	if (diffMinutes <= 180) {
		return "LATE";
	}
	if (diffMinutes <= cutoffMinutes) {
		return "VERY_LATE";
	}
	// Beyond cutoff - should have been auto-missed
	return "VERY_LATE";
}

// Helper function to find closest scheduled time
function findClosestScheduledTime(
	adminMinutes: number,
	timesLocal: string[],
): { time: string; minutes: number } | null {
	let closestTime: string | null = null;
	let minDiff = Number.POSITIVE_INFINITY;
	let closestMinutes = 0;

	for (const timeStr of timesLocal) {
		const [hours, minutes] = timeStr.split(":").map(Number);
		const scheduledMinutes = (hours ?? 0) * 60 + (minutes ?? 0);
		const diff = Math.abs(adminMinutes - scheduledMinutes);

		if (diff < minDiff) {
			minDiff = diff;
			closestTime = timeStr;
			closestMinutes = scheduledMinutes;
		}
	}

	return closestTime ? { time: closestTime, minutes: closestMinutes } : null;
}

// Helper function to calculate scheduled time and status
function calculateScheduledTimeAndStatus(
	regimen: {
		scheduleType: string;
		timesLocal: string[] | null;
		cutoffMinutes: number;
	},
	animal: {
		timezone: string;
	},
	administeredAt: Date,
	providedStatus?: string,
): {
	status: (typeof adminStatusEnum.enumValues)[number];
	scheduledFor: Date | null;
} {
	// Use provided status if given (for offline sync)
	if (providedStatus) {
		return {
			status: providedStatus as (typeof adminStatusEnum.enumValues)[number],
			scheduledFor: null,
		};
	}

	// PRN regimens
	if (regimen.scheduleType === "PRN") {
		return { status: "PRN", scheduledFor: null };
	}

	// Fixed schedule regimens
	if (regimen.scheduleType === "FIXED" && regimen.timesLocal) {
		const animalTimezone = animal.timezone;
		const adminTimeLocal = new Date(
			administeredAt.toLocaleString("en-US", { timeZone: animalTimezone }),
		);
		const adminMinutes =
			adminTimeLocal.getHours() * 60 + adminTimeLocal.getMinutes();

		const closest = findClosestScheduledTime(adminMinutes, regimen.timesLocal);

		if (!closest) {
			return { status: "ON_TIME", scheduledFor: null };
		}

		const [hours, minutes] = closest.time.split(":").map(Number);
		const scheduledFor = new Date(adminTimeLocal);
		scheduledFor.setHours(hours ?? 0, minutes ?? 0, 0, 0);

		const status = calculateAdministrationStatus(
			adminMinutes,
			closest.minutes,
			regimen.cutoffMinutes,
		);

		return { status, scheduledFor };
	}

	return { status: "ON_TIME", scheduledFor: null };
}

// Helper function to verify animal ownership
async function verifyAnimalOwnership(
	db: typeof import("../../db").db,
	animalId: string,
	householdId: string,
) {
	const result = await db
		.select()
		.from(animals)
		.where(and(eq(animals.id, animalId), eq(animals.householdId, householdId)))
		.limit(1)
		.execute();

	if (!result[0]) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Animal not found in this household",
		});
	}

	return result[0];
}

// Helper function to verify regimen
async function verifyActiveRegimen(
	db: typeof import("../../db").db,
	regimenId: string,
	animalId: string,
) {
	const result = await db
		.select()
		.from(regimens)
		.where(
			and(
				eq(regimens.id, regimenId),
				eq(regimens.animalId, animalId),
				eq(regimens.active, true),
			),
		)
		.limit(1)
		.execute();

	if (!result[0]) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Active regimen not found for this animal",
		});
	}

	return result[0];
}

// Helper function to verify inventory item
async function verifyInventoryItem(
	db: typeof import("../../db").db,
	inventorySourceId: string,
	householdId: string,
	allowOverride: boolean,
) {
	const result = await db
		.select()
		.from(inventoryItems)
		.where(
			and(
				eq(inventoryItems.id, inventorySourceId),
				eq(inventoryItems.householdId, householdId),
			),
		)
		.limit(1)
		.execute();

	if (!result[0]) {
		throw new TRPCError({
			code: "NOT_FOUND",
			message: "Inventory item not found",
		});
	}

	// Check if expired and override not allowed
	if (
		result[0].expiresOn &&
		new Date(result[0].expiresOn) < new Date() &&
		!allowOverride
	) {
		throw new TRPCError({
			code: "BAD_REQUEST",
			message: "Cannot use expired medication without override",
		});
	}

	return result[0];
}

// Helper function to check for duplicate
async function checkDuplicateAdministration(
	db: typeof import("../../db").db,
	idempotencyKey: string,
) {
	const result = await db
		.select()
		.from(administrations)
		.where(eq(administrations.idempotencyKey, idempotencyKey))
		.limit(1)
		.execute();

	return result[0] || null;
}

// Helper function to create administration record
async function createAdministrationRecord(
	db: typeof import("../../db").db,
	userId: string,
	input: z.infer<typeof recordAdministrationSchema>,
	animal: {
		timezone: string;
	},
	regimen: {
		dose: string | null;
		scheduleType: string;
		timesLocal: string[] | null;
		cutoffMinutes: number;
	},
) {
	const administeredAt = input.administeredAt
		? new Date(input.administeredAt)
		: new Date();

	const { status, scheduledFor } = calculateScheduledTimeAndStatus(
		{
			scheduleType: regimen.scheduleType,
			timesLocal: regimen.timesLocal,
			cutoffMinutes: regimen.cutoffMinutes,
		},
		animal,
		administeredAt,
		input.status,
	);

	const newAdmin: NewAdministration = {
		regimenId: input.regimenId,
		animalId: input.animalId,
		householdId: input.householdId,
		caregiverId: userId,
		scheduledFor: scheduledFor || null,
		recordedAt: administeredAt,
		status,
		sourceItemId: input.inventorySourceId || null,
		site: input.site || null,
		dose: input.dose || regimen.dose || null,
		notes: input.notes || null,
		adverseEvent: false,
		idempotencyKey: input.idempotencyKey,
	};

	const result = await db.insert(administrations).values(newAdmin).returning();

	if (!result[0]) {
		throw new TRPCError({
			code: "INTERNAL_SERVER_ERROR",
			message: "Failed to create administration record",
		});
	}

	return result[0];
}

export const adminRouter = createTRPCRouter({
	// Record a medication administration
	create: householdProcedure
		.input(recordAdministrationSchema)
		.mutation(async ({ ctx, input }) => {
			// Verify resources
			const animal = await verifyAnimalOwnership(
				ctx.db,
				input.animalId,
				input.householdId,
			);

			const regimen = await verifyActiveRegimen(
				ctx.db,
				input.regimenId,
				input.animalId,
			);

			if (input.inventorySourceId) {
				await verifyInventoryItem(
					ctx.db,
					input.inventorySourceId,
					input.householdId,
					input.allowOverride,
				);
			}

			// Check for duplicate
			const existing = await checkDuplicateAdministration(
				ctx.db,
				input.idempotencyKey,
			);

			if (existing) {
				return existing;
			}

			// Create the administration record
			const result = await createAdministrationRecord(
				ctx.db,
				ctx.user.id,
				input,
				animal,
				regimen,
			);

			// Create audit log
			await createAuditLog(ctx.db, {
				userId: ctx.user.id,
				householdId: input.householdId,
				action: "CREATE",
				tableName: "administrations",
				recordId: result.id,
				newValues: result,
			});

			// TODO: Handle inventory update and co-sign requirement

			return result;
		}),

	// List administrations for an animal or household
	list: householdProcedure
		.input(
			z.object({
				householdId: z.string().uuid(),
				animalId: z.string().uuid().optional(),
				startDate: z.string().datetime().optional(),
				endDate: z.string().datetime().optional(),
				limit: z.number().min(1).max(100).default(50),
			}),
		)
		.query(async ({ ctx, input }) => {
			const conditions = [eq(administrations.householdId, input.householdId)];

			if (input.animalId) {
				conditions.push(eq(administrations.animalId, input.animalId));
			}

			if (input.startDate) {
				conditions.push(
					gte(administrations.recordedAt, new Date(input.startDate)),
				);
			}

			if (input.endDate) {
				conditions.push(
					lte(administrations.recordedAt, new Date(input.endDate)),
				);
			}

			const result = await ctx.db
				.select()
				.from(administrations)
				.where(and(...conditions))
				.orderBy(administrations.recordedAt)
				.limit(input.limit)
				.execute();

			return result;
		}),
});
