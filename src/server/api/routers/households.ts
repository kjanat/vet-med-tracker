import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
  // vetmedAnimals as animals,
  vetmedHouseholds as households,
  vetmedMemberships as memberships,
  vetmedUsers as users,
} from "@/db/schema";
import {
  cleanUndefinedValues,
  validateMutationResult,
} from "@/lib/utils/crud-operations";
import { householdIdInput } from "@/lib/utils/validation-helpers";
import {
  createTRPCRouter,
  householdProcedure,
  protectedProcedure,
} from "../trpc";

export const householdsRouter = createTRPCRouter({
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        timezone: z.string().default("UTC"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const newHousehold = await ctx.db
        .insert(households)
        .values(input)
        .returning();

      const household = validateMutationResult(newHousehold, "Household");

      // Create membership for the owner
      await ctx.db.insert(memberships).values({
        householdId: household.id,
        role: "OWNER",
        userId: ctx.dbUser.id,
      });

      return household;
    }),

  get: protectedProcedure
    .input(householdIdInput)
    .query(async ({ ctx, input }) => {
      const household = ctx.availableHouseholds.find(
        (h) => h.id === input.householdId,
      );
      if (!household) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Household not found or access denied",
        });
      }
      return household;
    }),

  getMembers: protectedProcedure
    .input(householdIdInput)
    .query(async ({ ctx, input }) => {
      return ctx.db
        .select({
          id: memberships.id,
          joinedAt: memberships.createdAt,
          role: memberships.role,
          user: {
            email: users.email,
            id: users.id,
            image: users.image,
            name: users.name,
          },
        })
        .from(memberships)
        .innerJoin(users, eq(memberships.userId, users.id))
        .where(eq(memberships.householdId, input.householdId));
    }),

  getMembership: protectedProcedure
    .input(householdIdInput)
    .query(async ({ ctx, input }) => {
      const membership = await ctx.db
        .select()
        .from(memberships)
        .where(
          and(
            eq(memberships.householdId, input.householdId),
            eq(memberships.userId, ctx.dbUser.id),
          ),
        )
        .limit(1);

      return membership[0] || null;
    }),

  getMemberships: protectedProcedure.query(async ({ ctx }) => {
    return ctx.availableHouseholds;
  }),

  leave: protectedProcedure
    .input(householdIdInput)
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(memberships)
        .where(
          and(
            eq(memberships.householdId, input.householdId),
            eq(memberships.userId, ctx.dbUser.id),
          ),
        );
      return { success: true };
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.availableHouseholds;
  }),

  update: householdProcedure
    .input(
      z.object({
        id: z.uuid(),
        name: z.string().min(1).optional(),
        timezone: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const cleanData = cleanUndefinedValues(updateData);

      const updated = await ctx.db
        .update(households)
        .set(cleanData)
        .where(eq(households.id, id))
        .returning();

      return validateMutationResult(updated, "Household");
    }),
});
