import { initTRPC, TRPCError } from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { eq } from "drizzle-orm";
import SuperJSON from "superjson";
import { ZodError, z } from "zod";
import { dbPooled as db } from "@/db/drizzle";
import {
  type households,
  households as householdsTable,
  type memberships,
  memberships as membershipsTable,
  type users,
  users as usersTable,
} from "@/db/schema";
import {
  defaultUserPreferences,
  defaultUserProfile,
} from "@/db/schema/user-defaults";
import { auditHelpers, logAuditEvent } from "@/lib/security/audit-logger";
import {
  createRateLimitMiddleware,
  validateRequestSize,
} from "@/lib/security/rate-limiting";
import { stackServerApp } from "@/stack/server";

// Re-export the existing context type and functions
export interface Context {
  db: typeof db;
  headers: Headers;
  requestedHouseholdId: string | null;
  stackUser: Awaited<ReturnType<typeof stackServerApp.getUser>>;
  dbUser: typeof users.$inferSelect | null;
  currentHouseholdId: string | null;
  currentMembership: typeof memberships.$inferSelect | null;
  availableHouseholds: Array<
    typeof households.$inferSelect & {
      membership: typeof memberships.$inferSelect;
    }
  >;
}

// Helper function to sync Stack user to the database
async function syncStackUserToDatabase(
  stackUser: NonNullable<Context["stackUser"]>,
) {
  try {
    const [dbUser] = await db
      .insert(usersTable)
      .values({
        createdAt: new Date(),
        email: stackUser.primaryEmail || "",
        id: crypto.randomUUID(),
        image: stackUser.profileImageUrl || null,
        name: stackUser.displayName || stackUser.primaryEmail || null,
        preferences: structuredClone(defaultUserPreferences),
        profile: structuredClone(defaultUserProfile),
        stackUserId: stackUser.id,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        set: {
          email: stackUser.primaryEmail || "",
          image: stackUser.profileImageUrl || null,
          name: stackUser.displayName || null,
          updatedAt: new Date(),
        },
        target: usersTable.stackUserId,
      })
      .returning();

    return dbUser;
  } catch (error) {
    console.error("Error syncing Stack user to database:", error);
    throw error;
  }
}

// Helper function to get user's households
async function getUserHouseholds(userId: string) {
  const householdsWithMemberships = await db
    .select({
      household: householdsTable,
      membership: membershipsTable,
    })
    .from(membershipsTable)
    .innerJoin(
      householdsTable,
      eq(householdsTable.id, membershipsTable.householdId),
    )
    .where(eq(membershipsTable.userId, userId));

  return householdsWithMemberships.map(({ household, membership }) => ({
    ...household,
    membership,
  }));
}

// Create a context function for Next.js App Router with Stack Auth
export const createTRPCContext = async (
  opts: FetchCreateContextFnOptions,
): Promise<Context> => {
  const requestedHouseholdId = opts.req.headers.get("x-household-id") || null;
  const stackUser = await stackServerApp.getUser();

  const baseContext = {
    availableHouseholds: [] as Context["availableHouseholds"],
    currentHouseholdId: null as string | null,
    currentMembership: null as typeof memberships.$inferSelect | null,
    db,
    dbUser: null as typeof users.$inferSelect | null,
    headers: opts.req.headers,
    requestedHouseholdId,
    stackUser,
  };

  if (!stackUser) {
    return baseContext;
  }

  try {
    const dbUser = await syncStackUserToDatabase(stackUser);
    if (!dbUser) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to sync user to database",
      });
    }

    const availableHouseholds = await getUserHouseholds(dbUser.id);

    let currentHouseholdId = null;
    let currentMembership = null;

    if (requestedHouseholdId) {
      const requestedHousehold = availableHouseholds.find(
        (h) => h.id === requestedHouseholdId,
      );
      if (requestedHousehold) {
        currentHouseholdId = requestedHousehold.id;
        currentMembership = requestedHousehold.membership;
      }
    }

    if (!currentHouseholdId && availableHouseholds.length > 0) {
      const firstHousehold = availableHouseholds[0];
      if (firstHousehold) {
        currentHouseholdId = firstHousehold.id;
        currentMembership = firstHousehold.membership;
      }
    }

    return {
      ...baseContext,
      availableHouseholds,
      currentHouseholdId,
      currentMembership,
      dbUser,
    };
  } catch (error) {
    console.error("Error setting up user context:", error);
    return baseContext;
  }
};

// Initialize tRPC with enhanced security
const t = initTRPC.context<Context>().create({
  errorFormatter({ shape, error, path }) {
    console.error("tRPC Error:", {
      cause: error.cause,
      error: error.message,
      path,
    });

    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? z.treeifyError(error.cause) : null,
      },
    };
  },
  transformer: SuperJSON,
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

// Security middleware stack
const rateLimitMiddleware = createRateLimitMiddleware();
const requestSizeMiddleware = validateRequestSize(2 * 1024 * 1024); // 2MB limit for medical uploads

// Enhanced audit middleware with security context
const auditMiddleware = t.middleware(async ({ ctx, next, path, type }) => {
  const startTime = Date.now();
  const actionMap: Record<string, "READ" | "UPDATE"> = {
    mutation: "UPDATE",
    query: "READ",
    subscription: "READ",
  };
  const action = actionMap[type] ?? "READ";
  const userId = ctx.dbUser?.id ?? undefined;

  // Extract IP for security logging
  const clientIp =
    ctx.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  try {
    const result = await next();
    await logAuditEvent({
      action,
      clientIp,
      duration: Date.now() - startTime,
      endpoint: `${type}.${path}`,
      resourceType: "SYSTEM",
      success: true,
      timestamp: new Date(),
      userId,
    });
    return result;
  } catch (error) {
    // Enhanced error logging with security context
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";

    // Check for potential security issues
    if (error instanceof TRPCError) {
      if (error.code === "TOO_MANY_REQUESTS") {
        await auditHelpers.logThreat(
          "rate_limit_triggered",
          "medium",
          clientIp,
          userId,
          {
            endpoint: `${type}.${path}`,
            errorCode: error.code,
          },
        );
      } else if (error.code === "UNAUTHORIZED") {
        await auditHelpers.logThreat(
          "unauthorized_access_attempt",
          "high",
          clientIp,
          userId,
          {
            endpoint: `${type}.${path}`,
            reason: errorMessage,
          },
        );
      }
    }

    await logAuditEvent({
      action,
      clientIp,
      duration: Date.now() - startTime,
      endpoint: `${type}.${path}`,
      errorMessage,
      resourceType: "SYSTEM",
      success: false,
      timestamp: new Date(),
      userId,
    });
    throw error;
  }
});

// Security-enhanced base procedures

// Public procedure with rate limiting and request size validation
export const publicProcedure = t.procedure
  .use(requestSizeMiddleware)
  .use(rateLimitMiddleware)
  .use(auditMiddleware);

// Protected procedure with enhanced security
export const protectedProcedure = t.procedure
  .use(requestSizeMiddleware)
  .use(rateLimitMiddleware)
  .use(auditMiddleware)
  .use(async ({ ctx, next }) => {
    if (!ctx.stackUser || !ctx.dbUser) {
      const clientIp = ctx.headers
        ?.get?.("x-forwarded-for")
        ?.split(",")[0]
        ?.trim();

      await auditHelpers.logThreat(
        "unauthorized_access_attempt",
        "high",
        clientIp,
        undefined,
        { reason: "missing_authentication" },
      );

      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "You must be logged in to perform this action",
      });
    }

    return next({
      ctx: {
        ...ctx,
        dbUser: ctx.dbUser,
        stackUser: ctx.stackUser,
      },
    });
  });

// Household-scoped procedure with security validation
export const householdProcedure = protectedProcedure.use(
  async ({ ctx, next, input }) => {
    const householdId =
      (input as { householdId?: string })?.householdId ||
      ctx.currentHouseholdId ||
      ctx.requestedHouseholdId;

    if (!householdId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "householdId is required",
      });
    }

    let membership = ctx.currentMembership;

    if (householdId !== ctx.currentHouseholdId) {
      const householdMembership = ctx.availableHouseholds.find(
        (h) => h.id === householdId,
      );

      if (!householdMembership) {
        // Log unauthorized household access attempt
        const clientIp = ctx.headers
          ?.get?.("x-forwarded-for")
          ?.split(",")[0]
          ?.trim();

        await auditHelpers.logThreat(
          "unauthorized_household_access",
          "high",
          clientIp,
          ctx.dbUser.id,
          {
            availableHouseholds: ctx.availableHouseholds.length,
            requestedHouseholdId: householdId,
          },
        );

        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You are not a member of this household",
        });
      }

      membership = householdMembership.membership;
    }

    if (!membership) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You are not a member of this household",
      });
    }

    return next({
      ctx: {
        ...ctx,
        householdId,
        membership,
      },
    });
  },
);

// Owner-only procedure with privilege escalation detection
export const ownerProcedure = householdProcedure.use(async ({ ctx, next }) => {
  if (ctx.membership.role !== "OWNER") {
    // Log privilege escalation attempt
    const clientIp = ctx.headers
      ?.get?.("x-forwarded-for")
      ?.split(",")[0]
      ?.trim();

    await auditHelpers.logThreat(
      "privilege_escalation_attempt",
      "high",
      clientIp,
      ctx.dbUser.id,
      {
        currentRole: ctx.membership.role,
        householdId: ctx.householdId,
        requiredRole: "OWNER",
      },
    );

    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be a household owner to perform this action",
    });
  }

  return next({ ctx });
});

// Administrative procedure with enhanced security
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  // Check if user has admin privileges (implement admin role logic)
  const membershipRole = ctx.currentMembership?.role;
  const isAdmin =
    membershipRole === "OWNER" ||
    ctx.availableHouseholds.some(
      (household) => household.membership.role === "OWNER",
    );

  if (!isAdmin) {
    const clientIp = ctx.headers
      ?.get?.("x-forwarded-for")
      ?.split(",")[0]
      ?.trim();

    await auditHelpers.logThreat(
      "admin_access_attempt",
      "high",
      clientIp,
      ctx.dbUser?.id,
      {
        requiredRole: "admin",
        userRole: membershipRole || "user",
      },
    );

    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Administrative privileges required",
    });
  }

  return next({ ctx });
});

// Export types
export type AppRouter = ReturnType<typeof createTRPCRouter>;
