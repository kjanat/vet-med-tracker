import { TRPCError } from "@trpc/server";
import { and, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { z } from "zod";
import {
	vetmedAdministrations as administrations,
	vetmedAnimals as animals,
	vetmedMedicationCatalog as medicationCatalog,
	type NewRegimen,
	vetmedRegimens as regimens,
	scheduleTypeEnum,
} from "@/db/schema";
import {
	createTRPCRouter,
	householdProcedure,
	protectedProcedure,
} from "@/server/api/trpc";
import { createAuditLog } from "@/server/utils/audit-log";

// Types for regimen processing
interface ProcessedRegimen {
	id: string;
	animalId: string;
	animalName: string;
	animalSpecies: string;
	animalPhotoUrl: string | null;
	medicationName: string;
	brandName: string | null;
	route: string;
	form: string;
	strength: string;
	dose: string;
	targetTime?: string;
	isPRN: boolean;
	isHighRisk: boolean;
	requiresCoSign: boolean;
	compliance: number;
	section: "due" | "later" | "prn";
	isOverdue: boolean;
	minutesUntilDue: number;
	instructions: string | null;
	prnReason: string | null;
	lastAdministration: {
		id: string;
		recordedAt: string;
		status: string;
	} | null;
}

// Helper type for due status result
type DueStatusResult = {
	section: "due" | "later" | "prn";
	targetTime?: string;
	isOverdue: boolean;
	minutesUntilDue: number;
};

// Helper to create a PRN result
function createPRNResult(): DueStatusResult {
	return {
		section: "prn",
		isOverdue: false,
		minutesUntilDue: 0,
	};
}

// Helper to determine section based on minutes until due
function determineSection(
	minutesUntilDue: number,
	includeUpcoming: boolean,
): "due" | "later" | "prn" {
	if (minutesUntilDue < 60 && minutesUntilDue > -180) {
		return "due";
	}
	if (minutesUntilDue >= 60 && includeUpcoming) {
		return "later";
	}
	return "prn";
}

// Helper to parse time string and convert to minutes
function parseTimeToMinutes(timeStr: string): number {
	const [hours, minutes] = timeStr.split(":").map(Number);
	return (hours ?? 0) * 60 + (minutes ?? 0);
}

// Helper to calculate result for a scheduled time
function calculateScheduledResult(
	scheduledMinutes: number,
	currentTimeMinutes: number,
	nowLocal: Date,
	timeStr: string,
	includeUpcoming: boolean,
): DueStatusResult | null {
	if (scheduledMinutes < currentTimeMinutes - 60) {
		return null; // More than 1 hour past
	}

	const [hours, minutes] = timeStr.split(":").map(Number);
	const targetTime = new Date(nowLocal);
	targetTime.setHours(hours ?? 0, minutes ?? 0, 0, 0);

	const minutesUntilDue = scheduledMinutes - currentTimeMinutes;
	const isOverdue = minutesUntilDue < 0;
	const section = determineSection(minutesUntilDue, includeUpcoming);

	return {
		section,
		targetTime: targetTime.toISOString(),
		isOverdue,
		minutesUntilDue,
	};
}

// Helper function to calculate next due time and section
function calculateDueStatus(
	regimen: {
		scheduleType: string;
		timesLocal: string[] | null;
	},
	animal: {
		timezone: string;
	},
	now: Date,
	includeUpcoming: boolean,
): DueStatusResult {
	if (
		regimen.scheduleType === "PRN" ||
		regimen.scheduleType !== "FIXED" ||
		!regimen.timesLocal
	) {
		return createPRNResult();
	}

	// Calculate next due time based on schedule
	const nowLocal = new Date(
		now.toLocaleString("en-US", { timeZone: animal.timezone }),
	);
	const currentTimeMinutes = nowLocal.getHours() * 60 + nowLocal.getMinutes();

	// Find next scheduled time
	for (const timeStr of regimen.timesLocal) {
		const scheduledMinutes = parseTimeToMinutes(timeStr);
		const result = calculateScheduledResult(
			scheduledMinutes,
			currentTimeMinutes,
			nowLocal,
			timeStr,
			includeUpcoming,
		);

		if (result) {
			return result;
		}
	}

	return createPRNResult();
}

// Type for database row
interface RegimenRow {
	regimen: {
		id: string;
		scheduleType: string;
		timesLocal: string[] | null;
		route: string | null;
		dose: string | null;
		highRisk: boolean;
		requiresCoSign: boolean;
		instructions: string | null;
		prnReason: string | null;
	};
	animal: {
		id: string;
		name: string;
		species: string;
		photoUrl: string | null;
		timezone: string;
	};
	medication: {
		genericName: string | null;
		brandName: string | null;
		route: string;
		form: string;
		strength: string | null;
	};
	lastAdmin: {
		id: string;
		recordedAt: string;
		status: string;
	} | null;
}

// Helper function to process regimen row
function processRegimenRow(
	row: RegimenRow,
	now: Date,
	includeUpcoming: boolean,
): ProcessedRegimen {
	const { regimen, animal, medication, lastAdmin } = row;

	const dueStatus = calculateDueStatus(regimen, animal, now, includeUpcoming);

	// Calculate compliance (mock for now)
	const compliance = 85 + Math.floor(Math.random() * 15);

	return {
		id: regimen.id,
		animalId: animal.id,
		animalName: animal.name,
		animalSpecies: animal.species,
		animalPhotoUrl: animal.photoUrl,
		medicationName: medication.genericName || medication.brandName || "Unknown",
		brandName: medication.brandName,
		route: regimen.route || medication.route,
		form: medication.form,
		strength: medication.strength || "",
		dose: regimen.dose || "",
		targetTime: dueStatus.targetTime,
		isPRN: regimen.scheduleType === "PRN",
		isHighRisk: regimen.highRisk,
		requiresCoSign: regimen.requiresCoSign,
		compliance,
		section: dueStatus.section,
		isOverdue: dueStatus.isOverdue,
		minutesUntilDue: dueStatus.minutesUntilDue,
		instructions: regimen.instructions,
		prnReason: regimen.prnReason,
		lastAdministration: lastAdmin,
	};
}

// Helper function to sort regimens by urgency
function sortByUrgency(a: ProcessedRegimen, b: ProcessedRegimen): number {
	// PRN always last
	if (a.section === "prn" && b.section !== "prn") return 1;
	if (b.section === "prn" && a.section !== "prn") return -1;

	// Due before later
	if (a.section === "due" && b.section === "later") return -1;
	if (b.section === "due" && a.section === "later") return 1;

	// Within same section, sort by time
	if (a.section === b.section) {
		return a.minutesUntilDue - b.minutesUntilDue;
	}

	return 0;
}

export const regimenRouter = createTRPCRouter({
	// List all regimens for a household
	list: householdProcedure
		.input(
			z.object({
				householdId: z.string().uuid(),
				animalId: z.string().uuid().optional(),
				activeOnly: z.boolean().default(true),
			}),
		)
		.query(async ({ ctx, input }) => {
			const conditions = [
				eq(animals.householdId, input.householdId),
				isNull(regimens.deletedAt),
			];

			if (input.animalId) {
				conditions.push(eq(regimens.animalId, input.animalId));
			}

			if (input.activeOnly) {
				conditions.push(eq(regimens.active, true));
			}

			const result = await ctx.db
				.select({
					regimen: regimens,
					animal: animals,
					medication: medicationCatalog,
				})
				.from(regimens)
				.innerJoin(animals, eq(regimens.animalId, animals.id))
				.innerJoin(
					medicationCatalog,
					eq(regimens.medicationId, medicationCatalog.id),
				)
				.where(and(...conditions))
				.orderBy(animals.name, regimens.startDate);

			return result;
		}),

	// List due medications for recording
	listDue: protectedProcedure
		.input(
			z.object({
				householdId: z.string().uuid().optional(),
				animalId: z.string().uuid().optional(),
				includeUpcoming: z.boolean().default(true), // Include "later today"
			}),
		)
		.query(async ({ ctx, input }) => {
			// Use household from context or input
			const householdId = input.householdId || ctx.currentHouseholdId;
			if (!householdId) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "householdId is required",
				});
			}

			const now = new Date();
			const startOfDay = new Date(now);
			startOfDay.setHours(0, 0, 0, 0);
			const endOfDay = new Date(now);
			endOfDay.setHours(23, 59, 59, 999);

			// Base conditions for active regimens in the household
			const baseConditions = [
				eq(animals.householdId, householdId),
				eq(regimens.active, true),
				isNull(regimens.deletedAt),
				isNull(animals.deletedAt),
				lte(regimens.startDate, now.toISOString().split("T")[0] ?? ""),
				or(
					isNull(regimens.endDate),
					gte(regimens.endDate, now.toISOString().split("T")[0] ?? ""),
				),
			];

			if (input.animalId) {
				baseConditions.push(eq(regimens.animalId, input.animalId));
			}

			// Get active regimens with their animals and medications
			const activeRegimens = await ctx.db
				.select({
					regimen: regimens,
					animal: animals,
					medication: medicationCatalog,
					// Get the latest administration for each regimen
					lastAdmin: {
						id: administrations.id,
						recordedAt: administrations.recordedAt,
						status: administrations.status,
					},
				})
				.from(regimens)
				.innerJoin(animals, eq(regimens.animalId, animals.id))
				.innerJoin(
					medicationCatalog,
					eq(regimens.medicationId, medicationCatalog.id),
				)
				.leftJoin(
					administrations,
					and(
						eq(administrations.regimenId, regimens.id),
						gte(administrations.recordedAt, startOfDay.toISOString()),
						lte(administrations.recordedAt, endOfDay.toISOString()),
					),
				)
				.where(and(...baseConditions))
				.orderBy(animals.name);

			// Process regimens to determine due status
			const dueRegimens = activeRegimens.map((row) =>
				processRegimenRow(row, now, input.includeUpcoming),
			);

			// Sort by urgency
			dueRegimens.sort(sortByUrgency);

			return dueRegimens;
		}),

	// Get a single regimen by ID
	getById: householdProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				householdId: z.string().uuid(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const result = await ctx.db
				.select({
					regimen: regimens,
					animal: animals,
					medication: medicationCatalog,
				})
				.from(regimens)
				.innerJoin(animals, eq(regimens.animalId, animals.id))
				.innerJoin(
					medicationCatalog,
					eq(regimens.medicationId, medicationCatalog.id),
				)
				.where(
					and(
						eq(regimens.id, input.id),
						eq(animals.householdId, input.householdId),
						isNull(regimens.deletedAt),
					),
				)
				.limit(1);

			if (!result[0]) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Regimen not found",
				});
			}

			return result[0];
		}),

	// Create a new regimen
	create: householdProcedure
		.input(
			z.object({
				householdId: z.string().uuid(),
				animalId: z.string().uuid(),
				medicationId: z.string().uuid(),
				name: z.string().optional(),
				instructions: z.string().optional(),
				scheduleType: z.enum(scheduleTypeEnum.enumValues),
				timesLocal: z.array(z.string().regex(/^\d{2}:\d{2}$/)).optional(),
				intervalHours: z.number().int().positive().optional(),
				startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
				endDate: z
					.string()
					.regex(/^\d{4}-\d{2}-\d{2}$/)
					.optional(),
				prnReason: z.string().optional(),
				maxDailyDoses: z.number().int().positive().optional(),
				cutoffMinutes: z.number().int().positive().default(240),
				highRisk: z.boolean().default(false),
				requiresCoSign: z.boolean().default(false),
				dose: z.string().optional(),
				route: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify animal belongs to household
			const animal = await ctx.db
				.select({ id: animals.id })
				.from(animals)
				.where(
					and(
						eq(animals.id, input.animalId),
						eq(animals.householdId, input.householdId),
						isNull(animals.deletedAt),
					),
				)
				.limit(1);

			if (!animal[0]) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Animal not found in this household",
				});
			}

			// Verify medication exists
			const medication = await ctx.db
				.select({ id: medicationCatalog.id })
				.from(medicationCatalog)
				.where(eq(medicationCatalog.id, input.medicationId))
				.limit(1);

			if (!medication[0]) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Medication not found",
				});
			}

			// Validate schedule type constraints
			if (
				input.scheduleType === "FIXED" &&
				(!input.timesLocal || input.timesLocal.length === 0)
			) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "FIXED schedule requires at least one time",
				});
			}

			if (input.scheduleType === "INTERVAL" && !input.intervalHours) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "INTERVAL schedule requires intervalHours",
				});
			}

			if (input.scheduleType === "PRN" && !input.prnReason) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "PRN schedule requires prnReason",
				});
			}

			const newRegimen: NewRegimen = {
				animalId: input.animalId,
				medicationId: input.medicationId,
				name: input.name,
				instructions: input.instructions,
				scheduleType: input.scheduleType,
				timesLocal: input.timesLocal,
				intervalHours: input.intervalHours,
				startDate: input.startDate,
				endDate: input.endDate,
				prnReason: input.prnReason,
				maxDailyDoses: input.maxDailyDoses,
				cutoffMinutes: input.cutoffMinutes,
				highRisk: input.highRisk,
				requiresCoSign: input.requiresCoSign,
				dose: input.dose,
				route: input.route,
				active: true,
			};

			const result = await ctx.db
				.insert(regimens)
				.values(newRegimen)
				.returning();

			// Create audit log entry
			await createAuditLog(ctx.db, {
				userId: ctx.dbUser.id,
				householdId: input.householdId,
				action: "CREATE",
				resourceType: "regimen",
				resourceId: result[0]?.id,
				newValues: newRegimen,
			});

			// Get the complete regimen with medication details
			const completeRegimen = await ctx.db
				.select({
					regimen: regimens,
					animal: animals,
					medication: medicationCatalog,
				})
				.from(regimens)
				.innerJoin(animals, eq(regimens.animalId, animals.id))
				.innerJoin(
					medicationCatalog,
					eq(regimens.medicationId, medicationCatalog.id),
				)
				.where(eq(regimens.id, result[0]?.id ?? ""))
				.limit(1);

			return completeRegimen[0];
		}),

	// Update an existing regimen
	update: householdProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				householdId: z.string().uuid(),
				name: z.string().optional(),
				instructions: z.string().optional(),
				scheduleType: z.enum(scheduleTypeEnum.enumValues).optional(),
				timesLocal: z.array(z.string().regex(/^\d{2}:\d{2}$/)).optional(),
				intervalHours: z.number().int().positive().optional(),
				startDate: z
					.string()
					.regex(/^\d{4}-\d{2}-\d{2}$/)
					.optional(),
				endDate: z
					.string()
					.regex(/^\d{4}-\d{2}-\d{2}$/)
					.optional(),
				prnReason: z.string().optional(),
				maxDailyDoses: z.number().int().positive().optional(),
				cutoffMinutes: z.number().int().positive().optional(),
				highRisk: z.boolean().optional(),
				requiresCoSign: z.boolean().optional(),
				dose: z.string().optional(),
				route: z.string().optional(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			const { id, householdId, ...updateData } = input;

			// Verify regimen exists and belongs to household
			const existing = await ctx.db
				.select({ regimen: regimens, animal: animals })
				.from(regimens)
				.innerJoin(animals, eq(regimens.animalId, animals.id))
				.where(
					and(
						eq(regimens.id, id),
						eq(animals.householdId, householdId),
						isNull(regimens.deletedAt),
					),
				)
				.limit(1);

			if (!existing[0]) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Regimen not found",
				});
			}

			// Validate schedule type constraints if schedule type is being updated
			if (updateData.scheduleType) {
				if (
					updateData.scheduleType === "FIXED" &&
					(!updateData.timesLocal || updateData.timesLocal.length === 0)
				) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "FIXED schedule requires at least one time",
					});
				}

				if (
					updateData.scheduleType === "INTERVAL" &&
					!updateData.intervalHours
				) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "INTERVAL schedule requires intervalHours",
					});
				}

				if (updateData.scheduleType === "PRN" && !updateData.prnReason) {
					throw new TRPCError({
						code: "BAD_REQUEST",
						message: "PRN schedule requires prnReason",
					});
				}
			}

			await ctx.db
				.update(regimens)
				.set({
					...updateData,
					updatedAt: new Date().toISOString(),
				})
				.where(eq(regimens.id, id))
				.returning();

			// Create audit log entry
			await createAuditLog(ctx.db, {
				userId: ctx.dbUser.id,
				householdId: householdId,
				action: "UPDATE",
				resourceType: "regimen",
				resourceId: id,
				oldValues: existing[0]?.regimen,
				newValues: updateData,
			});

			// Get the complete updated regimen with medication details
			const completeRegimen = await ctx.db
				.select({
					regimen: regimens,
					animal: animals,
					medication: medicationCatalog,
				})
				.from(regimens)
				.innerJoin(animals, eq(regimens.animalId, animals.id))
				.innerJoin(
					medicationCatalog,
					eq(regimens.medicationId, medicationCatalog.id),
				)
				.where(eq(regimens.id, id))
				.limit(1);

			return completeRegimen[0];
		}),

	// Soft delete a regimen
	delete: householdProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				householdId: z.string().uuid(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify regimen exists and belongs to household
			const existing = await ctx.db
				.select({ regimen: regimens, animal: animals })
				.from(regimens)
				.innerJoin(animals, eq(regimens.animalId, animals.id))
				.where(
					and(
						eq(regimens.id, input.id),
						eq(animals.householdId, input.householdId),
						isNull(regimens.deletedAt),
					),
				)
				.limit(1);

			if (!existing[0]) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Regimen not found",
				});
			}

			const result = await ctx.db
				.update(regimens)
				.set({
					deletedAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
				})
				.where(eq(regimens.id, input.id))
				.returning();

			// Create audit log entry
			await createAuditLog(ctx.db, {
				userId: ctx.dbUser.id,
				householdId: input.householdId,
				action: "DELETE",
				resourceType: "regimen",
				resourceId: input.id,
				oldValues: existing[0]?.regimen,
			});

			return { success: true, regimen: result[0] };
		}),

	// Pause a regimen
	pause: householdProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				householdId: z.string().uuid(),
				reason: z.string().min(1).max(500),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify regimen exists and belongs to household
			const existing = await ctx.db
				.select({ regimen: regimens, animal: animals })
				.from(regimens)
				.innerJoin(animals, eq(regimens.animalId, animals.id))
				.where(
					and(
						eq(regimens.id, input.id),
						eq(animals.householdId, input.householdId),
						isNull(regimens.deletedAt),
						eq(regimens.active, true),
					),
				)
				.limit(1);

			if (!existing[0]) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Active regimen not found",
				});
			}

			// Check if already paused
			if (existing[0].regimen.pausedAt) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Regimen is already paused",
				});
			}

			const result = await ctx.db
				.update(regimens)
				.set({
					pausedAt: new Date().toISOString(),
					pauseReason: input.reason,
					updatedAt: new Date().toISOString(),
				})
				.where(eq(regimens.id, input.id))
				.returning();

			// Create audit log entry
			await createAuditLog(ctx.db, {
				userId: ctx.dbUser.id,
				householdId: input.householdId,
				action: "PAUSE",
				resourceType: "regimen",
				resourceId: input.id,
				details: { reason: input.reason },
				oldValues: { pausedAt: existing[0].regimen.pausedAt },
				newValues: { pausedAt: result[0]?.pausedAt, pauseReason: input.reason },
			});

			return { success: true, regimen: result[0] };
		}),

	// Resume a paused regimen
	resume: householdProcedure
		.input(
			z.object({
				id: z.string().uuid(),
				householdId: z.string().uuid(),
			}),
		)
		.mutation(async ({ ctx, input }) => {
			// Verify regimen exists and belongs to household
			const existing = await ctx.db
				.select({ regimen: regimens, animal: animals })
				.from(regimens)
				.innerJoin(animals, eq(regimens.animalId, animals.id))
				.where(
					and(
						eq(regimens.id, input.id),
						eq(animals.householdId, input.householdId),
						isNull(regimens.deletedAt),
						eq(regimens.active, true),
					),
				)
				.limit(1);

			if (!existing[0]) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "Active regimen not found",
				});
			}

			// Check if already resumed (not paused)
			if (!existing[0].regimen.pausedAt) {
				throw new TRPCError({
					code: "BAD_REQUEST",
					message: "Regimen is not paused",
				});
			}

			const result = await ctx.db
				.update(regimens)
				.set({
					pausedAt: null,
					pauseReason: null,
					updatedAt: new Date().toISOString(),
				})
				.where(eq(regimens.id, input.id))
				.returning();

			// Create audit log entry
			await createAuditLog(ctx.db, {
				userId: ctx.dbUser.id,
				householdId: input.householdId,
				action: "RESUME",
				resourceType: "regimen",
				resourceId: input.id,
				oldValues: {
					pausedAt: existing[0].regimen.pausedAt,
					pauseReason: existing[0].regimen.pauseReason,
				},
				newValues: { pausedAt: null, pauseReason: null },
			});

			return { success: true, regimen: result[0] };
		}),

	// Get regimens for multiple animals (for bulk operations)
	listByAnimals: householdProcedure
		.input(
			z.object({
				householdId: z.string().uuid(),
				animalIds: z.array(z.string().uuid()).min(1),
			}),
		)
		.query(async ({ ctx, input }) => {
			const results = await ctx.db
				.select({
					// Animal info
					animalId: animals.id,
					animalName: animals.name,
					// Regimen info
					regimenId: regimens.id,
					medicationId: regimens.medicationId,
					dose: regimens.dose,
					route: regimens.route,
					scheduleType: regimens.scheduleType,
					timesLocal: regimens.timesLocal,
					// Medication info
					genericName: medicationCatalog.genericName,
					brandName: medicationCatalog.brandName,
					strength: medicationCatalog.strength,
				})
				.from(regimens)
				.innerJoin(animals, eq(regimens.animalId, animals.id))
				.innerJoin(
					medicationCatalog,
					eq(regimens.medicationId, medicationCatalog.id),
				)
				.where(
					and(
						eq(animals.householdId, input.householdId),
						inArray(animals.id, input.animalIds),
						eq(regimens.active, true),
						isNull(regimens.deletedAt),
					),
				)
				.orderBy(animals.name, medicationCatalog.genericName);

			// Group regimens by animal
			const animalRegimens = new Map<string, typeof results>();

			for (const row of results) {
				if (!animalRegimens.has(row.animalId)) {
					animalRegimens.set(row.animalId, []);
				}
				animalRegimens.get(row.animalId)?.push(row);
			}

			// Convert to the expected format
			return input.animalIds.map((animalId) => {
				const animalData = results.find((r) => r.animalId === animalId);
				const animalRegimensData = animalRegimens.get(animalId) || [];

				return {
					animalId,
					animalName: animalData?.animalName || "Unknown Animal",
					regimens: animalRegimensData.map((regimen) => ({
						id: regimen.regimenId,
						animalId: regimen.animalId,
						animalName: regimen.animalName,
						medicationName: regimen.brandName || regimen.genericName,
						dose: regimen.dose || "",
						route: regimen.route,
						scheduleType: regimen.scheduleType,
					})),
				};
			});
		}),
});
