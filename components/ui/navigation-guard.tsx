"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useCallback } from "react";

interface NavigationGuardLinkProps
  extends Omit<ComponentProps<typeof Link>, "onNavigate"> {
  /**
   * When true, will prevent navigation and show a confirmation dialog
   */
  hasUnsavedChanges?: boolean;
  /**
   * Custom confirmation message
   */
  confirmationMessage?: string;
}

export function NavigationGuardLink({
  hasUnsavedChanges = false,
  confirmationMessage = "You have unsaved changes. Are you sure you want to leave?",
  children,
  ...props
}: NavigationGuardLinkProps) {
  const handleNavigate = useCallback(() => {
    if (hasUnsavedChanges) {
      const confirmed = window.confirm(confirmationMessage);
      return confirmed;
    }
    return true;
  }, [hasUnsavedChanges, confirmationMessage]);

  return (
    <Link {...props} onNavigate={handleNavigate}>
      {children}
    </Link>
  );
}
