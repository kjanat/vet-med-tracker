import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { timedOperations } from "@/db/drizzle";
import {
	administrations,
	animals,
	inventoryItems,
	medicationCatalog,
	regimens,
} from "@/db/schema";
import { createTRPCRouter, householdProcedure } from "../trpc/clerk-init";

// Types matching the existing mock data structure
export interface Suggestion {
	id: string;
	type:
		| "ADD_REMINDER"
		| "SHIFT_TIME"
		| "ENABLE_COSIGN"
		| "LOW_INVENTORY"
		| "REFILL_NEEDED";
	summary: string;
	rationale: string;
	action: {
		animalId?: string;
		regimenId?: string;
		dow?: number;
		time?: string;
		leadMinutes?: number;
		days?: string[];
		toTime?: string;
		highRisk?: boolean;
		inventoryItemId?: string;
		medicationId?: string;
	};
	priority: "high" | "medium" | "low";
	estimatedImpact: string;
}

export interface HeatmapBucket {
	dow: number; // 0-6 (Sunday-Saturday)
	hour: number; // 0-23
	count: number;
	latePct: number;
	missedPct: number;
}

const getSuggestionsSchema = z.object({
	householdId: z.string().uuid(),
	limit: z.number().min(1).max(20).default(10),
});

const getComplianceHeatmapSchema = z.object({
	householdId: z.string().uuid(),
	animalId: z.string().uuid().optional(),
	regimenId: z.string().uuid().optional(),
	range: z.object({
		from: z.string().datetime(),
		to: z.string().datetime(),
	}),
});

const dismissSuggestionSchema = z.object({
	householdId: z.string().uuid(),
	suggestionId: z.string(),
});

const snoozeReminderSchema = z.object({
	householdId: z.string().uuid(),
	suggestionId: z.string(),
	snoozeUntil: z.string().datetime(),
});

// Helper function to calculate compliance percentages for a time slot
function calculateComplianceStats(
	total: number,
	_onTime: number,
	late: number,
	veryLate: number,
	missed: number,
): { latePct: number; missedPct: number } {
	if (total === 0) return { latePct: 0, missedPct: 0 };

	const latePct = Math.round(((late + veryLate) / total) * 100);
	const missedPct = Math.round((missed / total) * 100);

	return { latePct, missedPct };
}

// Generate suggestions based on patterns in administration data
async function generateSuggestions(
	db: typeof import("@/db/drizzle").db,
	householdId: string,
	limit: number,
): Promise<Suggestion[]> {
	const suggestions: Suggestion[] = [];

	// Get patterns for missed/late doses by day of week and time
	const complianceQuery = sql`
		SELECT 
			r.id as regimen_id,
			a.id as animal_id,
			a.name as animal_name,
			mc.generic_name,
			EXTRACT(dow FROM a2.scheduled_for AT TIME ZONE a.timezone) as dow,
			EXTRACT(hour FROM a2.scheduled_for AT TIME ZONE a.timezone) as hour,
			COUNT(*) as total_doses,
			COUNT(CASE WHEN a2.status IN ('LATE', 'VERY_LATE') THEN 1 END) as late_doses,
			COUNT(CASE WHEN a2.status = 'MISSED' THEN 1 END) as missed_doses
		FROM ${regimens} r
		JOIN ${animals} a ON r.animal_id = a.id
		JOIN ${medicationCatalog} mc ON r.medication_id = mc.id
		JOIN ${administrations} a2 ON r.id = a2.regimen_id
		WHERE a.household_id = ${householdId}
			AND r.active = true
			AND a2.scheduled_for IS NOT NULL
			AND a2.recorded_at > NOW() - INTERVAL '30 days'
		GROUP BY r.id, a.id, a.name, mc.generic_name, dow, hour
		HAVING COUNT(*) >= 3
		ORDER BY (COUNT(CASE WHEN a2.status IN ('LATE', 'VERY_LATE', 'MISSED') THEN 1 END)::float / COUNT(*)) DESC
	`;

	const complianceResults = await timedOperations.analytics(
		() => db.execute(complianceQuery),
		"compliance-patterns-analysis",
	);

	// Generate reminder suggestions for problematic time slots
	for (const row of complianceResults.rows.slice(0, 3)) {
		const problemRate =
			((Number(row.late_doses) + Number(row.missed_doses)) /
				Number(row.total_doses)) *
			100;

		if (problemRate >= 25) {
			const dayNames = [
				"Sunday",
				"Monday",
				"Tuesday",
				"Wednesday",
				"Thursday",
				"Friday",
				"Saturday",
			];
			const dayName = dayNames[Number(row.dow)] || "Unknown";
			const hour = Number(row.hour);
			const timeStr =
				hour === 0
					? "12:00 AM"
					: hour < 12
						? `${hour}:00 AM`
						: hour === 12
							? "12:00 PM"
							: `${hour - 12}:00 PM`;

			suggestions.push({
				id: `add-reminder-${row.regimen_id}-${row.dow}-${row.hour}`,
				type: "ADD_REMINDER",
				summary: `Add reminder for ${row.animal_name}'s ${row.generic_name} on ${dayName}s`,
				rationale: `Late/missed ≥${Math.round(problemRate)}% on ${dayName} ${timeStr} in last 30 days (${Number(row.late_doses) + Number(row.missed_doses)} of ${row.total_doses} doses)`,
				action: {
					animalId: String(row.animal_id),
					regimenId: String(row.regimen_id),
					dow: Number(row.dow),
					time: `${hour.toString().padStart(2, "0")}:00`,
					leadMinutes: 15,
				},
				priority: problemRate >= 40 ? "high" : "medium",
				estimatedImpact: `Could improve ${dayName} compliance by 20-30%`,
			});
		}
	}

	// Check for low inventory items
	const lowInventoryQuery = db
		.select({
			id: inventoryItems.id,
			medicationId: inventoryItems.medicationId,
			assignedAnimalId: inventoryItems.assignedAnimalId,
			unitsRemaining: inventoryItems.unitsRemaining,
			quantityUnits: inventoryItems.quantityUnits,
			expiresOn: inventoryItems.expiresOn,
			genericName: medicationCatalog.genericName,
			animalName: animals.name,
		})
		.from(inventoryItems)
		.leftJoin(
			medicationCatalog,
			eq(inventoryItems.medicationId, medicationCatalog.id),
		)
		.leftJoin(animals, eq(inventoryItems.assignedAnimalId, animals.id))
		.where(
			and(
				eq(inventoryItems.householdId, householdId),
				eq(inventoryItems.inUse, true),
				sql`${inventoryItems.unitsRemaining} <= GREATEST(${inventoryItems.quantityUnits} * 0.2, 3)`,
			),
		)
		.orderBy(
			desc(
				sql`${inventoryItems.unitsRemaining}::float / NULLIF(${inventoryItems.quantityUnits}, 0)`,
			),
		)
		.limit(3);

	const lowInventoryResults = await timedOperations.analytics(
		() => lowInventoryQuery.execute(),
		"low-inventory-check",
	);

	for (const item of lowInventoryResults) {
		const remainingPct = item.quantityUnits
			? Math.round(((item.unitsRemaining || 0) / item.quantityUnits) * 100)
			: 0;

		suggestions.push({
			id: `low-inventory-${item.id}`,
			type: "LOW_INVENTORY",
			summary: `${item.genericName} running low${item.animalName ? ` for ${item.animalName}` : ""}`,
			rationale: `Only ${item.unitsRemaining || 0} units remaining (${remainingPct}% of original quantity)`,
			action: {
				inventoryItemId: item.id,
				medicationId: item.medicationId,
				animalId: item.assignedAnimalId || undefined,
			},
			priority: remainingPct <= 10 ? "high" : "medium",
			estimatedImpact: `Prevent medication stockout with ${Math.ceil((item.unitsRemaining || 0) / 2)} days estimated remaining`,
		});
	}

	// Check for regimens requiring co-sign due to overlapping administrations
	const overlapQuery = sql`
		SELECT 
			r.id as regimen_id,
			a.name as animal_name,
			mc.generic_name,
			COUNT(*) as overlap_count
		FROM ${administrations} a1
		JOIN ${administrations} a2 ON a1.regimen_id = a2.regimen_id 
			AND a1.id != a2.id
			AND ABS(EXTRACT(EPOCH FROM (a1.recorded_at - a2.recorded_at))) < 3600
		JOIN ${regimens} r ON a1.regimen_id = r.id
		JOIN ${animals} a ON r.animal_id = a.id
		JOIN ${medicationCatalog} mc ON r.medication_id = mc.id
		WHERE a.household_id = ${householdId}
			AND r.requires_co_sign = false
			AND r.active = true
			AND a1.recorded_at > NOW() - INTERVAL '14 days'
		GROUP BY r.id, a.name, mc.generic_name
		HAVING COUNT(*) >= 2
		ORDER BY COUNT(*) DESC
	`;

	const overlapResults = await timedOperations.analytics(
		() => db.execute(overlapQuery),
		"overlap-detection",
	);

	for (const row of overlapResults.rows.slice(0, 2)) {
		suggestions.push({
			id: `enable-cosign-${row.regimen_id}`,
			type: "ENABLE_COSIGN",
			summary: `Enable co-sign for ${row.animal_name}'s ${row.generic_name}`,
			rationale: `${row.overlap_count} overlapping administrations detected in last 14 days (risk of double-dosing)`,
			action: {
				regimenId: String(row.regimen_id),
				highRisk: true,
			},
			priority: "high",
			estimatedImpact: "Prevents accidental double-dosing of medication",
		});
	}

	// Return only the requested number of suggestions, prioritized by severity
	return suggestions
		.sort((a, b) => {
			const priorityOrder = { high: 3, medium: 2, low: 1 };
			return priorityOrder[b.priority] - priorityOrder[a.priority];
		})
		.slice(0, limit);
}

// Generate compliance heatmap data
async function generateComplianceHeatmap(
	db: typeof import("@/db/drizzle").db,
	householdId: string,
	animalId?: string,
	regimenId?: string,
	range?: { from: string; to: string },
): Promise<{ buckets: HeatmapBucket[] }> {
	const conditions = [eq(administrations.householdId, householdId)];

	if (animalId) {
		conditions.push(eq(administrations.animalId, animalId));
	}

	if (regimenId) {
		conditions.push(eq(administrations.regimenId, regimenId));
	}

	if (range) {
		conditions.push(
			gte(administrations.recordedAt, range.from),
			lte(administrations.recordedAt, range.to),
		);
	}

	// Query to get compliance data grouped by day of week and hour
	const heatmapQuery = sql`
		SELECT 
			EXTRACT(dow FROM a.scheduled_for AT TIME ZONE an.timezone) as dow,
			EXTRACT(hour FROM a.scheduled_for AT TIME ZONE an.timezone) as hour,
			COUNT(*) as total_count,
			COUNT(CASE WHEN a.status = 'ON_TIME' THEN 1 END) as on_time_count,
			COUNT(CASE WHEN a.status = 'LATE' THEN 1 END) as late_count,
			COUNT(CASE WHEN a.status = 'VERY_LATE' THEN 1 END) as very_late_count,
			COUNT(CASE WHEN a.status = 'MISSED' THEN 1 END) as missed_count
		FROM ${administrations} a
		JOIN ${animals} an ON a.animal_id = an.id
		WHERE ${and(...conditions)}
			AND a.scheduled_for IS NOT NULL
		GROUP BY dow, hour
		ORDER BY dow, hour
	`;

	const results = await timedOperations.analytics(
		() => db.execute(heatmapQuery),
		"heatmap-compliance-data",
	);

	const buckets: HeatmapBucket[] = [];

	for (const row of results.rows) {
		const total = Number(row.total_count);
		const late = Number(row.late_count);
		const veryLate = Number(row.very_late_count);
		const missed = Number(row.missed_count);

		const { latePct, missedPct } = calculateComplianceStats(
			total,
			Number(row.on_time_count),
			late,
			veryLate,
			missed,
		);

		buckets.push({
			dow: Number(row.dow),
			hour: Number(row.hour),
			count: total,
			latePct,
			missedPct,
		});
	}

	return { buckets };
}

export const insightsRouter = createTRPCRouter({
	// Get actionable suggestions for a household
	getSuggestions: householdProcedure
		.input(getSuggestionsSchema)
		.query(async ({ ctx, input }) => {
			return timedOperations.analytics(
				() => generateSuggestions(ctx.db, input.householdId, input.limit),
				"insights-suggestions-generation",
			);
		}),

	// Get compliance heatmap data
	getComplianceHeatmap: householdProcedure
		.input(getComplianceHeatmapSchema)
		.query(async ({ ctx, input }) => {
			return timedOperations.analytics(
				() =>
					generateComplianceHeatmap(
						ctx.db,
						input.householdId,
						input.animalId,
						input.regimenId,
						input.range,
					),
				"insights-heatmap-generation",
			);
		}),

	// Dismiss a suggestion (placeholder - could store in a dismissals table)
	dismissSuggestion: householdProcedure
		.input(dismissSuggestionSchema)
		.mutation(async ({ ctx: _ctx, input: _input }) => {
			// For now, just return success
			// In a real implementation, you'd store the dismissal in a table
			// with userId, suggestionId, and dismissedAt timestamp

			// TODO: Store dismissal in database table
			// await ctx.db.insert(suggestionDismissals).values({
			//   id: generateId(),
			//   userId: ctx.dbUser.id,
			//   householdId: input.householdId,
			//   suggestionId: input.suggestionId,
			//   dismissedAt: new Date().toISOString(),
			// });

			return { success: true, dismissedAt: new Date().toISOString() };
		}),

	// Snooze a reminder suggestion (placeholder)
	snoozeReminder: householdProcedure
		.input(snoozeReminderSchema)
		.mutation(async ({ ctx: _ctx, input }) => {
			// For now, just return success
			// In a real implementation, you'd store the snooze in a table
			// or update the notification queue

			// TODO: Update notification queue with snooze time
			// await ctx.db.update(notificationQueue)
			//   .set({ snoozedUntil: input.snoozeUntil })
			//   .where(and(
			//     eq(notificationQueue.data->>'suggestionId', input.suggestionId),
			//     eq(notificationQueue.householdId, input.householdId)
			//   ));

			return {
				success: true,
				snoozedUntil: input.snoozeUntil,
			};
		}),
});
