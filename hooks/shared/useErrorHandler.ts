"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import {
  ApiErrorHandler,
  ErrorHandler,
  ErrorSeverity,
  FormErrorHandler,
  type StandardError,
} from "@/lib/utils/error-handling";

/**
 * Hook for consistent error handling across the application
 */
export function useErrorHandler() {
  /**
   * Generic error handler that processes errors and shows appropriate feedback
   */
  const handleError = useCallback(
    (
      error: unknown,
      context?: Record<string, unknown>,
      options?: {
        showToast?: boolean;
        toastTitle?: string;
      },
    ): StandardError => {
      const standardError = ErrorHandler.handle(error, context);

      // Show toast notification if requested and not already shown by ErrorHandler
      if (options?.showToast && standardError.userMessage) {
        toast.error(standardError.userMessage);
      }

      return standardError;
    },
    [],
  );

  return {
    handleError,
  };
}

/**
 * Hook for form-specific error handling
 */
export function useFormErrorHandler() {
  const { handleError } = useErrorHandler();

  /**
   * Handle form submission errors with form-specific context
   */
  const handleSubmissionError = useCallback(
    (
      error: unknown,
      formName: string,
      setError?: (field: string, error: { message: string }) => void,
    ) => {
      const standardError = handleError(error, {
        formName,
        type: "form-submission",
      });

      // Set form-level error if setError function provided
      if (setError && standardError.userMessage) {
        setError("root", { message: standardError.userMessage });
      }

      return standardError;
    },
    [handleError],
  );

  /**
   * Handle validation errors with field-specific error setting
   */
  const handleValidationError = useCallback(
    (
      error: unknown,
      setError?: (field: string, error: { message: string }) => void,
    ) => {
      FormErrorHandler.handleValidationError(error, setError);
    },
    [],
  );

  /**
   * Clear form errors
   */
  const clearFormErrors = useCallback((clearErrors: () => void) => {
    clearErrors();
  }, []);

  return {
    clearFormErrors,
    handleSubmissionError,
    handleValidationError,
  };
}

/**
 * Hook for API-specific error handling
 */
export function useApiErrorHandler() {
  const { handleError } = useErrorHandler();

  /**
   * Handle mutation errors with API-specific context
   */
  const handleMutationError = useCallback(
    (
      error: unknown,
      operation: string,
      options?: {
        showToast?: boolean;
        toastTitle?: string;
      },
    ) => {
      const standardError = handleError(
        error,
        {
          operation,
          type: "api-mutation",
        },
        options,
      );

      // Additional API-specific error logging
      ApiErrorHandler.handleMutationError(error, operation);

      return standardError;
    },
    [handleError],
  );

  /**
   * Handle query errors with resource-specific context
   */
  const handleQueryError = useCallback(
    (
      error: unknown,
      resource: string,
      options?: {
        showToast?: boolean;
        toastTitle?: string;
      },
    ) => {
      const standardError = handleError(
        error,
        {
          resource,
          type: "api-query",
        },
        options,
      );

      ApiErrorHandler.handleQueryError(error, resource);

      return standardError;
    },
    [handleError],
  );

  /**
   * Create an error handler for tRPC mutations
   */
  const createMutationErrorHandler = useCallback(
    (
      operation: string,
      options?: {
        showToast?: boolean;
        toastTitle?: string;
      },
    ) => {
      return (error: unknown) => {
        return handleMutationError(error, operation, options);
      };
    },
    [handleMutationError],
  );

  /**
   * Create an error handler for tRPC queries
   */
  const createQueryErrorHandler = useCallback(
    (
      resource: string,
      options?: {
        showToast?: boolean;
        toastTitle?: string;
      },
    ) => {
      return (error: unknown) => {
        return handleQueryError(error, resource, options);
      };
    },
    [handleQueryError],
  );

  return {
    createMutationErrorHandler,
    createQueryErrorHandler,
    handleMutationError,
    handleQueryError,
  };
}

/**
 * Hook for async operation error handling with loading states
 */
export function useAsyncErrorHandler() {
  const { handleError } = useErrorHandler();

  /**
   * Wrap an async operation with error handling and loading state
   */
  const withAsyncErrorHandling = useCallback(
    async <T>(
      operation: () => Promise<T>,
      context?: Record<string, unknown>,
      options?: {
        showToast?: boolean;
        toastTitle?: string;
        onError?: (error: StandardError) => void;
        onFinally?: () => void;
      },
    ): Promise<T | null> => {
      try {
        const result = await operation();
        return result;
      } catch (error) {
        const standardError = handleError(error, context, {
          showToast: options?.showToast,
          toastTitle: options?.toastTitle,
        });

        if (options?.onError) {
          options.onError(standardError);
        }

        return null;
      } finally {
        if (options?.onFinally) {
          options.onFinally();
        }
      }
    },
    [handleError],
  );

  return {
    withAsyncErrorHandling,
  };
}

/**
 * Hook for component-level error state management
 */
export function useErrorState() {
  const { handleError } = useErrorHandler();

  /**
   * Set error state with standardized error handling
   */
  const setErrorState = useCallback(
    (
      setError: (error: StandardError | null) => void,
      error: unknown,
      context?: Record<string, unknown>,
    ) => {
      if (error) {
        const standardError = handleError(error, context);
        setError(standardError);
      } else {
        setError(null);
      }
    },
    [handleError],
  );

  /**
   * Clear error state
   */
  const clearErrorState = useCallback(
    (setError: (error: StandardError | null) => void) => {
      setError(null);
    },
    [],
  );

  /**
   * Check if error is critical and requires special handling
   */
  const isCriticalError = useCallback(
    (error: StandardError | null): boolean => {
      return error?.severity === ErrorSeverity.CRITICAL;
    },
    [],
  );

  return {
    clearErrorState,
    isCriticalError,
    setErrorState,
  };
}
