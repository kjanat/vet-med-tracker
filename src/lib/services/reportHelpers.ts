import { and, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";
import type * as schema from "@/db/schema";
import {
  vetmedAdministrations as administrations,
  vetmedAnimals as animals,
  vetmedMedicationCatalog as medicationCatalog,
  vetmedRegimens as regimens,
} from "@/db/schema";

// Types for report data
export interface ComplianceData {
  adherencePct: number;
  scheduled: number;
  completed: number;
  missed: number;
  late: number;
  veryLate: number;
  streak: number;
}

export interface RegimenSummary {
  id: string;
  medicationName: string;
  strength: string;
  route: string;
  schedule: string;
  adherence: number;
  notes: string | null;
}

export interface NotableEvent {
  id: string;
  date: Date;
  medication: string;
  note: string;
  tags: string[];
}

/**
 * Calculate compliance statistics for an animal within a date range
 */
export async function calculateComplianceData(
  db: NeonHttpDatabase<typeof schema>,
  animalId: string,
  householdId: string,
  startDate: Date,
  endDate: Date,
): Promise<ComplianceData> {
  const adminQuery = await db
    .select({
      id: administrations.id,
      recordedAt: administrations.recordedAt,
      scheduledFor: administrations.scheduledFor,
      status: administrations.status,
    })
    .from(administrations)
    .where(
      and(
        eq(administrations.animalId, animalId),
        eq(administrations.householdId, householdId),
        gte(administrations.recordedAt, startDate),
        lte(administrations.recordedAt, endDate),
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

  const animalData = await db
    .select({ timezone: animals.timezone })
    .from(animals)
    .where(and(eq(animals.id, animalId), eq(animals.householdId, householdId)))
    .limit(1);

  const animalTimezone = animalData[0]?.timezone || "UTC";

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
  const streak = Number(streakResult.rows[0]?.["streak_days"]) || 0;

  return {
    adherencePct,
    completed,
    late,
    missed,
    scheduled: total,
    streak,
    veryLate,
  };
}

/**
 * Get summaries of all active regimens for an animal
 */
export async function getRegimenSummaries(
  db: NeonHttpDatabase<typeof schema>,
  animalId: string,
  householdId: string,
  startDate: Date,
  endDate: Date,
): Promise<RegimenSummary[]> {
  const regimensQuery = await db
    .select({
      medication: medicationCatalog,
      regimen: regimens,
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

    const adminStats = await db
      .select({
        completed: sql<number>`COUNT(CASE WHEN status IN ('ON_TIME', 'LATE', 'VERY_LATE') THEN 1 END)`,
        total: sql<number>`COUNT(*)`,
      })
      .from(administrations)
      .where(
        and(
          eq(administrations.regimenId, regimen.id),
          eq(administrations.householdId, householdId),
          gte(administrations.recordedAt, startDate),
          lte(administrations.recordedAt, endDate),
        ),
      );

    const stats = adminStats[0];
    const adherence =
      stats?.total && stats.total > 0
        ? Math.round((stats.completed / stats.total) * 100)
        : 100;

    let schedule = "As needed";
    if (regimen.scheduleType === "FIXED" && regimen.timesLocal) {
      schedule = regimen.timesLocal.join(", ");
    } else if (regimen.scheduleType === "INTERVAL" && regimen.intervalHours) {
      schedule = `Every ${regimen.intervalHours} hours`;
    }

    summaries.push({
      adherence,
      id: regimen.id,
      medicationName:
        medication.genericName || medication.brandName || "Unknown",
      notes: regimen.instructions,
      route: regimen.route || medication.route,
      schedule,
      strength: medication.strength || "",
    });
  }

  return summaries;
}

/**
 * Get notable events (missed doses, adverse events, notes) for an animal
 */
export async function getNotableEvents(
  db: NeonHttpDatabase<typeof schema>,
  animalId: string,
  householdId: string,
  startDate: Date,
  endDate: Date,
): Promise<NotableEvent[]> {
  const eventsQuery = await db
    .select({
      adverseEvent: administrations.adverseEvent,
      adverseEventDescription: administrations.adverseEventDescription,
      id: administrations.id,
      medicationName: sql<string>`COALESCE(${medicationCatalog.genericName}, ${medicationCatalog.brandName}, 'Unknown')`,
      notes: administrations.notes,
      recordedAt: administrations.recordedAt,
      status: administrations.status,
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
        gte(administrations.recordedAt, startDate),
        lte(administrations.recordedAt, endDate),
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
        date: new Date(event.recordedAt),
        id: event.id,
        medication: event.medicationName,
        note,
        tags,
      });
    }
  }

  return events
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 10);
}
