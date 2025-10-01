import { useState } from "react";

/**
 * Hook for managing button loading states with consistent patterns
 */
export function useLoadingButton() {
  const [isLoading, setIsLoading] = useState(false);

  const executeWithLoading = async <T>(
    asyncFunction: () => Promise<T>,
  ): Promise<T | undefined> => {
    try {
      setIsLoading(true);
      return await asyncFunction();
    } catch (error) {
      console.error("Button action failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    executeWithLoading,
    isLoading,
    setIsLoading,
  };
}

/**
 * Enhanced button props that include standardized loading states
 */
export interface LoadingButtonProps {
  /** Standard loading state */
  isLoading?: boolean;
  /** Form submission state */
  isSubmitting?: boolean;
  /** Data saving state */
  isSaving?: boolean;
  /** Custom loading state */
  disabled?: boolean;
  /** Loading text to display */
  loadingText?: string;
  /** Child content */
  children?: React.ReactNode;
}

/**
 * Utility to determine if button should be disabled based on loading states
 */
export function getButtonDisabledState({
  isLoading,
  isSubmitting,
  isSaving,
  disabled,
}: LoadingButtonProps): boolean {
  return Boolean(isLoading || isSubmitting || isSaving || disabled);
}

/**
 * Utility to get appropriate button text based on loading state
 */
export function getButtonText(
  children: React.ReactNode,
  loadingText: string = "Loading...",
  states: LoadingButtonProps,
): React.ReactNode {
  const { isLoading, isSubmitting, isSaving } = states;

  if (isSubmitting) return "Submitting...";
  if (isSaving) return "Saving...";
  if (isLoading) return loadingText;

  return children;
}
