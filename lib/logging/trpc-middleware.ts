import type { TRPCError } from "@trpc/server";
import { Logger, type LoggingContext, LogLevel, logger } from "./logger";

/**
 * tRPC logging middleware configuration
 */
export interface TRPCLoggingConfig {
  logRequests: boolean;
  logResponses: boolean;
  logErrors: boolean;
  logPerformance: boolean;
  excludePaths?: string[];
  maxPayloadSize?: number;
  sensitiveInputs?: string[];
}

/**
 * Default tRPC logging configuration
 */
const DEFAULT_TRPC_CONFIG: TRPCLoggingConfig = {
  logRequests: true,
  logResponses: false, // Can be verbose, enable as needed
  logErrors: true,
  logPerformance: true,
  excludePaths: ["/health", "/ping"],
  maxPayloadSize: 1000, // Truncate large payloads
  sensitiveInputs: ["password", "token", "secret"],
};

/**
 * Request/Response logging utilities
 */
class TRPCLogHelper {
  private config: TRPCLoggingConfig;

  constructor(config: TRPCLoggingConfig) {
    this.config = config;
  }

  /**
   * Check if path should be excluded from logging
   */
  shouldExcludePath(path: string): boolean {
    return (
      this.config.excludePaths?.some((excludePath) =>
        path.includes(excludePath),
      ) ?? false
    );
  }

  /**
   * Sanitize input for logging
   */
  sanitizeInput(input: unknown): unknown {
    if (!input || typeof input !== "object") {
      return input;
    }

    const sanitized = { ...(input as Record<string, unknown>) };

    for (const sensitiveKey of this.config.sensitiveInputs || []) {
      if (sensitiveKey in sanitized) {
        sanitized[sensitiveKey] = "***";
      }
    }

    return this.truncatePayload(sanitized);
  }

  /**
   * Truncate large payloads
   */
  truncatePayload(payload: unknown): unknown {
    if (!this.config.maxPayloadSize) {
      return payload;
    }

    const serialized = JSON.stringify(payload);
    if (serialized.length <= this.config.maxPayloadSize) {
      return payload;
    }

    return {
      _truncated: true,
      _originalSize: serialized.length,
      _preview: serialized.substring(0, this.config.maxPayloadSize - 100),
    };
  }

  /**
   * Format tRPC error for logging
   */
  formatTRPCError(error: TRPCError, path: string) {
    return {
      name: error.name,
      message: error.message,
      code: error.code,
      cause: error.cause,
      path,
      stack: error.stack,
    };
  }
}

/**
 * Create tRPC logging middleware
 */
export function createTRPCLoggingMiddleware(
  config: Partial<TRPCLoggingConfig> = {},
) {
  const finalConfig = { ...DEFAULT_TRPC_CONFIG, ...config };
  const logHelper = new TRPCLogHelper(finalConfig);

  // Helper function to update context with user information
  function updateContextWithUserInfo<TContext extends { headers?: Headers }>(
    ctx: TContext,
    correlationId: string,
  ): void {
    // Update context with user information if available
    if (
      "auth" in ctx &&
      ctx.auth &&
      typeof ctx.auth === "object" &&
      "userId" in ctx.auth
    ) {
      logger.updateContext(correlationId, {
        userId: (ctx.auth as { userId: string }).userId,
      });
    }

    if ("householdId" in ctx && typeof ctx.householdId === "string") {
      logger.updateContext(correlationId, {
        householdId: ctx.householdId,
      });
    }
  }

  // Helper function to log successful response
  async function logSuccessfulResponse(
    type: string,
    path: string,
    result: { data: unknown },
    performance: { duration: number; memoryUsage?: NodeJS.MemoryUsage },
    correlationId: string,
  ): Promise<void> {
    if (finalConfig.logPerformance) {
      await logger.withPerformance(
        LogLevel.INFO,
        `tRPC ${type} completed: ${path}`,
        performance,
        {
          success: true,
          type,
          path,
          ...(finalConfig.logResponses && {
            output: logHelper.truncatePayload(result.data),
          }),
        },
        correlationId,
      );
    } else if (finalConfig.logResponses) {
      await logger.info(
        `tRPC ${type} completed: ${path}`,
        {
          success: true,
          type,
          path,
          duration: performance.duration,
          output: logHelper.truncatePayload(result.data),
        },
        correlationId,
      );
    }
  }

  // Helper function to log errors
  async function logError(
    error: unknown,
    type: string,
    path: string,
    input: unknown,
    performance: { duration: number },
    correlationId: string,
  ): Promise<void> {
    if (!finalConfig.logErrors) return;

    const isTRPCError = error && typeof error === "object" && "code" in error;

    if (isTRPCError) {
      await logger.error(
        `tRPC ${type} error: ${path}`,
        logHelper.formatTRPCError(error as TRPCError, path),
        {
          type,
          path,
          duration: performance.duration,
          input: logHelper.sanitizeInput(input),
        },
        correlationId,
      );
    } else {
      await logger.error(
        `tRPC ${type} unexpected error: ${path}`,
        error instanceof Error ? error : new Error(String(error)),
        {
          type,
          path,
          duration: performance.duration,
          input: logHelper.sanitizeInput(input),
        },
        correlationId,
      );
    }
  }

  return async function loggingMiddleware<
    TContext extends { headers?: Headers },
  >({
    ctx,
    next,
    path,
    type,
    input,
  }: {
    ctx: TContext;
    next: () => Promise<{ data: unknown; ctx: TContext }>;
    path: string;
    type: "query" | "mutation" | "subscription";
    input: unknown;
    getRawInput?: () => Promise<unknown>;
  }) {
    // Skip excluded paths
    if (logHelper.shouldExcludePath(path)) {
      return next();
    }

    // Create or extract correlation ID
    let correlationId: string;
    try {
      correlationId =
        ctx.headers?.get?.("x-correlation-id") ||
        Logger.generateCorrelationId();
    } catch {
      correlationId = Logger.generateCorrelationId();
    }

    // Create logging context
    const _loggingContext = await logger.createContext(`trpc.${path}`, {
      type,
      path,
      trpc: true,
    });

    // Update context with user information
    updateContextWithUserInfo(ctx, correlationId);

    // Start performance tracking
    const tracker = logger.startPerformanceTracking();

    try {
      // Log incoming request
      if (finalConfig.logRequests) {
        await logger.info(
          `tRPC ${type} request: ${path}`,
          {
            input: logHelper.sanitizeInput(input),
            type,
            path,
          },
          correlationId,
        );
      }

      // Execute the procedure
      const result = await next();

      // Get performance metrics
      const performance = tracker.getMetrics();

      // Log successful response
      await logSuccessfulResponse(
        type,
        path,
        result,
        performance,
        correlationId,
      );

      return result;
    } catch (error) {
      // Get performance metrics for failed request
      const performance = tracker.getMetrics();

      // Log error
      await logError(error, type, path, input, performance, correlationId);

      // Re-throw the error
      throw error;
    } finally {
      // Clean up context
      logger.cleanupContext(correlationId);
    }
  };
}

/**
 * Middleware for request/response logging in tRPC context
 */
export const trpcLoggingMiddleware = createTRPCLoggingMiddleware();

/**
 * Enhanced tRPC context that includes logging context
 */
export interface EnhancedTRPCContext {
  loggingContext?: LoggingContext;
}

/**
 * Helper to get or create logging context from tRPC context
 */
export async function getTRPCLoggingContext(
  ctx: {
    auth?: { userId: string };
    householdId?: string;
    loggingContext?: LoggingContext;
  },
  operation?: string,
): Promise<LoggingContext> {
  // Check if logging context already exists
  if (ctx.loggingContext) {
    return ctx.loggingContext;
  }

  // Create new context
  const loggingContext = await logger.createContext(operation, {
    trpc: true,
  });

  // Extract user information from tRPC context
  if (ctx.auth?.userId) {
    logger.updateContext(loggingContext.correlationId, {
      userId: ctx.auth.userId,
    });
  }

  if (ctx.householdId) {
    logger.updateContext(loggingContext.correlationId, {
      householdId: ctx.householdId,
    });
  }

  // Store context for reuse
  ctx.loggingContext = loggingContext;

  return loggingContext;
}

/**
 * Helper to log database operations within tRPC procedures
 */
export async function logDatabaseOperation<T>(
  ctx: {
    auth?: { userId: string };
    householdId?: string;
    loggingContext?: LoggingContext;
  },
  operation: string,
  tableName: string,
  fn: () => Promise<T>,
): Promise<T> {
  const loggingContext = await getTRPCLoggingContext(
    ctx,
    `db.${operation}.${tableName}`,
  );

  return logger.trackOperation(
    `db.${operation}.${tableName}`,
    async () => {
      const result = await fn();

      // Log successful database operation
      await logger.debug(
        `Database ${operation} completed`,
        {
          table: tableName,
          operation,
          hasResult: result !== null && result !== undefined,
        },
        loggingContext.correlationId,
      );

      return result;
    },
    loggingContext.correlationId,
  );
}

/**
 * Helper to log external API calls within tRPC procedures
 */
export async function logExternalAPICall<T>(
  ctx: {
    auth?: { userId: string };
    householdId?: string;
    loggingContext?: LoggingContext;
  },
  serviceName: string,
  endpoint: string,
  fn: () => Promise<T>,
): Promise<T> {
  const loggingContext = await getTRPCLoggingContext(ctx, `api.${serviceName}`);

  return logger.trackOperation(
    `api.${serviceName}.${endpoint}`,
    async () => {
      const result = await fn();

      await logger.info(
        `External API call completed`,
        {
          service: serviceName,
          endpoint,
          hasResult: result !== null && result !== undefined,
        },
        loggingContext.correlationId,
      );

      return result;
    },
    loggingContext.correlationId,
  );
}
