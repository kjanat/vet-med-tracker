import { eq } from "drizzle-orm";
import {
  vetmedHouseholds as households,
  vetmedMemberships as memberships,
} from "@/db/schema";
import { createTRPCRouter, protectedProcedure } from "../trpc";

export const householdRouter = createTRPCRouter({
  list: protectedProcedure.query(async ({ ctx }) => {
    const userMemberships = await ctx.db
      .select({
        household: {
          createdAt: households.createdAt,
          id: households.id,
          name: households.name,
          timezone: households.timezone,
        },
        id: memberships.id,
        joinedAt: memberships.createdAt,
        role: memberships.role,
      })
      .from(memberships)
      .innerJoin(households, eq(memberships.householdId, households.id))
      .where(eq(memberships.userId, ctx.dbUser.id));

    return userMemberships.map((membership) => ({
      ...membership.household,
      membership: {
        id: membership.id,
        joinedAt: membership.joinedAt,
        role: membership.role,
      },
    }));
  }),
});
