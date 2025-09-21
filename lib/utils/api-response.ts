/**
 * Standardized API response formatting utilities for consistent API responses
 * across all tRPC routers
 */

import { TRPCError } from "@trpc/server";

/**
 * Standard success response interface
 */
export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    version?: string;
    requestId?: string;
  };
}

/**
 * Standard error response interface (handled by tRPC)
 */
export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    timestamp: string;
    version?: string;
    requestId?: string;
  };
}

/**
 * Paginated response interface
 */
export interface PaginatedResponse<T = unknown> {
  success: true;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
  meta?: {
    timestamp: string;
    version?: string;
    requestId?: string;
  };
}

/**
 * CRUD operation result interface
 */
export interface CrudOperationResponse<T = unknown> {
  success: true;
  data: T;
  operation: {
    type: "CREATE" | "READ" | "UPDATE" | "DELETE";
    resource: string;
    affected: number;
  };
  meta?: {
    timestamp: string;
    version?: string;
    requestId?: string;
  };
}

/**
 * Bulk operation result interface
 */
export interface BulkOperationResponse<T = unknown> {
  success: true;
  data: T[];
  operation: {
    type: "BULK_CREATE" | "BULK_UPDATE" | "BULK_DELETE";
    resource: string;
    processed: number;
    succeeded: number;
    failed: number;
    errors?: Array<{ index: number; error: string }>;
  };
  meta?: {
    timestamp: string;
    version?: string;
    requestId?: string;
  };
}

/**
 * Standard API response formatter utility class
 */
export class ApiResponse {
  /**
   * Create a successful response with data
   */
  static success<T>(
    data: T,
    meta?: ApiSuccessResponse<T>["meta"],
  ): ApiSuccessResponse<T> {
    return {
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
      success: true,
    };
  }

  /**
   * Create a successful CRUD operation response
   */
  static crud<T>(
    data: T,
    operation: CrudOperationResponse<T>["operation"],
    meta?: CrudOperationResponse<T>["meta"],
  ): CrudOperationResponse<T> {
    return {
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
      operation,
      success: true,
    };
  }

  /**
   * Create a paginated response
   */
  static paginated<T>(
    data: T[],
    pagination: PaginatedResponse<T>["pagination"],
    meta?: PaginatedResponse<T>["meta"],
  ): PaginatedResponse<T> {
    return {
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
      pagination,
      success: true,
    };
  }

  /**
   * Create a bulk operation response
   */
  static bulk<T>(
    data: T[],
    operation: BulkOperationResponse<T>["operation"],
    meta?: BulkOperationResponse<T>["meta"],
  ): BulkOperationResponse<T> {
    return {
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...meta,
      },
      operation,
      success: true,
    };
  }

  /**
   * Create a standardized tRPC error (throws TRPCError)
   */
  static error(
    code: TRPCError["code"],
    message: string,
    details?: Record<string, unknown>,
  ): never {
    throw new TRPCError({
      cause: details,
      code,
      message,
    });
  }

  /**
   * Create an unauthorized error
   */
  static unauthorized(message: string = "Unauthorized access"): never {
    return ApiResponse.error("UNAUTHORIZED", message);
  }

  /**
   * Create a not found error
   */
  static notFound(resource: string, id?: string): never {
    const message = id
      ? `${resource} with ID ${id} not found`
      : `${resource} not found`;
    return ApiResponse.error("NOT_FOUND", message);
  }

  /**
   * Create a bad request error
   */
  static badRequest(message: string, details?: Record<string, unknown>): never {
    return ApiResponse.error("BAD_REQUEST", message, details);
  }

  /**
   * Create a validation error
   */
  static validationError(
    message: string,
    details?: Record<string, unknown>,
  ): never {
    return ApiResponse.error("BAD_REQUEST", message, {
      type: "validation",
      ...details,
    });
  }

  /**
   * Create an internal server error
   */
  static internalError(message: string = "Internal server error"): never {
    return ApiResponse.error("INTERNAL_SERVER_ERROR", message);
  }

  /**
   * Create a forbidden error
   */
  static forbidden(message: string = "Access forbidden"): never {
    return ApiResponse.error("FORBIDDEN", message);
  }

  /**
   * Create a conflict error
   */
  static conflict(message: string, details?: Record<string, unknown>): never {
    return ApiResponse.error("CONFLICT", message, details);
  }
}

/**
 * Helper functions for common response patterns
 */
export const ResponseHelpers = {
  /**
   * Format a created resource response
   */
  created<T>(data: T, resource: string): CrudOperationResponse<T> {
    return ApiResponse.crud(data, {
      affected: 1,
      resource,
      type: "CREATE",
    });
  },

  /**
   * Format a deleted resource response
   */
  deleted<T>(data: T, resource: string): CrudOperationResponse<T> {
    return ApiResponse.crud(data, {
      affected: 1,
      resource,
      type: "DELETE",
    });
  },

  /**
   * Format a list response
   */
  list<T>(data: T[]): ApiSuccessResponse<T[]> {
    return ApiResponse.success(data);
  },

  /**
   * Format a retrieved resource response
   */
  retrieved<T>(data: T): ApiSuccessResponse<T> {
    return ApiResponse.success(data);
  },

  /**
   * Format an updated resource response
   */
  updated<T>(data: T, resource: string): CrudOperationResponse<T> {
    return ApiResponse.crud(data, {
      affected: 1,
      resource,
      type: "UPDATE",
    });
  },

  /**
   * Validate database operation result and throw error if failed
   */
  validateDbResult<T>(result: T[], operation: string, resource: string): T {
    if (!result || result.length === 0) {
      throw ApiResponse.internalError(`Failed to ${operation} ${resource}`);
    }
    const firstResult = result[0];
    if (firstResult === undefined) {
      throw ApiResponse.internalError(`Failed to ${operation} ${resource}`);
    }
    return firstResult;
  },

  /**
   * Handle database operation with automatic error handling
   */
  async withDbOperation<T>(
    operation: () => Promise<T[]>,
    operationType: string,
    resource: string,
  ): Promise<T> {
    try {
      const result = await operation();
      return ResponseHelpers.validateDbResult(result, operationType, resource);
    } catch (error) {
      console.error(`Database ${operationType} failed for ${resource}:`, error);

      // Re-throw if it's already a TRPCError
      if (error instanceof TRPCError) {
        throw error;
      }

      // Otherwise, create an internal server error
      throw ApiResponse.internalError(`Failed to ${operationType} ${resource}`);
    }
  },
};

/**
 * Type utilities for working with API responses
 */
export type UnwrapApiResponse<T> = T extends ApiSuccessResponse<infer U>
  ? U
  : T extends PaginatedResponse<infer U>
    ? U[]
    : T extends CrudOperationResponse<infer U>
      ? U
      : T;

export type ApiResponseData<T> = T extends { data: infer U } ? U : never;
