/**
 * Standardized error handling utilities for consistent error management
 * across the VetMed Tracker application
 */

import { CommonErrors, showErrorToast } from "./toast-helpers.ts";

/**
 * Standard error interface for consistent error structure
 */
export interface StandardError {
  code: string;
  message: string;
  context?: Record<string, unknown>;
  severity: "low" | "medium" | "high" | "critical";
  timestamp: Date;
  userMessage?: string;
}

/**
 * Error code classifications for consistent error categorization
 */
export const ErrorCodes = {
  API_ERROR: "API_ERROR",
  CONFIGURATION_ERROR: "CONFIGURATION_ERROR",
  DATA_CORRUPTION: "DATA_CORRUPTION",
  DUPLICATE_ENTRY: "DUPLICATE_ENTRY",
  FEATURE_UNAVAILABLE: "FEATURE_UNAVAILABLE",
  FORBIDDEN: "FORBIDDEN",
  INVALID_FORMAT: "INVALID_FORMAT",
  // Network & API errors
  NETWORK_ERROR: "NETWORK_ERROR",

  // Data errors
  NOT_FOUND: "NOT_FOUND",
  REQUIRED_FIELD: "REQUIRED_FIELD",
  SESSION_EXPIRED: "SESSION_EXPIRED",
  TIMEOUT_ERROR: "TIMEOUT_ERROR",

  // Authentication & Authorization errors
  UNAUTHORIZED: "UNAUTHORIZED",

  // Application errors
  UNEXPECTED_ERROR: "UNEXPECTED_ERROR",

  // Validation errors
  VALIDATION_ERROR: "VALIDATION_ERROR",
} as const;

/**
 * Error severity levels for consistent prioritization
 */
export const ErrorSeverity = {
  CRITICAL: "critical" as const, // Issues that break core functionality
  HIGH: "high" as const, // Issues that significantly impact user experience
  LOW: "low" as const, // Minor issues that don't block functionality
  MEDIUM: "medium" as const, // Issues that impact specific features
};

/**
 * Create a standardized error object
 */
export function createStandardError(
  code: string,
  message: string,
  options: {
    context?: Record<string, unknown>;
    severity?: StandardError["severity"];
    userMessage?: string;
  } = {},
): StandardError {
  return {
    code,
    context: options.context,
    message,
    severity: options.severity || ErrorSeverity.MEDIUM,
    timestamp: new Date(),
    userMessage: options.userMessage,
  };
}

/**
 * Enhanced error handler that provides consistent error processing
 */
export class ErrorHandler {
  /**
   * Process and handle an error with consistent behavior
   */
  static handle(
    error: unknown,
    context?: Record<string, unknown>,
  ): StandardError {
    const standardError = ErrorHandler.normalizeError(error, context);

    // Log error for debugging
    ErrorHandler.logError(standardError);

    // Show user notification if appropriate
    ErrorHandler.notifyUser(standardError);

    return standardError;
  }

  /**
   * Normalize any error type into a StandardError
   */
  private static normalizeError(
    error: unknown,
    context?: Record<string, unknown>,
  ): StandardError {
    if (error instanceof Error) {
      // Handle tRPC errors
      if (error.name === "TRPCClientError") {
        return ErrorHandler.handleTRPCError(error, context);
      }

      // Handle fetch errors
      if (error.name === "TypeError" && error.message.includes("fetch")) {
        return createStandardError(
          ErrorCodes.NETWORK_ERROR,
          "Network request failed",
          {
            context: { ...context, originalError: error.message },
            severity: ErrorSeverity.HIGH,
            userMessage: CommonErrors.NETWORK,
          },
        );
      }

      // Handle validation errors
      if (error.name === "ZodError") {
        return createStandardError(
          ErrorCodes.VALIDATION_ERROR,
          "Form validation failed",
          {
            context: { ...context, originalError: error.message },
            severity: ErrorSeverity.MEDIUM,
            userMessage: CommonErrors.VALIDATION,
          },
        );
      }

      // Generic error handling
      return createStandardError(
        ErrorCodes.UNEXPECTED_ERROR,
        error.message || "An unexpected error occurred",
        {
          context: { ...context, stack: error.stack },
          severity: ErrorSeverity.MEDIUM,
          userMessage: "An unexpected error occurred. Please try again.",
        },
      );
    }

    // Handle string errors
    if (typeof error === "string") {
      return createStandardError(ErrorCodes.UNEXPECTED_ERROR, error, {
        context,
        severity: ErrorSeverity.MEDIUM,
        userMessage: error,
      });
    }

    // Handle unknown error types
    return createStandardError(
      ErrorCodes.UNEXPECTED_ERROR,
      "An unknown error occurred",
      {
        context: { ...context, error },
        severity: ErrorSeverity.MEDIUM,
        userMessage: "An unexpected error occurred. Please try again.",
      },
    );
  }

  /**
   * Handle tRPC-specific errors
   */
  private static handleTRPCError(
    error: Error,
    context?: Record<string, unknown>,
  ): StandardError {
    const errorMessage = error.message;

    // Parse tRPC error codes
    if (errorMessage.includes("UNAUTHORIZED")) {
      return createStandardError(
        ErrorCodes.UNAUTHORIZED,
        "Authentication required",
        {
          context,
          severity: ErrorSeverity.HIGH,
          userMessage: CommonErrors.UNAUTHORIZED,
        },
      );
    }

    if (errorMessage.includes("NOT_FOUND")) {
      return createStandardError(ErrorCodes.NOT_FOUND, "Resource not found", {
        context,
        severity: ErrorSeverity.MEDIUM,
        userMessage: CommonErrors.NOT_FOUND,
      });
    }

    if (errorMessage.includes("INTERNAL_SERVER_ERROR")) {
      return createStandardError(
        ErrorCodes.API_ERROR,
        "Server error occurred",
        {
          context,
          severity: ErrorSeverity.HIGH,
          userMessage: CommonErrors.SERVER,
        },
      );
    }

    // Generic tRPC error
    return createStandardError(ErrorCodes.API_ERROR, errorMessage, {
      context,
      severity: ErrorSeverity.MEDIUM,
      userMessage: "A server error occurred. Please try again.",
    });
  }

  /**
   * Log error with appropriate level based on severity
   */
  private static logError(error: StandardError): void {
    const logContext = {
      code: error.code,
      context: error.context,
      message: error.message,
      severity: error.severity,
      timestamp: error.timestamp,
    };

    switch (error.severity) {
      case ErrorSeverity.CRITICAL:
        console.error("CRITICAL ERROR:", logContext);
        break;
      case ErrorSeverity.HIGH:
        console.error("HIGH SEVERITY ERROR:", logContext);
        break;
      case ErrorSeverity.MEDIUM:
        console.warn("MEDIUM SEVERITY ERROR:", logContext);
        break;
      case ErrorSeverity.LOW:
        console.info("LOW SEVERITY ERROR:", logContext);
        break;
    }
  }

  /**
   * Show user notification based on error severity and user message
   */
  private static notifyUser(error: StandardError): void {
    // Only show toast for errors with user messages and medium+ severity
    if (error.userMessage && error.severity !== ErrorSeverity.LOW) {
      showErrorToast("operation", undefined, error.userMessage);
    }
  }
}
/**
 * Form-specific error handling utilities
 */
export const FormErrorHandler = {
  /**
   * Handle form submission errors consistently
   */
  handleSubmissionError(
    error: unknown,
    formName: string,
    setError?: (field: string, error: { message: string }) => void,
  ): void {
    const standardError = ErrorHandler.handle(error, { formName });

    // Set form-level error if setError function provided
    if (setError && standardError.userMessage) {
      setError("root", { message: standardError.userMessage });
    }
  },

  /**
   * Handle validation errors with field-specific messages
   */
  handleValidationError(
    error: unknown,
    setError?: (field: string, error: { message: string }) => void,
  ): void {
    if (error && typeof error === "object" && "errors" in error) {
      const validationErrors = error.errors as Array<{
        field: string;
        message: string;
      }>;

      validationErrors.forEach(({ field, message }) => {
        if (setError) {
          setError(field, { message });
        }
      });
    } else {
      // Fallback to general validation error
      const standardError = ErrorHandler.handle(error, { type: "validation" });
      if (setError && standardError.userMessage) {
        setError("root", { message: standardError.userMessage });
      }
    }
  },
};

/**
 * API call error handling utilities
 */
export const ApiErrorHandler = {
  /**
   * Handle API mutation errors consistently
   */
  handleMutationError(error: unknown, operation: string): void {
    const standardError = ErrorHandler.handle(error, { operation });

    // Additional API-specific logging
    if (
      standardError.severity === ErrorSeverity.HIGH ||
      standardError.severity === ErrorSeverity.CRITICAL
    ) {
      console.error(`API ${operation} failed:`, {
        code: standardError.code,
        context: standardError.context,
        message: standardError.message,
      });
    }
  },

  /**
   * Handle API query errors consistently
   */
  handleQueryError(error: unknown, resource: string): void {
    ErrorHandler.handle(error, { resource, type: "query" });
  },
};
