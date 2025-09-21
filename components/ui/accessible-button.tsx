"use client";

import type React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";
import { keyboardHandlers } from "@/lib/utils/keyboard-navigation";

interface AccessibleButtonProps extends ButtonProps {
  /** Enhanced keyboard navigation */
  enableKeyboardNav?: boolean;
  /** Close dialog/modal on Escape */
  enableEscapeClose?: boolean;
  /** Callback for escape key */
  onEscape?: () => void;
  /** Custom keyboard handler */
  onKeyDown?: (event: React.KeyboardEvent) => void;
}

/**
 * Enhanced Button with improved keyboard accessibility
 *
 * Features:
 * - WCAG 2.1 compliant keyboard navigation
 * - Enhanced Enter/Space key handling
 * - Escape key support for modal closing
 * - Proper ARIA attributes
 * - Focus management
 */
export function AccessibleButton({
  children,
  onClick,
  onKeyDown,
  enableKeyboardNav = true,
  enableEscapeClose = false,
  onEscape,
  ...props
}: AccessibleButtonProps) {
  const handleKeyDown = (event: React.KeyboardEvent) => {
    // Custom handler takes precedence
    if (onKeyDown) {
      onKeyDown(event);
      return;
    }

    // Default keyboard navigation
    if (enableKeyboardNav && onClick) {
      keyboardHandlers.buttonLike(() => {
        // Trigger click directly on the element to generate a proper React event
        const target = event.currentTarget as HTMLButtonElement;
        target.click();
      })(event);
    }

    // Escape key handling
    if (enableEscapeClose && onEscape) {
      keyboardHandlers.escapeClose(onEscape)(event);
    }
  };

  return (
    <Button
      {...props}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      // Ensure proper accessibility attributes
      role={props.role || "button"}
      tabIndex={props.tabIndex ?? 0}
    >
      {children}
    </Button>
  );
}

/**
 * Pre-configured accessible button variants
 */
export const AccessibleButtons = {
  /**
   * Action button with full keyboard navigation
   */
  Action: ({ label, ...props }: { label: string } & AccessibleButtonProps) => (
    <AccessibleButton {...props} aria-label={label} enableKeyboardNav />
  ),
  /**
   * Close button with Escape key support
   */
  Close: ({
    onClose,
    ...props
  }: { onClose: () => void } & Omit<
    AccessibleButtonProps,
    "onEscape" | "enableEscapeClose"
  >) => (
    <AccessibleButton
      {...props}
      aria-label="Close"
      enableEscapeClose
      onClick={onClose}
      onEscape={onClose}
    />
  ),

  /**
   * Submit button with enhanced keyboard support
   */
  Submit: ({ ...props }: AccessibleButtonProps) => (
    <AccessibleButton
      {...props}
      aria-label={props["aria-label"] || "Submit form"}
      type="submit"
    />
  ),
};
