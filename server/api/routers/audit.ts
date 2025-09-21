import { and, desc, eq, gte, ilike, lte, or } from "drizzle-orm";

import { z } from "zod";
import { auditLog, users } from "@/db/schema";
import { createTRPCRouter, householdProcedure } from "@/server/api/trpc";

// Input validation schema for listing audit logs
const listAuditLogsSchema = z.object({
  action: z.string().optional(),
  endDate: z.iso.datetime().optional(),
  householdId: z.uuid(),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
  resourceType: z.string().optional(),
  search: z.string().optional(), // Search in action, resourceType, or details
  startDate: z.iso.datetime().optional(),
  // Filters
  userId: z.uuid().optional(),
});

export const auditRouter = createTRPCRouter({
  // Get unique action types for filtering
  getActionTypes: householdProcedure
    .input(z.object({ householdId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db
        .selectDistinct({ action: auditLog.action })
        .from(auditLog)
        .where(eq(auditLog.householdId, input.householdId))
        .orderBy(auditLog.action);

      return result
        .map((r) => r.action)
        .filter((action): action is string => Boolean(action));
    }),

  // Get users who have performed actions (for filtering)
  getActiveUsers: householdProcedure
    .input(z.object({ householdId: z.uuid() }))
    .query(async ({ ctx, input }) =>
      ctx.db
        .selectDistinct({
          userEmail: users.email,
          userId: auditLog.userId,
          userName: users.name,
        })
        .from(auditLog)
        .innerJoin(users, eq(auditLog.userId, users.id))
        .where(eq(auditLog.householdId, input.householdId))
        .orderBy(users.name),
    ),

  // Get unique resource types for filtering
  getResourceTypes: householdProcedure
    .input(z.object({ householdId: z.uuid() }))
    .query(async ({ ctx, input }) => {
      const result = await ctx.db
        .selectDistinct({ resourceType: auditLog.resourceType })
        .from(auditLog)
        .where(eq(auditLog.householdId, input.householdId))
        .orderBy(auditLog.resourceType);

      return result
        .map((r) => r.resourceType)
        .filter((type): type is string => Boolean(type));
    }),
  // List audit logs for a household with filtering and pagination
  list: householdProcedure
    .input(listAuditLogsSchema)
    .query(async ({ ctx, input }) => {
      const conditions = [eq(auditLog.householdId, input.householdId)];

      // Apply filters
      if (input.userId) {
        conditions.push(eq(auditLog.userId, input.userId));
      }

      if (input.action) {
        conditions.push(eq(auditLog.action, input.action));
      }

      if (input.resourceType) {
        conditions.push(eq(auditLog.resourceType, input.resourceType));
      }

      if (input.startDate) {
        conditions.push(gte(auditLog.timestamp, new Date(input.startDate)));
      }

      if (input.endDate) {
        conditions.push(lte(auditLog.timestamp, new Date(input.endDate)));
      }

      // Search functionality
      if (input.search) {
        const searchTerm = `%${input.search}%`;
        const searchCondition = or(
          ilike(auditLog.action, searchTerm),
          ilike(auditLog.resourceType, searchTerm),
        );
        if (searchCondition) {
          conditions.push(searchCondition);
        }
      }

      const whereCondition =
        conditions.length > 0 ? and(...conditions) : undefined;

      const result = await ctx.db
        .select({
          action: auditLog.action,
          details: auditLog.details,
          householdId: auditLog.householdId,
          // Audit log fields
          id: auditLog.id,
          ipAddress: auditLog.ipAddress,
          newValues: auditLog.newValues,
          oldValues: auditLog.oldValues,
          resourceId: auditLog.resourceId,
          resourceType: auditLog.resourceType,
          sessionId: auditLog.sessionId,
          timestamp: auditLog.timestamp,
          userAgent: auditLog.userAgent,
          userEmail: users.email,
          userId: auditLog.userId,
          // User information
          userName: users.name,
        })
        .from(auditLog)
        .innerJoin(users, eq(auditLog.userId, users.id))
        .where(whereCondition)
        .orderBy(desc(auditLog.timestamp)) // Most recent first
        .limit(input.limit)
        .offset(input.offset);

      return {
        entries: result,
        hasMore: result.length === input.limit,
        total: result.length, // This is approximate for now
      };
    }),
});
