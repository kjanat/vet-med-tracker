import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  vetmedAnimals as animals,
  vetmedMedicationCatalog as medicationCatalog,
  type NewRegimen,
  vetmedRegimens as regimens,
  vetmedScheduleType as scheduleTypeEnum,
} from "@/db/schema";
import {
  softDeleteValue,
  validateMutationResult,
} from "@/lib/utils/crud-operations";
import {
  validateArrayLength,
  validateRequiredFields,
} from "@/lib/utils/validation-helpers";
import { createAuditLog } from "@/server/utils/audit-log";
import { createTRPCRouter, householdProcedure } from "../trpc";

export const regimensRouter = createTRPCRouter({
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

      // Use validation helpers for cleaner validation logic
      validateRequiredFields(
        input,
        input.medicationId ? [] : ["medicationName"],
        "Regimen",
      );

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

      // Validate schedule-specific requirements based on type
      if (input.scheduleType === "FIXED") {
        validateArrayLength(
          input.timesLocal,
          { min: 1 },
          "FIXED schedule times",
        );
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
        endDate: input.endDate ? new Date(input.endDate) : undefined,
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
        startDate: new Date(input.startDate),
        timesLocal: input.timesLocal,
      };

      const result = await ctx.db
        .insert(regimens)
        .values(newRegimen)
        .returning();

      await createAuditLog(ctx.db, {
        action: "CREATE",
        householdId: input.householdId,
        newValues: newRegimen,
        resourceId: result[0]?.id,
        resourceType: "regimen",
        userId: ctx.dbUser.id,
      });

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

  delete: householdProcedure
    .input(
      z.object({
        householdId: z.uuid(),
        id: z.uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
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

      validateMutationResult(existing, "Regimen");

      const result = await ctx.db
        .update(regimens)
        .set(softDeleteValue())
        .where(eq(regimens.id, input.id))
        .returning();

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

      // Add computed isPRN property
      return result.map((row) => ({
        ...row,
        isPRN: row.regimen.scheduleType === "PRN",
      }));
    }),

  listDue: householdProcedure
    .input(
      z.object({
        householdId: z.uuid(),
        includeUpcoming: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Simplified implementation - return all active regimens
      const result = await ctx.db
        .select({
          animal: animals,
          regimen: regimens,
        })
        .from(regimens)
        .innerJoin(animals, eq(regimens.animalId, animals.id))
        .where(
          and(
            eq(animals.householdId, input.householdId),
            eq(regimens.active, true),
            isNull(regimens.deletedAt),
          ),
        )
        .orderBy(regimens.name);

      // Add computed isPRN property
      return result.map((row) => ({
        ...row,
        isPRN: row.regimen.scheduleType === "PRN",
      }));
    }),

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
      const { id, householdId, ...rawUpdateData } = input;

      const {
        startDate: rawStartDate,
        endDate: rawEndDate,
        ...otherData
      } = rawUpdateData;

      const updateData = {
        ...otherData,
        ...(rawStartDate && {
          startDate: new Date(rawStartDate),
        }),
        ...(rawEndDate && {
          endDate: new Date(rawEndDate),
        }),
      };

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

      await ctx.db
        .update(regimens)
        .set({
          ...updateData,
        })
        .where(eq(regimens.id, id))
        .returning();

      await createAuditLog(ctx.db, {
        action: "UPDATE",
        householdId: householdId,
        newValues: updateData,
        oldValues: existing[0]?.regimen,
        resourceId: id,
        resourceType: "regimen",
        userId: ctx.dbUser.id,
      });

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
