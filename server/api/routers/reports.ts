import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { z } from "zod";
import {
  administrations,
  animals,
  medicationCatalog,
  regimens,
} from "@/db/schema";
import { createTRPCRouter, householdProcedure } from "@/server/api/trpc";

// Types for report data
interface ComplianceData {
  adherencePct: number;
  scheduled: number;
  completed: number;
  missed: number;
  late: number;
  veryLate: number;
  streak: number; // consecutive days without missed doses
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

// Helper function to calculate compliance data
async function calculateComplianceData(
  db: typeof import("@/db/drizzle").db,
  animalId: string,
  householdId: string,
  startDate: Date,
  endDate: Date,
): Promise<ComplianceData> {
  // Get all administrations in the period
  const adminQuery = await db
    .select({
      id: administrations.id,
      status: administrations.status,
      recordedAt: administrations.recordedAt,
      scheduledFor: administrations.scheduledFor,
    })
    .from(administrations)
    .where(
      and(
        eq(administrations.animalId, animalId),
        eq(administrations.householdId, householdId),
        gte(administrations.recordedAt, startDate.toISOString()),
        lte(administrations.recordedAt, endDate.toISOString()),
      ),
    )
    .orderBy(desc(administrations.recordedAt));

  const total = adminQuery.length;
  let onTime = 0;
  let late = 0;
  let veryLate = 0;
  let missed = 0;

  for (const admin of adminQuery) {
    switch (admin.status) {
      case "ON_TIME":
        onTime++;
        break;
      case "LATE":
        late++;
        break;
      case "VERY_LATE":
        veryLate++;
        break;
      case "MISSED":
        missed++;
        break;
    }
  }

  const completed = onTime + late + veryLate;
  const adherencePct = total > 0 ? Math.round((completed / total) * 100) : 100;

  // Get animal's timezone for safe parameterization
  const animalData = await db
    .select({ timezone: animals.timezone })
    .from(animals)
    .where(and(eq(animals.id, animalId), eq(animals.householdId, householdId)))
    .limit(1);

  const animalTimezone = animalData[0]?.timezone || "UTC";

  // Calculate streak (consecutive days without missed doses)
  // Optimized with parameterized timezone to prevent SQL injection
  const streakQuery = sql`
		WITH daily_stats AS (
			SELECT 
				DATE(recorded_at AT TIME ZONE ${animalTimezone}) as dose_date,
				COUNT(*) as total_doses,
				COUNT(CASE WHEN admin.status = 'MISSED' THEN 1 END) as missed_doses
			FROM ${administrations} admin
			WHERE admin.animal_id = ${animalId}
				AND admin.household_id = ${householdId}
				AND admin.recorded_at >= ${startDate.toISOString()}::timestamp - INTERVAL '30 days'
			GROUP BY dose_date
			ORDER BY dose_date DESC
		),
		streak_calc AS (
			SELECT 
				dose_date,
				missed_doses,
				ROW_NUMBER() OVER (ORDER BY dose_date DESC) as rn,
				SUM(CASE WHEN missed_doses > 0 THEN 1 ELSE 0 END) 
					OVER (ORDER BY dose_date DESC ROWS UNBOUNDED PRECEDING) as cumulative_missed
			FROM daily_stats
		)
		SELECT COUNT(*) as streak_days
		FROM streak_calc
		WHERE cumulative_missed = 0
	`;

  const streakResult = await db.execute(streakQuery);
  const streak = Number(streakResult.rows[0]?.streak_days) || 0;

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

// Helper function to get regimen summaries with adherence
async function getRegimenSummaries(
  db: typeof import("@/db/drizzle").db,
  animalId: string,
  householdId: string,
  startDate: Date,
  endDate: Date,
): Promise<RegimenSummary[]> {
  // Get active regimens for the animal with medication details
  const regimensQuery = await db
    .select({
      regimen: regimens,
      medication: medicationCatalog,
    })
    .from(regimens)
    .innerJoin(
      medicationCatalog,
      eq(regimens.medicationId, medicationCatalog.id),
    )
    .innerJoin(animals, eq(regimens.animalId, animals.id))
    .where(
      and(
        eq(regimens.animalId, animalId),
        eq(animals.householdId, householdId),
        eq(regimens.active, true),
        isNull(regimens.deletedAt),
      ),
    );

  const summaries: RegimenSummary[] = [];

  for (const row of regimensQuery) {
    const { regimen, medication } = row;

    // Calculate adherence for this specific regimen
    const adminStats = await db
      .select({
        total: sql<number>`COUNT(*)`,
        completed: sql<number>`COUNT(CASE WHEN status IN ('ON_TIME', 'LATE', 'VERY_LATE') THEN 1 END)`,
      })
      .from(administrations)
      .where(
        and(
          eq(administrations.regimenId, regimen.id),
          eq(administrations.householdId, householdId),
          gte(administrations.recordedAt, startDate.toISOString()),
          lte(administrations.recordedAt, endDate.toISOString()),
        ),
      );

    const stats = adminStats[0];
    const adherence =
      stats?.total && stats.total > 0
        ? Math.round((stats.completed / stats.total) * 100)
        : 100;

    // Format schedule display
    let schedule = "As needed";
    if (regimen.scheduleType === "FIXED" && regimen.timesLocal) {
      schedule = regimen.timesLocal.join(", ");
    } else if (regimen.scheduleType === "INTERVAL" && regimen.intervalHours) {
      schedule = `Every ${regimen.intervalHours} hours`;
    }

    summaries.push({
      id: regimen.id,
      medicationName:
        medication.genericName || medication.brandName || "Unknown",
      strength: medication.strength || "",
      route: regimen.route || medication.route,
      schedule,
      adherence,
      notes: regimen.instructions,
    });
  }

  return summaries;
}

// Helper function to get notable events
async function getNotableEvents(
  db: typeof import("@/db/drizzle").db,
  animalId: string,
  householdId: string,
  startDate: Date,
  endDate: Date,
): Promise<NotableEvent[]> {
  // Get administrations with notes, adverse events, or missed doses
  const eventsQuery = await db
    .select({
      id: administrations.id,
      recordedAt: administrations.recordedAt,
      status: administrations.status,
      notes: administrations.notes,
      adverseEvent: administrations.adverseEvent,
      adverseEventDescription: administrations.adverseEventDescription,
      medicationName: sql<string>`COALESCE(${medicationCatalog.genericName}, ${medicationCatalog.brandName}, 'Unknown')`,
    })
    .from(administrations)
    .innerJoin(regimens, eq(administrations.regimenId, regimens.id))
    .innerJoin(
      medicationCatalog,
      eq(regimens.medicationId, medicationCatalog.id),
    )
    .where(
      and(
        eq(administrations.animalId, animalId),
        eq(administrations.householdId, householdId),
        gte(administrations.recordedAt, startDate.toISOString()),
        lte(administrations.recordedAt, endDate.toISOString()),
        // Only include events that have notes, adverse events, or are missed
        sql`(${administrations.notes} IS NOT NULL 
					OR ${administrations.adverseEvent} = true 
					OR ${administrations.status} = 'MISSED')`,
      ),
    )
    .orderBy(desc(administrations.recordedAt))
    .limit(20);

  const events: NotableEvent[] = [];

  for (const event of eventsQuery) {
    const tags: string[] = [];
    let note = "";

    if (event.adverseEvent && event.adverseEventDescription) {
      tags.push("Adverse Event");
      note = event.adverseEventDescription;
    } else if (event.status === "MISSED") {
      tags.push("Missed Dose");
      note = "Dose was not administered within the scheduled window";
    } else if (event.notes) {
      tags.push("Normal");
      note = event.notes;
    }

    if (note) {
      events.push({
        id: event.id,
        date: new Date(event.recordedAt),
        medication: event.medicationName,
        note,
        tags,
      });
    }
  }

  // Add patterns of missed doses as events
  const missedPatternQuery = sql`
		WITH missed_by_day AS (
			SELECT 
				DATE(recorded_at AT TIME ZONE a.timezone) as dose_date,
				mc.generic_name,
				COUNT(CASE WHEN admin.status = 'MISSED' THEN 1 END) as missed_count
			FROM ${administrations} admin
			JOIN ${regimens} r ON admin.regimen_id = r.id
			JOIN ${medicationCatalog} mc ON r.medication_id = mc.id
			JOIN ${animals} a ON admin.animal_id = a.id
			WHERE admin.animal_id = ${animalId}
				AND admin.household_id = ${householdId}
				AND admin.recorded_at >= ${startDate.toISOString()}
				AND admin.recorded_at <= ${endDate.toISOString()}
			GROUP BY dose_date, mc.generic_name
			HAVING COUNT(CASE WHEN admin.status = 'MISSED' THEN 1 END) >= 2
		)
		SELECT 
			dose_date,
			generic_name,
			missed_count
		FROM missed_by_day
		ORDER BY dose_date DESC
		LIMIT 5
	`;

  const missedPatterns = await db.execute(missedPatternQuery);

  for (const pattern of missedPatterns.rows) {
    events.push({
      id: `missed-pattern-${pattern.dose_date}-${pattern.generic_name}`,
      date: new Date(String(pattern.dose_date)),
      medication: String(pattern.generic_name),
      note: `Multiple missed doses on this day (${pattern.missed_count} doses)`,
      tags: ["Pattern", "Missed Dose"],
    });
  }

  return events
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 10);
}

export const reportsRouter = createTRPCRouter({
  // Get comprehensive animal report data
  animalReport: householdProcedure
    .input(
      z.object({
        animalId: z.uuid(),
        householdId: z.uuid(),
        startDate: z.iso.datetime().optional(),
        endDate: z.iso.datetime().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify animal exists and belongs to household
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

      // Get all the data in parallel
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
});
