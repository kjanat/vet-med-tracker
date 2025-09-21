"use client";

import type { Route } from "next";
import Link from "next/link";
import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";

interface NavigationBlockerContextType {
  isBlocked: boolean;
  setIsBlocked: (blocked: boolean) => void;
  blockMessage: string;
  setBlockMessage: (message: string) => void;
  blockedBy: string | null;
  setBlockedBy: (source: string | null) => void;
}

const NavigationBlockerContext = createContext<NavigationBlockerContextType>({
  blockedBy: null,
  blockMessage: "You have unsaved changes. Are you sure you want to leave?",
  isBlocked: false,
  setBlockedBy: () => {},
  setBlockMessage: () => {},
  setIsBlocked: () => {},
});

/**
 * Provider for navigation blocking state
 * Manages blocking across all components in the app
 */
export function NavigationBlockerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockMessage, setBlockMessage] = useState(
    "You have unsaved changes. Are you sure you want to leave?",
  );
  const [blockedBy, setBlockedBy] = useState<string | null>(null);

  // Prevent browser navigation when blocked
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isBlocked) {
        e.preventDefault();
        e.returnValue = blockMessage;
        return blockMessage;
      }
    };

    if (isBlocked) {
      window.addEventListener("beforeunload", handleBeforeUnload);
    }

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isBlocked, blockMessage]);

  return (
    <NavigationBlockerContext.Provider
      value={{
        blockedBy,
        blockMessage,
        isBlocked,
        setBlockedBy,
        setBlockMessage,
        setIsBlocked,
      }}
    >
      {children}
    </NavigationBlockerContext.Provider>
  );
}

/**
 * Hook to access navigation blocking state
 */
export function useNavigationBlocker() {
  const context = useContext(NavigationBlockerContext);
  if (!context) {
    throw new Error(
      "useNavigationBlocker must be used within NavigationBlockerProvider",
    );
  }
  return context;
}

/**
 * Hook for components to register navigation blocking
 */
export function useFormNavigationGuard(
  isDirty: boolean,
  message?: string,
  sourceId?: string,
) {
  const {
    setIsBlocked,
    setBlockMessage,
    setBlockedBy,
    blockMessage: defaultMessage,
  } = useNavigationBlocker();

  useEffect(() => {
    if (isDirty) {
      setIsBlocked(true);
      setBlockedBy(sourceId || "form");
      if (message) {
        setBlockMessage(message);
      }
    } else {
      setIsBlocked(false);
      setBlockedBy(null);
      // Reset to default message when no longer blocked
      if (message) {
        setBlockMessage(defaultMessage);
      }
    }

    // Cleanup on unmount
    return () => {
      setIsBlocked(false);
      setBlockedBy(null);
    };
  }, [
    isDirty,
    message,
    sourceId,
    setIsBlocked,
    setBlockMessage,
    setBlockedBy,
    defaultMessage,
  ]);
}

interface GuardedLinkProps extends React.ComponentProps<typeof Link> {
  href: Route;
  children: React.ReactNode;
  /** Custom confirmation message */
  confirmMessage?: string;
  /** Skip navigation blocking entirely */
  bypassGuard?: boolean;
}

/**
 * Link component that respects navigation blocking
 * Shows confirmation dialog when navigation is blocked
 */
export function GuardedLink({
  href,
  children,
  confirmMessage,
  bypassGuard = false,
  onNavigate,
  ...props
}: GuardedLinkProps) {
  const { isBlocked, blockMessage } = useNavigationBlocker();

  const handleNavigate = (e: Parameters<NonNullable<typeof onNavigate>>[0]) => {
    if (!bypassGuard && isBlocked) {
      const message = confirmMessage || blockMessage;
      if (!window.confirm(message)) {
        e.preventDefault();
        return;
      }
    }

    onNavigate?.(e);
  };

  return (
    <Link href={href} onNavigate={handleNavigate} {...props}>
      {children}
    </Link>
  );
}

/**
 * Form component that automatically guards navigation when dirty
 */
export function GuardedForm({
  children,
  onSubmit,
  onChange,
  guardMessage = "You have unsaved changes. Are you sure you want to leave?",
  ...props
}: React.FormHTMLAttributes<HTMLFormElement> & {
  guardMessage?: string;
}) {
  const [isDirty, setIsDirty] = useState(false);

  useFormNavigationGuard(isDirty, guardMessage, "form");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    setIsDirty(false); // Clear dirty state on submit
    onSubmit?.(e);
  };

  const handleChange = (e: React.FormEvent<HTMLFormElement>) => {
    setIsDirty(true);
    onChange?.(e);
  };

  return (
    <form onChange={handleChange} onSubmit={handleSubmit} {...props}>
      {children}
    </form>
  );
}

/**
 * Display current navigation blocking status (for debugging/admin)
 */
export function NavigationBlockerStatus() {
  const { isBlocked, blockedBy } = useNavigationBlocker();

  if (!isBlocked) return null;

  return (
    <div className="fixed top-4 right-4 z-50 rounded-lg bg-yellow-100 p-3 text-yellow-800 shadow-lg dark:bg-yellow-900 dark:text-yellow-200">
      <div className="flex items-center gap-2">
        <svg
          aria-label="Warning"
          className="h-5 w-5"
          fill="none"
          role="img"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
          />
        </svg>
        <div>
          <div className="font-medium text-sm">Navigation Blocked</div>
          <div className="text-xs">Source: {blockedBy}</div>
        </div>
      </div>
    </div>
  );
}
