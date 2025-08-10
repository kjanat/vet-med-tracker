import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { timedOperations } from "@/db/drizzle";
import {
	administrations,
	animals,
	inventoryItems,
	medicationCatalog,
	regimens,
	suggestions,
} from "@/db/schema";
import { createTRPCRouter, householdProcedure } from "@/server/api/trpc";

// Types matching the existing interface
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

// OPTIMIZED: Generate reminder suggestions using materialized views
async function generateReminderSuggestions(
	db: typeof import("@/db/drizzle").db,
	householdId: string,
): Promise<Suggestion[]> {
	const suggestions: Suggestion[] = [];

	// Use materialized view for much faster compliance analysis
	const complianceQuery = sql`
		SELECT 
			cs.regimen_id,
			cs.animal_id,
			a.name as animal_name,
			mc.generic_name,
			cs.day_of_week as dow,
			cs.hour_of_day as hour,
			SUM(cs.total_doses) as total_doses,
			SUM(cs.late_count + cs.very_late_count) as late_doses,
			SUM(cs.missed_count) as missed_doses,
			AVG(cs.compliance_rate) as avg_compliance_rate
		FROM mv_compliance_stats cs
		JOIN ${animals} a ON cs.animal_id = a.id
		JOIN ${regimens} r ON cs.regimen_id = r.id
		JOIN ${medicationCatalog} mc ON r.medication_id = mc.id
		WHERE cs.household_id = ${householdId}
			AND cs.day >= CURRENT_DATE - INTERVAL '30 days'
			AND cs.compliance_rate < 75  -- Focus on problematic time slots
		GROUP BY cs.regimen_id, cs.animal_id, a.name, mc.generic_name, cs.day_of_week, cs.hour_of_day
		HAVING SUM(cs.total_doses) >= 3
		ORDER BY AVG(cs.compliance_rate) ASC, SUM(cs.total_doses) DESC
		LIMIT 5
	`;

	const complianceResults = await timedOperations.analytics(
		() => db.execute(complianceQuery),
		"compliance-patterns-analysis-optimized",
	);

	for (const row of complianceResults.rows) {
		const problemRate = 100 - Number(row.avg_compliance_rate);

		if (problemRate >= 25) {
			const dayName = getDayName(Number(row.dow));
			const hour = Number(row.hour);
			const timeStr = formatHourAs12Hour(hour);

			suggestions.push({
				id: `add-reminder-${row.regimen_id}-${row.dow}-${row.hour}`,
				type: "ADD_REMINDER",
				summary: `Add reminder for ${row.animal_name}'s ${row.generic_name} on ${dayName}s`,
				rationale: `Poor compliance ${Math.round(problemRate)}% on ${dayName} ${timeStr} in last 30 days (${Number(row.late_doses) + Number(row.missed_doses)} of ${row.total_doses} doses)`,
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

	return suggestions;
}

// OPTIMIZED: Generate low inventory suggestions using materialized views
async function generateLowInventorySuggestions(
	db: typeof import("@/db/drizzle").db,
	householdId: string,
): Promise<Suggestion[]> {
	const suggestions: Suggestion[] = [];

	// Use materialized view for inventory consumption analysis
	const lowInventoryQuery = sql`
		SELECT DISTINCT
			ii.id,
			ii.medication_id,
			ii.assigned_animal_id,
			ii.units_remaining,
			ii.quantity_units,
			ii.expires_on,
			mc.generic_name,
			a.name as animal_name,
			ic.min_days_supply,
			ic.avg_daily_consumption_rate,
			ic.critical_stock_items + ic.low_stock_items as risk_score
		FROM ${inventoryItems} ii
		LEFT JOIN ${medicationCatalog} mc ON ii.medication_id = mc.id
		LEFT JOIN ${animals} a ON ii.assigned_animal_id = a.id
		LEFT JOIN mv_inventory_consumption ic ON (
			ic.household_id = ii.household_id 
			AND ic.medication_id = ii.medication_id
			AND (ic.assigned_animal_id = ii.assigned_animal_id OR ic.assigned_animal_id IS NULL)
			AND ic.month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '3 months')
		)
		WHERE ii.household_id = ${householdId}
			AND ii.in_use = true
			AND ii.deleted_at IS NULL
			AND (
				ii.units_remaining <= GREATEST(ii.quantity_units * 0.2, 3)
				OR ic.min_days_supply <= 7
				OR ic.critical_stock_items > 0
			)
		ORDER BY 
			COALESCE(ic.min_days_supply, 999) ASC,
			ii.units_remaining::float / NULLIF(ii.quantity_units, 1) ASC
		LIMIT 5
	`;

	const lowInventoryResults = await timedOperations.analytics(
		() => db.execute(lowInventoryQuery),
		"low-inventory-check-optimized",
	);

	for (const item of lowInventoryResults.rows) {
		const remainingPct = item.quantity_units
			? Math.round(
					((Number(item.units_remaining) || 0) / Number(item.quantity_units)) *
						100,
				)
			: 0;

		const daysSupply = Number(item.min_days_supply) || 0;
		const criticalityScore = Number(item.risk_score) || 0;

		suggestions.push({
			id: `low-inventory-${item.id}`,
			type: "LOW_INVENTORY",
			summary: `${item.generic_name} running low${item.animal_name ? ` for ${item.animal_name}` : ""}`,
			rationale: `Only ${item.units_remaining || 0} units remaining (${remainingPct}% of original)${daysSupply > 0 ? `, ~${daysSupply} days supply` : ""}`,
			action: {
				inventoryItemId: String(item.id),
				medicationId: String(item.medication_id),
				animalId: item.assigned_animal_id
					? String(item.assigned_animal_id)
					: undefined,
			},
			priority:
				remainingPct <= 10 || daysSupply <= 3 || criticalityScore >= 2
					? "high"
					: "medium",
			estimatedImpact: `Prevent medication stockout${daysSupply > 0 ? ` with ${daysSupply} days estimated remaining` : ""}`,
		});
	}

	return suggestions;
}

// OPTIMIZED: Generate compliance heatmap using materialized views
async function generateComplianceHeatmap(
	db: typeof import("@/db/drizzle").db,
	householdId: string,
	animalId?: string,
	regimenId?: string,
	range?: { from: string; to: string },
): Promise<{ buckets: HeatmapBucket[] }> {
	const conditions = [`cs.household_id = ${householdId}`];

	if (animalId) {
		conditions.push(`cs.animal_id = ${animalId}`);
	}

	if (regimenId) {
		conditions.push(`cs.regimen_id = ${regimenId}`);
	}

	if (range) {
		conditions.push(`cs.day >= ${range.from}::date`);
		conditions.push(`cs.day <= ${range.to}::date`);
	}

	// Use materialized view for ultra-fast heatmap generation
	const heatmapQuery = sql`
		SELECT 
			cs.day_of_week as dow,
			cs.hour_of_day as hour,
			SUM(cs.total_doses) as total_count,
			SUM(cs.on_time_count) as on_time_count,
			SUM(cs.late_count) as late_count,
			SUM(cs.very_late_count) as very_late_count,
			SUM(cs.missed_count) as missed_count,
			AVG(cs.late_rate) as avg_late_pct,
			AVG(cs.missed_rate) as avg_missed_pct
		FROM mv_compliance_stats cs
		WHERE ${conditions.join(" AND ")}
		GROUP BY cs.day_of_week, cs.hour_of_day
		HAVING SUM(cs.total_doses) > 0
		ORDER BY cs.day_of_week, cs.hour_of_day
	`;

	const results = await timedOperations.analytics(
		() => db.execute(heatmapQuery),
		"heatmap-compliance-data-optimized",
	);

	const buckets: HeatmapBucket[] = [];

	for (const row of results.rows) {
		buckets.push({
			dow: Number(row.dow),
			hour: Number(row.hour),
			count: Number(row.total_count),
			latePct: Math.round(Number(row.avg_late_pct) || 0),
			missedPct: Math.round(Number(row.avg_missed_pct) || 0),
		});
	}

	return { buckets };
}

// Helper functions (unchanged)
function formatHourAs12Hour(hour: number): string {
	if (hour === 0) return "12:00 AM";
	if (hour < 12) return `${hour}:00 AM`;
	if (hour === 12) return "12:00 PM";
	return `${hour - 12}:00 PM`;
}

function getDayName(dow: number): string {
	const dayNames = [
		"Sunday",
		"Monday",
		"Tuesday",
		"Wednesday",
		"Thursday",
		"Friday",
		"Saturday",
	];
	return dayNames[dow] || "Unknown";
}

// Keep other functions unchanged for compatibility
async function generateCoSignSuggestions(
	db: typeof import("@/db/drizzle").db,
	householdId: string,
): Promise<Suggestion[]> {
	// This function remains unchanged as it doesn't benefit significantly from materialized views
	// due to the complex overlap detection logic
	const suggestions: Suggestion[] = [];

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

	return suggestions;
}

// Rest of the existing functions remain unchanged...
// (generateSuggestions, storeSuggestionInDb, getSuggestionsFromDb, etc.)

export const insightsOptimizedRouter = createTRPCRouter({
	// Get actionable suggestions for a household (OPTIMIZED)
	getSuggestions: householdProcedure
		.input(getSuggestionsSchema)
		.query(async ({ ctx, input }) => {
			return timedOperations.analytics(async () => {
				const [reminderSuggestions, inventorySuggestions, coSignSuggestions] =
					await Promise.all([
						generateReminderSuggestions(ctx.db, input.householdId),
						generateLowInventorySuggestions(ctx.db, input.householdId),
						generateCoSignSuggestions(ctx.db, input.householdId),
					]);

				const allSuggestions = [
					...reminderSuggestions,
					...inventorySuggestions,
					...coSignSuggestions,
				];

				// Sort by priority and return limited results
				const priorityOrder = { high: 3, medium: 2, low: 1 };
				const sortedSuggestions = allSuggestions
					.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority])
					.slice(0, input.limit);

				return sortedSuggestions;
			}, "insights-suggestions-generation-optimized");
		}),

	// Get compliance heatmap data (OPTIMIZED)
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
				"insights-heatmap-generation-optimized",
			);
		}),

	// Additional optimized endpoints can be added here...
});
