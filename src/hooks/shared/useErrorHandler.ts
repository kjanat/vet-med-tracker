"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import {
  ErrorHandler,
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
