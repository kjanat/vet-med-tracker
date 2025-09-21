"use client";

import type { VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import {
  Button,
  type ButtonProps,
  type buttonVariants,
} from "@/components/ui/button";
import {
  getButtonDisabledState,
  getButtonText,
  type LoadingButtonProps,
} from "@/hooks/ui/useLoadingButton";

interface LoadingButtonComponentProps
  extends Omit<ButtonProps, "disabled" | "children">,
    LoadingButtonProps,
    VariantProps<typeof buttonVariants> {
  /** Show loading spinner */
  showSpinner?: boolean;
  /** Custom spinner element */
  spinner?: React.ReactNode;
}

/**
 * Enhanced Button component with standardized loading states
 *
 * Provides consistent loading behavior across the application:
 * - Automatic disabled state when loading/submitting/saving
 * - Loading text with optional spinner
 * - Consistent loading state management
 */
export function LoadingButton({
  children,
  isLoading,
  isSubmitting,
  isSaving,
  disabled,
  loadingText,
  showSpinner = true,
  spinner,
  ...buttonProps
}: LoadingButtonComponentProps) {
  const states = { disabled, isLoading, isSaving, isSubmitting };
  const isDisabled = getButtonDisabledState(states);
  const buttonText = getButtonText(children, loadingText, states);
  const isAnyLoading = isLoading || isSubmitting || isSaving;

  const defaultSpinner = <Loader2 className="mr-2 h-4 w-4 animate-spin" />;
  const spinnerElement = spinner || defaultSpinner;

  return (
    <Button disabled={isDisabled} {...buttonProps}>
      {isAnyLoading && showSpinner && spinnerElement}
      {buttonText}
    </Button>
  );
}

// Re-export the hook for convenience
export { useLoadingButton } from "@/hooks/ui/useLoadingButton";
