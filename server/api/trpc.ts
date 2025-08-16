import { initTRPC, TRPCError } from "@trpc/server";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { eq } from "drizzle-orm";
import superjson from "superjson";
import { ZodError } from "zod";
import { dbPooled as db } from "@/db/drizzle";
import type { households, memberships, users } from "@/db/schema";
import {
  households as householdsTable,
  memberships as membershipsTable,
  users as usersTable,
} from "@/db/schema";
import { createTRPCConnectionMiddleware } from "@/lib/infrastructure/connection-middleware";
import {
  createEnhancedError,
  setupGlobalErrorHandling,
  toUserFriendlyError,
} from "@/lib/infrastructure/error-handling";
import {
  auditHelpers,
  createAuditMiddleware,
} from "@/lib/security/audit-logger";
import { stackServerApp } from "@/stack";

// Context type definition
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
    // Upsert user in database
    // Only sync essential fields from Stack Auth
    // Users can manually fill in firstName, lastName, and other profile details
    const [dbUser] = await db
      .insert(usersTable)
      .values({
        id: crypto.randomUUID(),
        stackUserId: stackUser.id,
        email: stackUser.primaryEmail || "",
        name: stackUser.displayName || null,
        // Don't auto-populate firstName/lastName - let users choose
        firstName: null,
        lastName: null,
        image: stackUser.profileImageUrl || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: usersTable.stackUserId,
        set: {
          email: stackUser.primaryEmail || "",
          name: stackUser.displayName || null,
          // Don't overwrite existing firstName/lastName if the user has set them
          image: stackUser.profileImageUrl || null,
          updatedAt: new Date().toISOString(),
        },
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
  // Extract householdId from headers (sent by the frontend)
  const requestedHouseholdId = opts.req.headers.get("x-household-id") || null;

  // Get Stack Auth user
  const stackUser = await stackServerApp.getUser();

  // Initialize empty context
  const baseContext = {
    db,
    headers: opts.req.headers,
    requestedHouseholdId,
    stackUser,
    dbUser: null as typeof users.$inferSelect | null,
    currentHouseholdId: null as string | null,
    currentMembership: null as typeof memberships.$inferSelect | null,
    availableHouseholds: [] as Context["availableHouseholds"],
  };

  // If the user is not authenticated, return base context
  if (!stackUser) {
    return baseContext;
  }

  try {
    // Sync user to database and get user data
    const dbUser = await syncStackUserToDatabase(stackUser);
    if (!dbUser) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to sync user to database",
      });
    }

    // Get user's households
    const availableHouseholds = await getUserHouseholds(dbUser.id);

    // Determine current household
    let currentHouseholdId = null;
    let currentMembership = null;

    if (requestedHouseholdId) {
      // Use requested household if user has access
      const requestedHousehold = availableHouseholds.find(
        (h) => h.id === requestedHouseholdId,
      );
      if (requestedHousehold) {
        currentHouseholdId = requestedHousehold.id;
        currentMembership = requestedHousehold.membership;
      }
    }

    // Fall back to the first available household
    if (!currentHouseholdId && availableHouseholds.length > 0) {
      const firstHousehold = availableHouseholds[0];
      if (firstHousehold) {
        currentHouseholdId = firstHousehold.id;
        currentMembership = firstHousehold.membership;
      }
    }

    return {
      ...baseContext,
      dbUser,
      availableHouseholds,
      currentHouseholdId,
      currentMembership,
    };
  } catch (error) {
    console.error("Error setting up user context:", error);
    // Return base context if sync fails
    return baseContext;
  }
};

// Setup global error handling
setupGlobalErrorHandling();

// Initialize tRPC with Stack context and enhanced error handling
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error, path }) {
    // Create enhanced error for reporting
    const enhancedError = createEnhancedError(error, {
      endpoint: "trpc",
      operation: path || "unknown",
    });

    // Report error for monitoring
    console.error("Error:", enhancedError);

    // Convert to user-friendly error
    const userFriendlyError = toUserFriendlyError(error);

    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
        userFriendly: {
          message: userFriendlyError.userMessage,
          suggestedActions: userFriendlyError.suggestedActions,
          retryable: userFriendlyError.retryable,
          retryAfter: userFriendlyError.retryAfter,
          degraded: userFriendlyError.degradedMode,
          contactSupport: userFriendlyError.contactSupport,
        },
        errorId: enhancedError.id,
      },
    };
  },
});

// Export router and procedure helpers
export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;

// Connection middleware for tRPC procedures
const connectionMiddleware = createTRPCConnectionMiddleware();

// Audit middleware for security logging
const auditMiddleware = createAuditMiddleware();

// Base procedures
export const publicProcedure = t.procedure
  .use(connectionMiddleware)
  .use(auditMiddleware);

// Protected procedure - requires Stack authentication
export const protectedProcedure = t.procedure
  .use(connectionMiddleware)
  .use(auditMiddleware)
  .use(async ({ ctx, next }) => {
    if (!ctx.stackUser || !ctx.dbUser) {
      // Log failed authentication attempt
      const clientIp = ctx.headers
        ?.get?.("x-forwarded-for")
        ?.split(",")[0]
        ?.trim();
      await auditHelpers.logThreat(
        "unauthorized_access_attempt",
        "medium",
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
        // TypeScript now knows these are non-null
        stackUser: ctx.stackUser,
        dbUser: ctx.dbUser,
      },
    });
  });

// Household-scoped procedure - requires household membership
export const householdProcedure = protectedProcedure.use(
  async ({ ctx, next, input }) => {
    // Get householdId from input, context, or headers
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

    // Check if user has membership in this household
    let membership = ctx.currentMembership;

    // If the requested household is different from current context, verify membership
    if (householdId !== ctx.currentHouseholdId) {
      const householdMembership = ctx.availableHouseholds.find(
        (h) => h.id === householdId,
      );

      if (!householdMembership) {
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

// Owner-only procedure - requires OWNER role in household
export const ownerProcedure = householdProcedure.use(async ({ ctx, next }) => {
  if (ctx.membership.role !== "OWNER") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You must be a household owner to perform this action",
    });
  }

  return next({ ctx });
});

// Export types
export type AppRouter = ReturnType<typeof createTRPCRouter>;
