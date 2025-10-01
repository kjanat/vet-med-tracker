import { TRPCError } from "@trpc/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { vetmedAnimals as animals } from "@/db/schema";
import {
  calculateComplianceData,
  getNotableEvents,
  getRegimenSummaries,
} from "@/lib/services/reportHelpers";
import { createTRPCRouter, householdProcedure } from "../trpc";

export const reportsRouter = createTRPCRouter({
  animalReport: householdProcedure
    .input(
      z.object({
        animalId: z.uuid(),
        endDate: z.iso.datetime().optional(), // Updated to use z.iso.datetime()
        householdId: z.uuid(),
        startDate: z.iso.datetime().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const animal = await ctx.db
        .select({
          allergies: animals.allergies,
          breed: animals.breed,
          conditions: animals.conditions,
          id: animals.id,
          name: animals.name,
          photoUrl: animals.photoUrl,
          species: animals.species,
          timezone: animals.timezone,
          weightKg: animals.weightKg,
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

      const endDate = input.endDate ? new Date(input.endDate) : new Date();
      const startDate = input.startDate
        ? new Date(input.startDate)
        : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);

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
          allergies: animal[0].allergies || [],
          breed: animal[0].breed || undefined,
          conditions: animal[0].conditions || [],
          pendingMeds: regimens.filter((r) => r.adherence < 90).length,
          weightKg: animal[0].weightKg ? Number(animal[0].weightKg) : undefined,
        },
        compliance: complianceData,
        notableEvents,
        regimens,
        reportPeriod: {
          from: startDate,
          to: endDate,
        },
      };
    }),
});
