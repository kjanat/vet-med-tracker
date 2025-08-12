import { TRPCError } from "@trpc/server";
import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import {
	administrations,
	animals,
	medicationCatalog,
	regimens,
} from "@/db/schema";
import { createTRPCRouter, householdProcedure } from "@/server/api/trpc";

// Types for report data (unchanged)
interface ComplianceData {
	adherencePct: number;
	scheduled: number;
	completed: number;
	missed: number;
	late: number;
	veryLate: number;
	streak: number;
}

interface RegimenSummary {
	id: string;
	medicationName: string;
	strength: string;
	route: string;
	schedule: string;
	adherence: number;
	notes: string | null;
}

interface NotableEvent {
	id: string;
	date: Date;
	medication: string;
	note: string;
	tags: string[];
}

// OPTIMIZED: Calculate compliance data using materialized views
async function calculateComplianceData(
	db: typeof import("@/db/drizzle").db,
	animalId: string,
	householdId: string,
	startDate: Date,
	endDate: Date,
): Promise<ComplianceData> {
	// Use materialized view for much faster compliance calculation
	const complianceQuery = sql`
		WITH compliance_summary AS (
			SELECT 
				SUM(cs.total_doses) as total_doses,
				SUM(cs.on_time_count) as on_time_count,
				SUM(cs.late_count) as late_count,
				SUM(cs.very_late_count) as very_late_count,
				SUM(cs.missed_count) as missed_count
			FROM mv_compliance_stats cs
			WHERE cs.household_id = ${householdId}
				AND cs.animal_id = ${animalId}
				AND cs.day >= ${startDate.toISOString().split("T")[0]}::date
				AND cs.day <= ${endDate.toISOString().split("T")[0]}::date
		),
		streak_calc AS (
			SELECT 
				cs.day,
				CASE WHEN SUM(cs.missed_count) > 0 THEN 1 ELSE 0 END as has_missed
			FROM mv_compliance_stats cs
			WHERE cs.household_id = ${householdId}
				AND cs.animal_id = ${animalId}
				AND cs.day >= ${startDate.toISOString().split("T")[0]}::date - INTERVAL '30 days'
			GROUP BY cs.day
			ORDER BY cs.day DESC
		),
		streak_with_row AS (
			SELECT 
				day,
				has_missed,
				ROW_NUMBER() OVER (ORDER BY day DESC) as rn,
				SUM(has_missed) OVER (ORDER BY day DESC ROWS UNBOUNDED PRECEDING) as cumulative_missed
			FROM streak_calc
		)
		SELECT 
			cs.total_doses,
			cs.on_time_count,
			cs.late_count,
			cs.very_late_count,
			cs.missed_count,
			(cs.on_time_count + cs.late_count + cs.very_late_count) as completed,
			COALESCE((SELECT COUNT(*) FROM streak_with_row WHERE cumulative_missed = 0), 0) as streak_days
		FROM compliance_summary cs
	`;

	const result = await db.execute(complianceQuery);
	const row = result.rows[0];

	if (!row) {
		return {
			adherencePct: 100,
			scheduled: 0,
			completed: 0,
			missed: 0,
			late: 0,
			veryLate: 0,
			streak: 0,
		};
	}

	const total = Number(row.total_doses) || 0;
	const completed = Number(row.completed) || 0;
	const missed = Number(row.missed_count) || 0;
	const late = Number(row.late_count) || 0;
	const veryLate = Number(row.very_late_count) || 0;
	const streak = Number(row.streak_days) || 0;

	const adherencePct = total > 0 ? Math.round((completed / total) * 100) : 100;

	return {
		adherencePct,
		scheduled: total,
		completed,
		missed,
		late,
		veryLate,
		streak,
	};
}

// OPTIMIZED: Get regimen summaries using materialized views for adherence calculation
async function getRegimenSummaries(
	db: typeof import("@/db/drizzle").db,
	animalId: string,
	householdId: string,
	startDate: Date,
	endDate: Date,
): Promise<RegimenSummary[]> {
	// Get active regimens with adherence from materialized view
	const regimensQuery = sql`
		WITH regimen_adherence AS (
			SELECT 
				cs.regimen_id,
				AVG(cs.compliance_rate) as avg_compliance_rate,
				COUNT(*) as data_points
			FROM mv_compliance_stats cs
			WHERE cs.household_id = ${householdId}
				AND cs.animal_id = ${animalId}
				AND cs.day >= ${startDate.toISOString().split("T")[0]}::date
				AND cs.day <= ${endDate.toISOString().split("T")[0]}::date
			GROUP BY cs.regimen_id
		)
		SELECT 
			r.id,
			r.instructions,
			r.schedule_type,
			r.times_local,
			r.interval_hours,
			r.route,
			mc.generic_name,
			mc.brand_name,
			mc.strength,
			mc.route as med_route,
			COALESCE(ra.avg_compliance_rate, 100) as adherence_rate
		FROM ${regimens} r
		JOIN ${medicationCatalog} mc ON r.medication_id = mc.id
		JOIN ${animals} a ON r.animal_id = a.id
		LEFT JOIN regimen_adherence ra ON r.id = ra.regimen_id
		WHERE r.animal_id = ${animalId}
			AND a.household_id = ${householdId}
			AND r.active = true
			AND r.deleted_at IS NULL
		ORDER BY mc.generic_name, r.created_at DESC
	`;

	const regimensResult = await db.execute(regimensQuery);
	const summaries: RegimenSummary[] = [];

	for (const row of regimensResult.rows) {
		// Format schedule display
		let schedule = "As needed";
		if (row.schedule_type === "FIXED" && row.times_local) {
			const times = Array.isArray(row.times_local)
				? row.times_local
				: JSON.parse(row.times_local as string);
			schedule = times.join(", ");
		} else if (row.schedule_type === "INTERVAL" && row.interval_hours) {
			schedule = `Every ${row.interval_hours} hours`;
		}

		summaries.push({
			id: String(row.id),
			medicationName: String(row.generic_name || row.brand_name || "Unknown"),
			strength: String(row.strength || ""),
			route: String(row.route || row.med_route),
			schedule,
			adherence: Math.round(Number(row.adherence_rate) || 100),
			notes: row.instructions ? String(row.instructions) : null,
		});
	}

	return summaries;
}

// OPTIMIZED: Get notable events with better filtering and indexing
async function getNotableEvents(
	db: typeof import("@/db/drizzle").db,
	animalId: string,
	householdId: string,
	startDate: Date,
	endDate: Date,
): Promise<NotableEvent[]> {
	// Optimized query focusing on notable events
	const eventsQuery = sql`
		WITH notable_administrations AS (
			SELECT
				a.id,
				a.recorded_at,
				a.status,
				a.notes,
				a.adverse_event,
				a.adverse_event_description,
				COALESCE(mc.generic_name, mc.brand_name, 'Unknown') as medication_name
			FROM ${administrations} a
			JOIN ${regimens} r ON a.regimen_id = r.id
			JOIN ${medicationCatalog} mc ON r.medication_id = mc.id
			WHERE a.animal_id = ${animalId}
				AND a.household_id = ${householdId}
				AND a.recorded_at >= ${startDate.toISOString()}
				AND a.recorded_at <= ${endDate.toISOString()}
				AND (
					a.notes IS NOT NULL 
					OR a.adverse_event = true 
					OR a.status = 'MISSED'
				)
			ORDER BY a.recorded_at DESC
			LIMIT 15
		),
		missed_patterns AS (
			SELECT DISTINCT
				'missed-pattern-' || cs.day::text || '-' || cs.regimen_id::text as event_id,
				cs.day as event_date,
				mc.generic_name as medication_name,
				'Multiple missed doses on this day (' || SUM(cs.missed_count) || ' doses)' as pattern_note
			FROM mv_compliance_stats cs
			JOIN ${regimens} r ON cs.regimen_id = r.id
			JOIN ${medicationCatalog} mc ON r.medication_id = mc.id
			WHERE cs.animal_id = ${animalId}
				AND cs.household_id = ${householdId}
				AND cs.day >= ${startDate.toISOString().split("T")[0]}::date
				AND cs.day <= ${endDate.toISOString().split("T")[0]}::date
				AND cs.missed_count >= 2
			GROUP BY cs.day, cs.regimen_id, mc.generic_name
			ORDER BY cs.day DESC
			LIMIT 5
		)
		SELECT * FROM notable_administrations
		UNION ALL
		SELECT 
			event_id as id,
			event_date as recorded_at,
			'MISSED' as status,
			NULL as notes,
			false as adverse_event,
			pattern_note as adverse_event_description,
			medication_name
		FROM missed_patterns
		ORDER BY recorded_at DESC
	`;

	const eventsResult = await db.execute(eventsQuery);
	const events: NotableEvent[] = [];

	for (const event of eventsResult.rows) {
		const tags: string[] = [];
		let note = "";

		if (event.adverse_event && event.adverse_event_description) {
			tags.push("Adverse Event");
			note = String(event.adverse_event_description);
		} else if (event.status === "MISSED") {
			tags.push(
				event.id?.toString().startsWith("missed-pattern-") ? "Pattern" : "",
			);
			tags.push("Missed Dose");
			note = String(
				event.adverse_event_description ||
					"Dose was not administered within the scheduled window",
			);
		} else if (event.notes) {
			tags.push("Normal");
			note = String(event.notes);
		}

		if (note && tags.length > 0) {
			events.push({
				id: String(event.id),
				date: new Date(String(event.recorded_at)),
				medication: String(event.medication_name),
				note,
				tags: tags.filter(Boolean),
			});
		}
	}

	return events.slice(0, 10);
}

export const reportsOptimizedRouter = createTRPCRouter({
	// Get comprehensive animal report data (OPTIMIZED)
	animalReport: householdProcedure
		.input(
			z.object({
				animalId: z.string().uuid(),
				householdId: z.string().uuid(),
				startDate: z.string().datetime().optional(),
				endDate: z.string().datetime().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			// Verify animal exists and belongs to household (unchanged)
			const animal = await ctx.db
				.select({
					id: animals.id,
					name: animals.name,
					species: animals.species,
					breed: animals.breed,
					weightKg: animals.weightKg,
					photoUrl: animals.photoUrl,
					timezone: animals.timezone,
					allergies: animals.allergies,
					conditions: animals.conditions,
				})
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
					message: "Animal not found or access denied",
				});
			}

			// Default to last 30 days if no date range provided
			const endDate = input.endDate ? new Date(input.endDate) : new Date();
			const startDate = input.startDate
				? new Date(input.startDate)
				: new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

			// Get all the data in parallel using optimized functions
			const [complianceData, regimens, notableEvents] = await Promise.all([
				calculateComplianceData(
					ctx.db,
					input.animalId,
					input.householdId,
					startDate,
					endDate,
				),
				getRegimenSummaries(
					ctx.db,
					input.animalId,
					input.householdId,
					startDate,
					endDate,
				),
				getNotableEvents(
					ctx.db,
					input.animalId,
					input.householdId,
					startDate,
					endDate,
				),
			]);

			return {
				animal: {
					...animal[0],
					// Convert null to undefined for optional fields
					breed: animal[0].breed || undefined,
					weightKg: animal[0].weightKg ? Number(animal[0].weightKg) : undefined,
					allergies: animal[0].allergies || [],
					conditions: animal[0].conditions || [],
					// Calculate pending meds (due/overdue count)
					pendingMeds: regimens.filter((r) => r.adherence < 90).length,
				},
				compliance: complianceData,
				regimens,
				notableEvents,
				reportPeriod: {
					from: startDate,
					to: endDate,
				},
			};
		}),

	// Additional optimized report endpoints can be added here
	// For example: household summary, medication effectiveness, etc.

	householdSummary: householdProcedure
		.input(
			z.object({
				householdId: z.string().uuid(),
				startDate: z.string().datetime().optional(),
				endDate: z.string().datetime().optional(),
			}),
		)
		.query(async ({ ctx, input }) => {
			const endDate = input.endDate ? new Date(input.endDate) : new Date();
			const startDate = input.startDate
				? new Date(input.startDate)
				: new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

			// Use materialized views for fast household-wide analytics
			const summaryQuery = sql`
				WITH household_stats AS (
					SELECT 
						COUNT(DISTINCT cs.animal_id) as total_animals,
						COUNT(DISTINCT cs.regimen_id) as active_regimens,
						COUNT(DISTINCT mu.medication_id) as unique_medications,
						AVG(cs.compliance_rate) as avg_compliance_rate,
						SUM(cs.missed_count) as total_missed_doses,
						SUM(cs.total_doses) as total_scheduled_doses
					FROM mv_compliance_stats cs
					LEFT JOIN mv_medication_usage mu ON (
						cs.household_id = mu.household_id 
						AND cs.animal_id = mu.animal_id
						AND cs.regimen_id IN (
							SELECT r.id FROM ${regimens} r WHERE r.medication_id = mu.medication_id
						)
					)
					WHERE cs.household_id = ${input.householdId}
						AND cs.day >= ${startDate.toISOString().split("T")[0]}::date
						AND cs.day <= ${endDate.toISOString().split("T")[0]}::date
				),
				inventory_stats AS (
					SELECT 
						COUNT(*) FILTER (WHERE ic.critical_stock_items > 0) as critical_items,
						COUNT(*) FILTER (WHERE ic.low_stock_items > 0) as low_stock_items,
						COUNT(*) FILTER (WHERE ic.expiring_soon_count > 0) as expiring_soon,
						AVG(ic.min_days_supply) as avg_days_supply
					FROM mv_inventory_consumption ic
					WHERE ic.household_id = ${input.householdId}
						AND ic.month >= DATE_TRUNC('month', ${startDate.toISOString().split("T")[0]}::date)
				),
				health_trends AS (
					SELECT 
						COUNT(*) FILTER (WHERE ht.health_status = 'UNSTABLE') as unstable_animals,
						COUNT(*) FILTER (WHERE ht.health_status = 'MONITORING') as monitoring_animals,
						COUNT(*) FILTER (WHERE ht.adverse_events > 0) as animals_with_adverse_events,
						AVG(ht.treatment_complexity_score) as avg_complexity_score
					FROM mv_animal_health_trends ht
					WHERE ht.household_id = ${input.householdId}
						AND ht.month >= DATE_TRUNC('month', ${startDate.toISOString().split("T")[0]}::date)
				)
				SELECT 
					hs.*,
					is.critical_items,
					is.low_stock_items,
					is.expiring_soon,
					is.avg_days_supply,
					ht.unstable_animals,
					ht.monitoring_animals,
					ht.animals_with_adverse_events,
					ht.avg_complexity_score
				FROM household_stats hs
				CROSS JOIN inventory_stats is
				CROSS JOIN health_trends ht
			`;

			const result = await ctx.db.execute(summaryQuery);
			const stats = result.rows[0];

			if (!stats) {
				throw new TRPCError({
					code: "NOT_FOUND",
					message: "No data found for household",
				});
			}

			return {
				period: { from: startDate, to: endDate },
				animals: {
					total: Number(stats.total_animals) || 0,
					unstable: Number(stats.unstable_animals) || 0,
					monitoring: Number(stats.monitoring_animals) || 0,
					withAdverseEvents: Number(stats.animals_with_adverse_events) || 0,
				},
				medications: {
					uniqueCount: Number(stats.unique_medications) || 0,
					activeRegimens: Number(stats.active_regimens) || 0,
					avgComplexityScore: Math.round(
						Number(stats.avg_complexity_score) || 0,
					),
				},
				compliance: {
					overallRate: Math.round(Number(stats.avg_compliance_rate) || 100),
					totalScheduled: Number(stats.total_scheduled_doses) || 0,
					totalMissed: Number(stats.total_missed_doses) || 0,
				},
				inventory: {
					criticalItems: Number(stats.critical_items) || 0,
					lowStockItems: Number(stats.low_stock_items) || 0,
					expiringSoon: Number(stats.expiring_soon) || 0,
					avgDaysSupply: Math.round(Number(stats.avg_days_supply) || 0),
				},
			};
		}),
});
