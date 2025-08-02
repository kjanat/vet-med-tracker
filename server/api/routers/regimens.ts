import { TRPCError } from "@trpc/server";
import { and, eq, gte, isNull, lte, or } from "drizzle-orm";
import { z } from "zod";
import {
	administrations,
	animals,
	medicationCatalog,
	regimens,
} from "../../db/schema";
import {
	createTRPCRouter,
	householdProcedure,
	protectedProcedure,
} from "../trpc/clerk-init";

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
	targetTime?: Date;
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
		recordedAt: Date;
		status: string;
	} | null;
}

// Helper type for due status result
type DueStatusResult = {
	section: "due" | "later" | "prn";
	targetTime?: Date;
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
		targetTime,
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
		recordedAt: Date;
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
						gte(administrations.recordedAt, startOfDay),
						lte(administrations.recordedAt, endOfDay),
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
});
