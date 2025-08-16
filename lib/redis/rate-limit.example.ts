/**
 * Example usage of rate limiting middleware with tRPC
 * This file shows how to integrate the rate limiting system
 */

import { TRPCError } from "@trpc/server";
import { applyRateLimit, rateLimitCriticalOperation } from "./rate-limit";

// Example of adding rate limit middleware to tRPC procedures
// This would typically be added to your tRPC setup file

/*
// In your trpc setup file (e.g., server/api/trpc.ts):

import { createRateLimitMiddleware } from "@/lib/redis/rate-limit";

// Create the rate limit middleware
const rateLimitMiddleware = createRateLimitMiddleware();

// Apply to all procedures
export const rateLimitedProcedure = publicProcedure.use(rateLimitMiddleware);
export const rateLimitedProtectedProcedure = protectedProcedure.use(rateLimitMiddleware);

// Or apply selectively to specific procedures:
export const adminProcedure = protectedProcedure
  .use(rateLimitMiddleware)
  .use(({ ctx, next }) => {
    // Admin-specific logic
    if (ctx.dbUser?.role !== "ADMIN") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return next({ ctx });
  });
*/

// Example of manual rate limiting in a tRPC procedure
export const exampleAdministrationProcedure = async (input: {
  animalId: string;
  regimenId: string;
  userId: string;
}) => {
  // Apply critical rate limiting for medication administration
  const rateLimitResult = await rateLimitCriticalOperation(
    "administration",
    input.userId,
    { isAdmin: false },
  );

  if (!rateLimitResult.success) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Too many administration attempts. Try again in ${rateLimitResult.retryAfter} seconds.`,
    });
  }

  // Continue with the administration logic...
  console.log("Administration recorded successfully");
  return { success: true, remaining: rateLimitResult.remaining };
};

// Example of applying different rate limits based on operation type
export const exampleFlexibleRateLimit = async (
  operationType: "read" | "write" | "admin",
  userId: string,
  isAdmin: boolean,
) => {
  let result: Awaited<ReturnType<typeof applyRateLimit>>;

  switch (operationType) {
    case "read":
      result = await applyRateLimit("user", userId, { isAdmin });
      break;
    case "write":
      result = await applyRateLimit("authenticated", userId, { isAdmin });
      break;
    case "admin":
      result = await applyRateLimit("admin", userId, { isAdmin });
      break;
    default:
      throw new Error("Invalid operation type");
  }

  if (!result.success) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: `Rate limit exceeded for ${operationType} operation`,
    });
  }

  return result;
};

// Example of IP-based rate limiting for anonymous users
export const exampleAnonymousRateLimit = async (clientIP: string) => {
  const result = await applyRateLimit("anonymous", clientIP);

  if (!result.success) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Too many requests from this IP address",
    });
  }

  return result;
};

// Example of household-scoped rate limiting
export const exampleHouseholdRateLimit = async (
  householdId: string,
  isAdmin: boolean,
) => {
  const result = await applyRateLimit("household", householdId, { isAdmin });

  if (!result.success) {
    throw new TRPCError({
      code: "TOO_MANY_REQUESTS",
      message: "Household rate limit exceeded",
    });
  }

  return result;
};
