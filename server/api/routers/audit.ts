import { and, desc, eq, gte, ilike, lte, or } from "drizzle-orm";
import { z } from "zod";
import { auditLog, users } from "@/db/schema";
import { createTRPCRouter, householdProcedure } from "@/server/api/trpc";

// Input validation schema for listing audit logs
const listAuditLogsSchema = z.object({
	householdId: z.string().uuid(),
	limit: z.number().min(1).max(100).default(50),
	offset: z.number().min(0).default(0),
	// Filters
	userId: z.string().uuid().optional(),
	action: z.string().optional(),
	resourceType: z.string().optional(),
	startDate: z.string().datetime().optional(),
	endDate: z.string().datetime().optional(),
	search: z.string().optional(), // Search in action, resourceType, or details
});

export const auditRouter = createTRPCRouter({
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
				conditions.push(
					gte(auditLog.timestamp, new Date(input.startDate).toISOString()),
				);
			}

			if (input.endDate) {
				conditions.push(
					lte(auditLog.timestamp, new Date(input.endDate).toISOString()),
				);
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
					// Audit log fields
					id: auditLog.id,
					userId: auditLog.userId,
					householdId: auditLog.householdId,
					action: auditLog.action,
					resourceType: auditLog.resourceType,
					resourceId: auditLog.resourceId,
					oldValues: auditLog.oldValues,
					newValues: auditLog.newValues,
					details: auditLog.details,
					ipAddress: auditLog.ipAddress,
					userAgent: auditLog.userAgent,
					sessionId: auditLog.sessionId,
					timestamp: auditLog.timestamp,
					// User information
					userName: users.name,
					userEmail: users.email,
				})
				.from(auditLog)
				.innerJoin(users, eq(auditLog.userId, users.id))
				.where(whereCondition)
				.orderBy(desc(auditLog.timestamp)) // Most recent first
				.limit(input.limit)
				.offset(input.offset);

			return {
				entries: result,
				total: result.length, // This is approximate for now
				hasMore: result.length === input.limit,
			};
		}),

	// Get unique action types for filtering
	getActionTypes: householdProcedure
		.input(z.object({ householdId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const result = await ctx.db
				.selectDistinct({ action: auditLog.action })
				.from(auditLog)
				.where(eq(auditLog.householdId, input.householdId))
				.orderBy(auditLog.action);

			return result
				.map((r) => r.action)
				.filter((action): action is string => !!action);
		}),

	// Get unique resource types for filtering
	getResourceTypes: householdProcedure
		.input(z.object({ householdId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const result = await ctx.db
				.selectDistinct({ resourceType: auditLog.resourceType })
				.from(auditLog)
				.where(eq(auditLog.householdId, input.householdId))
				.orderBy(auditLog.resourceType);

			return result
				.map((r) => r.resourceType)
				.filter((type): type is string => !!type);
		}),

	// Get users who have performed actions (for filtering)
	getActiveUsers: householdProcedure
		.input(z.object({ householdId: z.string().uuid() }))
		.query(async ({ ctx, input }) => {
			const result = await ctx.db
				.selectDistinct({
					userId: auditLog.userId,
					userName: users.name,
					userEmail: users.email,
				})
				.from(auditLog)
				.innerJoin(users, eq(auditLog.userId, users.id))
				.where(eq(auditLog.householdId, input.householdId))
				.orderBy(users.name);

			return result;
		}),
});
