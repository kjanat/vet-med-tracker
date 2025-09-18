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
    isOverdue: false,
    minutesUntilDue: 0,
    section: "prn",
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
    isOverdue,
    minutesUntilDue,
    section,
    targetTime: targetTime.toISOString(),
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
    medicationName: string | null;
    isCustomMedication: boolean;
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
  } | null;
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

  // Use hybrid medication name approach - prioritize regimen.medicationName over catalog
  const medicationName =
    regimen.medicationName ||
    medication?.genericName ||
    medication?.brandName ||
    "Unknown";

  return {
    animalId: animal.id,
    animalName: animal.name,
    animalPhotoUrl: animal.photoUrl,
    animalSpecies: animal.species,
    brandName: medication?.brandName || null,
    compliance,
    dose: regimen.dose || "",
    form: medication?.form || "",
    id: regimen.id,
    instructions: regimen.instructions,
    isHighRisk: regimen.highRisk,
    isOverdue: dueStatus.isOverdue,
    isPRN: regimen.scheduleType === "PRN",
    lastAdministration: lastAdmin,
    medicationName,
    minutesUntilDue: dueStatus.minutesUntilDue,
    prnReason: regimen.prnReason,
    requiresCoSign: regimen.requiresCoSign,
    route: regimen.route || medication?.route || "",
    section: dueStatus.section,
    strength: medication?.strength || "",
    targetTime: dueStatus.targetTime,
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
  // Create a new regimen
  create: householdProcedure
    .input(
      z.object({
        animalId: z.uuid(),
        cutoffMinutes: z.number().int().positive().default(240),
        dose: z.string().optional(),
        endDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        highRisk: z.boolean().default(false),
        householdId: z.uuid(),
        instructions: z.string().optional(),
        intervalHours: z.number().int().positive().optional(),
        isCustomMedication: z.boolean().default(false),
        maxDailyDoses: z.number().int().positive().optional(),
        medicationId: z.uuid().optional(),
        medicationName: z.string().optional(),
        name: z.string().optional(),
        prnReason: z.string().optional(),
        requiresCoSign: z.boolean().default(false),
        route: z.string().optional(),
        scheduleType: z.enum(scheduleTypeEnum.enumValues),
        startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        timesLocal: z.array(z.string().regex(/^\d{2}:\d{2}$/)).optional(),
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

      // Validate hybrid medication approach
      if (!input.medicationId && !input.medicationName) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Either medicationId or medicationName is required",
        });
      }

      // If using catalog medication, verify it exists
      if (input.medicationId) {
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
        active: true,
        animalId: input.animalId,
        cutoffMinutes: input.cutoffMinutes,
        dose: input.dose,
        endDate: input.endDate,
        highRisk: input.highRisk,
        instructions: input.instructions,
        intervalHours: input.intervalHours,
        isCustomMedication: input.isCustomMedication,
        maxDailyDoses: input.maxDailyDoses,
        medicationId: input.medicationId,
        medicationName: input.medicationName,
        name: input.name,
        prnReason: input.prnReason,
        requiresCoSign: input.requiresCoSign,
        route: input.route,
        scheduleType: input.scheduleType,
        startDate: input.startDate,
        timesLocal: input.timesLocal,
      };

      const result = await ctx.db
        .insert(regimens)
        .values(newRegimen)
        .returning();

      // Create audit log entry
      await createAuditLog(ctx.db, {
        action: "CREATE",
        householdId: input.householdId,
        newValues: newRegimen,
        resourceId: result[0]?.id,
        resourceType: "regimen",
        userId: ctx.dbUser.id,
      });

      // Get the complete regimen with medication details
      const completeRegimen = await ctx.db
        .select({
          animal: animals,
          medication: medicationCatalog,
          regimen: regimens,
        })
        .from(regimens)
        .innerJoin(animals, eq(regimens.animalId, animals.id))
        .leftJoin(
          medicationCatalog,
          eq(regimens.medicationId, medicationCatalog.id),
        )
        .where(eq(regimens.id, result[0]?.id ?? ""))
        .limit(1);

      return completeRegimen[0];
    }),

  // Soft delete a regimen
  delete: householdProcedure
    .input(
      z.object({
        householdId: z.uuid(),
        id: z.uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify regimen exists and belongs to household
      const existing = await ctx.db
        .select({ animal: animals, regimen: regimens })
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
        action: "DELETE",
        householdId: input.householdId,
        oldValues: existing[0]?.regimen,
        resourceId: input.id,
        resourceType: "regimen",
        userId: ctx.dbUser.id,
      });

      return { regimen: result[0], success: true };
    }),

  // Get a single regimen by ID
  getById: householdProcedure
    .input(
      z.object({
        householdId: z.uuid(),
        id: z.uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const result = await ctx.db
        .select({
          animal: animals,
          medication: medicationCatalog,
          regimen: regimens,
        })
        .from(regimens)
        .innerJoin(animals, eq(regimens.animalId, animals.id))
        .leftJoin(
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
  // List all regimens for a household
  list: householdProcedure
    .input(
      z.object({
        activeOnly: z.boolean().default(true),
        animalId: z.uuid().optional(),
        householdId: z.uuid(),
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
          animal: animals,
          medication: medicationCatalog,
          regimen: regimens,
        })
        .from(regimens)
        .innerJoin(animals, eq(regimens.animalId, animals.id))
        .leftJoin(
          medicationCatalog,
          eq(regimens.medicationId, medicationCatalog.id),
        )
        .where(and(...conditions))
        .orderBy(animals.name, regimens.startDate);

      return result;
    }),

  // Get regimens for multiple animals (for bulk operations)
  listByAnimals: householdProcedure
    .input(
      z.object({
        animalIds: z.array(z.uuid()).min(1),
        householdId: z.uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const results = await ctx.db
        .select({
          // Animal info
          animalId: animals.id,
          animalName: animals.name,
          brandName: medicationCatalog.brandName,
          dose: regimens.dose,
          // Medication info
          genericName: medicationCatalog.genericName,
          isCustomMedication: regimens.isCustomMedication,
          medicationId: regimens.medicationId,
          medicationName: regimens.medicationName,
          // Regimen info
          regimenId: regimens.id,
          route: regimens.route,
          scheduleType: regimens.scheduleType,
          strength: medicationCatalog.strength,
          timesLocal: regimens.timesLocal,
        })
        .from(regimens)
        .innerJoin(animals, eq(regimens.animalId, animals.id))
        .leftJoin(
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
        .orderBy(animals.name, regimens.medicationName);

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
            animalId: regimen.animalId,
            animalName: regimen.animalName,
            dose: regimen.dose || "",
            id: regimen.regimenId,
            medicationName:
              regimen.medicationName ||
              regimen.brandName ||
              regimen.genericName ||
              "Unknown",
            route: regimen.route,
            scheduleType: regimen.scheduleType,
          })),
        };
      });
    }),

  // List due medications for recording
  listDue: protectedProcedure
    .input(
      z.object({
        animalId: z.uuid().optional(),
        householdId: z.uuid().optional(),
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
          animal: animals,
          // Get the latest administration for each regimen
          lastAdmin: {
            id: administrations.id,
            recordedAt: administrations.recordedAt,
            status: administrations.status,
          },
          medication: medicationCatalog,
          regimen: regimens,
        })
        .from(regimens)
        .innerJoin(animals, eq(regimens.animalId, animals.id))
        .leftJoin(
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

  // Pause a regimen
  pause: householdProcedure
    .input(
      z.object({
        householdId: z.uuid(),
        id: z.uuid(),
        reason: z.string().min(1).max(500),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify regimen exists and belongs to household
      const existing = await ctx.db
        .select({ animal: animals, regimen: regimens })
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
        action: "PAUSE",
        details: { reason: input.reason },
        householdId: input.householdId,
        newValues: { pausedAt: result[0]?.pausedAt, pauseReason: input.reason },
        oldValues: { pausedAt: existing[0].regimen.pausedAt },
        resourceId: input.id,
        resourceType: "regimen",
        userId: ctx.dbUser.id,
      });

      return { regimen: result[0], success: true };
    }),

  // Resume a paused regimen
  resume: householdProcedure
    .input(
      z.object({
        householdId: z.uuid(),
        id: z.uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify regimen exists and belongs to household
      const existing = await ctx.db
        .select({ animal: animals, regimen: regimens })
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
        action: "RESUME",
        householdId: input.householdId,
        newValues: { pausedAt: null, pauseReason: null },
        oldValues: {
          pausedAt: existing[0].regimen.pausedAt,
          pauseReason: existing[0].regimen.pauseReason,
        },
        resourceId: input.id,
        resourceType: "regimen",
        userId: ctx.dbUser.id,
      });

      return { regimen: result[0], success: true };
    }),

  // Update an existing regimen
  update: householdProcedure
    .input(
      z.object({
        cutoffMinutes: z.number().int().positive().optional(),
        dose: z.string().optional(),
        endDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        highRisk: z.boolean().optional(),
        householdId: z.uuid(),
        id: z.uuid(),
        instructions: z.string().optional(),
        intervalHours: z.number().int().positive().optional(),
        maxDailyDoses: z.number().int().positive().optional(),
        name: z.string().optional(),
        prnReason: z.string().optional(),
        requiresCoSign: z.boolean().optional(),
        route: z.string().optional(),
        scheduleType: z.enum(scheduleTypeEnum.enumValues).optional(),
        startDate: z
          .string()
          .regex(/^\d{4}-\d{2}-\d{2}$/)
          .optional(),
        timesLocal: z.array(z.string().regex(/^\d{2}:\d{2}$/)).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, householdId, ...updateData } = input;

      // Verify regimen exists and belongs to household
      const existing = await ctx.db
        .select({ animal: animals, regimen: regimens })
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
        action: "UPDATE",
        householdId: householdId,
        newValues: updateData,
        oldValues: existing[0]?.regimen,
        resourceId: id,
        resourceType: "regimen",
        userId: ctx.dbUser.id,
      });

      // Get the complete updated regimen with medication details
      const completeRegimen = await ctx.db
        .select({
          animal: animals,
          medication: medicationCatalog,
          regimen: regimens,
        })
        .from(regimens)
        .innerJoin(animals, eq(regimens.animalId, animals.id))
        .leftJoin(
          medicationCatalog,
          eq(regimens.medicationId, medicationCatalog.id),
        )
        .where(eq(regimens.id, id))
        .limit(1);

      return completeRegimen[0];
    }),
});
