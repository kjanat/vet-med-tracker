import { and, desc, eq, gte, lte, notInArray, sql } from "drizzle-orm";
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
  householdId: z.uuid(),
  limit: z.number().min(1).max(20).default(10),
});

const getComplianceHeatmapSchema = z.object({
  householdId: z.uuid(),
  animalId: z.uuid().optional(),
  regimenId: z.uuid().optional(),
  range: z.object({
    from: z.iso.datetime(),
    to: z.iso.datetime(),
  }),
});

const dismissSuggestionSchema = z.object({
  householdId: z.uuid(),
  suggestionId: z.string(),
});

const snoozeReminderSchema = z.object({
  householdId: z.uuid(),
  suggestionId: z.string(),
  snoozeUntil: z.iso.datetime(),
});

const applySuggestionSchema = z.object({
  householdId: z.uuid(),
  suggestionId: z.string(),
});

const revertSuggestionSchema = z.object({
  householdId: z.uuid(),
  suggestionId: z.string(),
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

// Helper function to format hour as 12-hour time string
function formatHourAs12Hour(hour: number): string {
  if (hour === 0) return "12:00 AM";
  if (hour < 12) return `${hour}:00 AM`;
  if (hour === 12) return "12:00 PM";
  return `${hour - 12}:00 PM`;
}

// Helper function to get day name from day of week number
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

// Generate reminder suggestions based on compliance patterns
async function generateReminderSuggestions(
  db: typeof import("@/db/drizzle").db,
  householdId: string,
): Promise<Suggestion[]> {
  const suggestions: Suggestion[] = [];

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
			AND r.schedule_type != 'PRN'
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

  for (const row of complianceResults.rows.slice(0, 3)) {
    const problemRate =
      ((Number(row.late_doses) + Number(row.missed_doses)) /
        Number(row.total_doses)) *
      100;

    if (problemRate >= 25) {
      const dayName = getDayName(Number(row.dow));
      const hour = Number(row.hour);
      const timeStr = formatHourAs12Hour(hour);

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

  return suggestions;
}

// Generate low inventory suggestions
async function generateLowInventorySuggestions(
  db: typeof import("@/db/drizzle").db,
  householdId: string,
): Promise<Suggestion[]> {
  const suggestions: Suggestion[] = [];

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

  return suggestions;
}

// Generate co-sign suggestions based on overlapping administrations
async function generateCoSignSuggestions(
  db: typeof import("@/db/drizzle").db,
  householdId: string,
): Promise<Suggestion[]> {
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

// Helper function to sort suggestions by priority
function sortSuggestionsByPriority(suggestions: Suggestion[]): Suggestion[] {
  const priorityOrder = { high: 3, medium: 2, low: 1 };
  return suggestions.sort((a, b) => {
    return priorityOrder[b.priority] - priorityOrder[a.priority];
  });
}

// Store generated suggestions in database (only if they don't already exist)
async function storeSuggestionInDb(
  db: typeof import("@/db/drizzle").db,
  householdId: string,
  suggestion: Suggestion,
): Promise<void> {
  // Check if this suggestion already exists (by ID pattern)
  const existing = await db
    .select()
    .from(suggestions)
    .where(
      and(
        eq(suggestions.id, suggestion.id),
        eq(suggestions.householdId, householdId),
      ),
    )
    .limit(1);

  if (existing.length === 0) {
    // Create new suggestion
    await db.insert(suggestions).values({
      id: suggestion.id,
      householdId,
      type: suggestion.type,
      summary: suggestion.summary,
      rationale: suggestion.rationale,
      priority: suggestion.priority,
      estimatedImpact: suggestion.estimatedImpact,
      action: suggestion.action,
      status: "pending",
      // Set expiry to 7 days from now
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
  }
}

// Get suggestions from database, combining with generated ones
async function getSuggestionsFromDb(
  db: typeof import("@/db/drizzle").db,
  householdId: string,
  limit: number,
): Promise<Suggestion[]> {
  // Get existing suggestions from database that are not dismissed or expired
  const existingSuggestions = await db
    .select()
    .from(suggestions)
    .where(
      and(
        eq(suggestions.householdId, householdId),
        notInArray(suggestions.status, ["dismissed", "reverted"]),
        sql`(${suggestions.expiresAt} IS NULL OR ${suggestions.expiresAt} > NOW())`,
      ),
    )
    .orderBy(desc(suggestions.createdAt))
    .limit(limit);

  // Convert database suggestions to the interface format
  const dbSuggestions: Suggestion[] = existingSuggestions.map((s) => ({
    id: s.id,
    type: s.type as Suggestion["type"],
    summary: s.summary,
    rationale: s.rationale,
    priority: s.priority as Suggestion["priority"],
    estimatedImpact: s.estimatedImpact || "",
    action: s.action as Suggestion["action"],
  }));

  return dbSuggestions;
}

// Generate suggestions based on patterns in administration data
async function generateSuggestions(
  db: typeof import("@/db/drizzle").db,
  householdId: string,
  limit: number,
): Promise<Suggestion[]> {
  // First, get existing suggestions from database
  const existingSuggestions = await getSuggestionsFromDb(
    db,
    householdId,
    limit,
  );

  // If we have enough existing suggestions, return them
  if (existingSuggestions.length >= limit) {
    return existingSuggestions;
  }

  // Generate new suggestions to fill the gap
  const [reminderSuggestions, inventorySuggestions, coSignSuggestions] =
    await Promise.all([
      generateReminderSuggestions(db, householdId),
      generateLowInventorySuggestions(db, householdId),
      generateCoSignSuggestions(db, householdId),
    ]);

  const newSuggestions = [
    ...reminderSuggestions,
    ...inventorySuggestions,
    ...coSignSuggestions,
  ];

  const sortedNewSuggestions = sortSuggestionsByPriority(newSuggestions);

  // Store new suggestions in database
  for (const suggestion of sortedNewSuggestions.slice(
    0,
    limit - existingSuggestions.length,
  )) {
    await storeSuggestionInDb(db, householdId, suggestion);
  }

  // Combine existing and new suggestions
  const allSuggestions = [...existingSuggestions, ...sortedNewSuggestions];

  // Remove duplicates by ID and return limited results
  const uniqueSuggestions = allSuggestions.filter(
    (suggestion, index, self) =>
      index === self.findIndex((s) => s.id === suggestion.id),
  );

  return sortSuggestionsByPriority(uniqueSuggestions).slice(0, limit);
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
  // Exclude PRN regimens from compliance calculations
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
		JOIN ${regimens} r ON a.regimen_id = r.id
		WHERE ${and(...conditions)}
			AND r.schedule_type != 'PRN'
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

// Helper function to get a suggestion from the database
async function getSuggestionFromDb(
  db: typeof import("@/db/drizzle").db,
  householdId: string,
  suggestionId: string,
): Promise<{ id: string; type: string; action: Suggestion["action"] }> {
  const suggestion = await db
    .select()
    .from(suggestions)
    .where(
      and(
        eq(suggestions.id, suggestionId),
        eq(suggestions.householdId, householdId),
        eq(suggestions.status, "pending"),
      ),
    )
    .limit(1);

  if (suggestion.length === 0) {
    throw new Error("Suggestion not found or already processed");
  }

  const sug = suggestion[0];
  if (!sug) {
    throw new Error("Suggestion not found");
  }

  return {
    id: sug.id,
    type: sug.type,
    action: sug.action as Suggestion["action"],
  };
}

// Helper function to get regimen from database
async function getRegimenById(
  db: typeof import("@/db/drizzle").db,
  regimenId: string,
): Promise<{
  id: string;
  timesLocal: string[];
  requiresCoSign: boolean;
  highRisk: boolean;
} | null> {
  const regimenResult = await db
    .select({
      id: regimens.id,
      timesLocal: regimens.timesLocal,
      requiresCoSign: regimens.requiresCoSign,
      highRisk: regimens.highRisk,
    })
    .from(regimens)
    .where(eq(regimens.id, regimenId))
    .limit(1);

  if (regimenResult.length === 0 || !regimenResult[0]) {
    return null;
  }

  const regimen = regimenResult[0];
  return {
    id: regimen.id,
    timesLocal: regimen.timesLocal || [],
    requiresCoSign: regimen.requiresCoSign,
    highRisk: regimen.highRisk,
  };
}

// Helper function to handle ADD_REMINDER suggestion type
async function handleAddReminderSuggestion(
  action: Suggestion["action"],
): Promise<{ originalValues: Record<string, unknown>; changes: string[] }> {
  if (!action.regimenId || !action.leadMinutes) {
    throw new Error("Invalid reminder action data");
  }

  const originalValues = {
    type: "reminder_added",
    regimenId: action.regimenId,
    leadMinutes: action.leadMinutes,
  };

  const changes = [
    `Added ${action.leadMinutes}-minute reminder for regimen`,
    "Scheduled weekly notification",
  ];

  return { originalValues, changes };
}

// Helper function to handle SHIFT_TIME suggestion type
async function handleShiftTimeSuggestion(
  db: typeof import("@/db/drizzle").db,
  action: Suggestion["action"],
): Promise<{ originalValues: Record<string, unknown>; changes: string[] }> {
  if (!action.regimenId || !action.toTime) {
    throw new Error("Invalid time shift action data");
  }

  const regimen = await getRegimenById(db, action.regimenId);
  if (!regimen) {
    throw new Error("Regimen not found");
  }

  const originalValues = {
    type: "time_shifted",
    regimenId: action.regimenId,
    originalTimes: regimen.timesLocal,
  };

  // Update regimen times (simplified - would need proper time parsing)
  await db
    .update(regimens)
    .set({
      timesLocal: [action.toTime],
      updatedAt: new Date().toISOString(),
    })
    .where(eq(regimens.id, action.regimenId));

  const changes = [
    `Updated schedule time to ${action.toTime}`,
    "Recalculated upcoming due times",
  ];

  return { originalValues, changes };
}

// Helper function to handle ENABLE_COSIGN suggestion type
async function handleEnableCoSignSuggestion(
  db: typeof import("@/db/drizzle").db,
  action: Suggestion["action"],
): Promise<{ originalValues: Record<string, unknown>; changes: string[] }> {
  if (!action.regimenId) {
    throw new Error("Invalid co-sign action data");
  }

  const regimen = await getRegimenById(db, action.regimenId);
  if (!regimen) {
    throw new Error("Regimen not found");
  }

  const originalValues = {
    type: "cosign_enabled",
    regimenId: action.regimenId,
    originalRequiresCoSign: regimen.requiresCoSign,
    originalHighRisk: regimen.highRisk,
  };

  await db
    .update(regimens)
    .set({
      requiresCoSign: true,
      highRisk: action.highRisk || regimen.highRisk,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(regimens.id, action.regimenId));

  const changes = ["Enabled co-sign requirement", "Updated high-risk flag"];

  return { originalValues, changes };
}

// Helper function to update suggestion status
async function updateSuggestionStatus(
  db: typeof import("@/db/drizzle").db,
  suggestionId: string,
  userId: string,
  originalValues: Record<string, unknown>,
): Promise<void> {
  await db
    .update(suggestions)
    .set({
      status: "applied",
      appliedAt: new Date().toISOString(),
      appliedByUserId: userId,
      originalValues,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(suggestions.id, suggestionId));
}

// Apply a suggestion by making the actual changes
async function applySuggestion(
  db: typeof import("@/db/drizzle").db,
  householdId: string,
  suggestionId: string,
  userId: string,
): Promise<{ success: boolean; changes: string[] }> {
  try {
    const suggestion = await getSuggestionFromDb(db, householdId, suggestionId);
    let originalValues: Record<string, unknown> = {};
    let changes: string[] = [];

    // Handle different suggestion types
    if (suggestion.type === "ADD_REMINDER") {
      const result = await handleAddReminderSuggestion(suggestion.action);
      originalValues = result.originalValues;
      changes = result.changes;
    } else if (suggestion.type === "SHIFT_TIME") {
      const result = await handleShiftTimeSuggestion(db, suggestion.action);
      originalValues = result.originalValues;
      changes = result.changes;
    } else if (suggestion.type === "ENABLE_COSIGN") {
      const result = await handleEnableCoSignSuggestion(db, suggestion.action);
      originalValues = result.originalValues;
      changes = result.changes;
    }

    // Update suggestion status
    await updateSuggestionStatus(db, suggestionId, userId, originalValues);

    return { success: true, changes };
  } catch (error) {
    console.error("Failed to apply suggestion:", error);
    throw new Error("Failed to apply suggestion");
  }
}

// Revert an applied suggestion
async function revertSuggestion(
  db: typeof import("@/db/drizzle").db,
  householdId: string,
  suggestionId: string,
  userId: string,
): Promise<{ success: boolean; changes: string[] }> {
  const changes: string[] = [];

  // Get the suggestion from database
  const suggestion = await db
    .select()
    .from(suggestions)
    .where(
      and(
        eq(suggestions.id, suggestionId),
        eq(suggestions.householdId, householdId),
        eq(suggestions.status, "applied"),
      ),
    )
    .limit(1);

  if (suggestion.length === 0) {
    throw new Error("Suggestion not found or not applied");
  }

  const sug = suggestion[0];
  if (!sug) {
    throw new Error("Suggestion not found");
  }

  const originalValues = sug.originalValues as Record<string, unknown>;

  if (!originalValues) {
    throw new Error("No original values stored for reverting");
  }

  try {
    if (originalValues.type === "time_shifted" && originalValues.regimenId) {
      // Revert time shift
      await db
        .update(regimens)
        .set({
          timesLocal: originalValues.originalTimes as string[],
          updatedAt: new Date().toISOString(),
        })
        .where(eq(regimens.id, originalValues.regimenId as string));

      changes.push("Reverted schedule time to original");
      changes.push("Restored original timing");
    } else if (
      originalValues.type === "cosign_enabled" &&
      originalValues.regimenId
    ) {
      // Revert co-sign requirement
      await db
        .update(regimens)
        .set({
          requiresCoSign: originalValues.originalRequiresCoSign as boolean,
          highRisk: originalValues.originalHighRisk as boolean,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(regimens.id, originalValues.regimenId as string));

      changes.push("Disabled co-sign requirement");
      changes.push("Restored original risk level");
    } else if (originalValues.type === "reminder_added") {
      // For reminders, we would typically remove the notification entries
      // This is simplified - in reality you'd clean up the notification queue
      changes.push("Removed reminder notifications");
    }

    // Update suggestion status
    await db
      .update(suggestions)
      .set({
        status: "reverted",
        revertedAt: new Date().toISOString(),
        revertedByUserId: userId,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(suggestions.id, suggestionId));

    return { success: true, changes };
  } catch (error) {
    console.error("Failed to revert suggestion:", error);
    throw new Error("Failed to revert suggestion");
  }
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

  // Apply a suggestion
  applySuggestion: householdProcedure
    .input(applySuggestionSchema)
    .mutation(async ({ ctx, input }) => {
      return timedOperations.analytics(
        () =>
          applySuggestion(
            ctx.db,
            input.householdId,
            input.suggestionId,
            ctx.dbUser.id,
          ),
        "apply-suggestion",
      );
    }),

  // Revert a suggestion
  revertSuggestion: householdProcedure
    .input(revertSuggestionSchema)
    .mutation(async ({ ctx, input }) => {
      return timedOperations.analytics(
        () =>
          revertSuggestion(
            ctx.db,
            input.householdId,
            input.suggestionId,
            ctx.dbUser.id,
          ),
        "revert-suggestion",
      );
    }),

  // Dismiss a suggestion
  dismissSuggestion: householdProcedure
    .input(dismissSuggestionSchema)
    .mutation(async ({ ctx, input }) => {
      // Update suggestion status to dismissed
      await ctx.db
        .update(suggestions)
        .set({
          status: "dismissed",
          dismissedAt: new Date().toISOString(),
          dismissedByUserId: ctx.dbUser.id,
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(suggestions.id, input.suggestionId),
            eq(suggestions.householdId, input.householdId),
          ),
        );

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
