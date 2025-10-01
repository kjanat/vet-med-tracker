import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import {
  vetmedAnimals as animals,
  vetmedRegimens as regimens,
} from "@/db/schema";
// import { householdIdInput } from "@/lib/utils/validation-helpers";
import { createTRPCRouter, householdProcedure } from "../trpc";

// Alias router for backward compatibility
export const regimenRouter = createTRPCRouter({
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
});
