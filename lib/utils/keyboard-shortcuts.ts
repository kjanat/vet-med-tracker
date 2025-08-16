"use client";

import { useCallback, useEffect } from "react";

type NavigationDirection = "horizontal" | "vertical" | "grid";

// Navigation key mappings with improved type safety
const navigationKeys = Object.freeze({
  ArrowDown: {
    directions: ["vertical", "grid"] as NavigationDirection[],
    delta: 1,
  },
  ArrowUp: {
    directions: ["vertical", "grid"] as NavigationDirection[],
    delta: -1,
  },
  ArrowRight: {
    directions: ["horizontal", "grid"] as NavigationDirection[],
    delta: 1,
  },
  ArrowLeft: {
    directions: ["horizontal", "grid"] as NavigationDirection[],
    delta: -1,
  },
  Home: { absolute: 0 },
  End: { absolute: -1 }, // Will be resolved to items.length - 1
} as const);

/**
 * Global keyboard shortcuts for the VetMed Tracker application
 */
export const KEYBOARD_SHORTCUTS = {
  // Navigation shortcuts
  "Ctrl+R": "Record medication",
  "Ctrl+I": "Go to inventory",
  "Ctrl+H": "View history",
  "Ctrl+N": "Add new animal",
  "Ctrl+S": "Go to settings",

  // Search and utility
  "Ctrl+K": "Search everywhere",
  "Ctrl+/": "Show keyboard shortcuts",
  "?": "Show keyboard shortcuts (alternative)",

  // Modal and navigation
  Escape: "Close modal/Cancel action",
  "Alt+M": "Open main menu",

  // Quick actions
  "Ctrl+Shift+A": "Add new administration",
  "Ctrl+Shift+I": "Add inventory item",
  "Ctrl+Shift+R": "Create new regimen",
} as const;

export type ShortcutKey = keyof typeof KEYBOARD_SHORTCUTS;

/**
 * Utility to check if a keyboard event matches a shortcut
 */
export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: ShortcutKey,
): boolean {
  const keys = shortcut.split("+");
  const keyChecks = {
    Ctrl: event.ctrlKey || event.metaKey, // Support both Ctrl and Cmd
    Alt: event.altKey,
    Shift: event.shiftKey,
  };

  // Check modifier keys
  for (const key of keys.slice(0, -1)) {
    if (key in keyChecks && !keyChecks[key as keyof typeof keyChecks]) {
      return false;
    }
  }

  // Check the main key
  const mainKey = keys[keys.length - 1];
  if (mainKey === "/") {
    return event.key === "/" && event.ctrlKey;
  }

  return event.key === mainKey || event.key === mainKey?.toLowerCase();
}

/**
 * Hook for managing global keyboard shortcuts
 */
export function useKeyboardShortcuts(
  shortcuts: Partial<Record<ShortcutKey, () => void>>,
  options: {
    /** Whether shortcuts are enabled */
    enabled?: boolean;
    /** Element to attach listeners to (defaults to document) */
    target?: HTMLElement | Document;
  } = {},
) {
  const { enabled = true } = options;

  // Set target inside the hook to avoid SSR issues
  const target =
    options.target || (typeof document !== "undefined" ? document : null);

  // Helper to check if element is input
  const isInputElement = useCallback((element: Element | null): boolean => {
    if (!element) return false;
    return (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement ||
      element.getAttribute("contenteditable") === "true"
    );
  }, []);

  // Helper to handle shortcut execution
  const executeShortcut = useCallback(
    (event: KeyboardEvent, shortcut: ShortcutKey, callback: () => void) => {
      if (matchesShortcut(event, shortcut)) {
        event.preventDefault();
        event.stopPropagation();
        callback();
        return true;
      }
      return false;
    },
    [], // matchesShortcut doesn't depend on any external values
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Don't trigger shortcuts when user is typing in inputs (except Escape)
      if (typeof document !== "undefined") {
        const activeElement = document.activeElement;
        if (isInputElement(activeElement) && event.key !== "Escape") {
          return;
        }
      }

      // Check each registered shortcut
      for (const [shortcut, callback] of Object.entries(shortcuts)) {
        if (executeShortcut(event, shortcut as ShortcutKey, callback)) {
          break;
        }
      }
    },
    [enabled, shortcuts, executeShortcut, isInputElement],
  );

  useEffect(() => {
    if (!enabled || !target) return;

    target.addEventListener("keydown", handleKeyDown as EventListener);
    return () =>
      target.removeEventListener("keydown", handleKeyDown as EventListener);
  }, [handleKeyDown, enabled, target]);
}

/**
 * Hook for focus management within a specific container
 */
export function useFocusManagement(
  containerRef: React.RefObject<HTMLElement>,
  options: {
    /** Whether to trap focus within the container */
    trapFocus?: boolean;
    /** Whether to return focus when container is unmounted */
    returnFocus?: boolean;
    /** Initial element to focus */
    initialFocus?: HTMLElement | string;
  } = {},
) {
  const { trapFocus = false, returnFocus = false, initialFocus } = options;

  // Store the element that had focus before this container
  const previouslyFocusedElement = useCallback(() => {
    return typeof document !== "undefined"
      ? (document.activeElement as HTMLElement)
      : null;
  }, []);

  // Get all focusable elements within the container
  const getFocusableElements = useCallback(() => {
    if (!containerRef.current) return [];

    const focusableSelectors = [
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      "a[href]",
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
    ].join(", ");

    return Array.from(
      containerRef.current.querySelectorAll(focusableSelectors),
    ) as HTMLElement[];
  }, [containerRef]);

  // Set initial focus
  const setInitialFocus = useCallback(() => {
    if (!containerRef.current) return;

    let targetElement: HTMLElement | null = null;

    if (typeof initialFocus === "string") {
      targetElement = containerRef.current.querySelector(initialFocus);
    } else if (initialFocus instanceof HTMLElement) {
      targetElement = initialFocus;
    } else {
      // Default to first focusable element
      const focusableElements = getFocusableElements();
      targetElement = focusableElements[0] || null;
    }

    if (targetElement) {
      // Use setTimeout to ensure the element is rendered
      setTimeout(() => targetElement?.focus(), 0);
    }
  }, [containerRef, initialFocus, getFocusableElements]);

  // Handle focus trap
  const handleFocusTrap = useCallback(
    (event: KeyboardEvent) => {
      if (
        !trapFocus ||
        !containerRef.current ||
        typeof document === "undefined" ||
        event.key !== "Tab"
      ) {
        return;
      }

      const focusableElements = getFocusableElements();
      if (focusableElements.length === 0) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];
      const activeElement = document.activeElement as HTMLElement;

      // Determine focus direction and handle wrapping
      const isGoingBackward = event.shiftKey && activeElement === firstElement;
      const isGoingForward = !event.shiftKey && activeElement === lastElement;

      if (isGoingBackward && lastElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (isGoingForward && firstElement) {
        event.preventDefault();
        firstElement.focus();
      }
    },
    [trapFocus, containerRef, getFocusableElements],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof document === "undefined") return;

    const previousElement = returnFocus ? previouslyFocusedElement() : null;

    // Set initial focus
    setInitialFocus();

    // Add focus trap listener
    if (trapFocus) {
      document.addEventListener("keydown", handleFocusTrap);
    }

    return () => {
      if (trapFocus && typeof document !== "undefined") {
        document.removeEventListener("keydown", handleFocusTrap);
      }

      // Return focus to previously focused element
      if (
        returnFocus &&
        previousElement &&
        typeof document !== "undefined" &&
        document.contains(previousElement)
      ) {
        previousElement.focus();
      }
    };
  }, [
    containerRef,
    trapFocus,
    returnFocus,
    setInitialFocus,
    handleFocusTrap,
    previouslyFocusedElement,
  ]);

  return {
    setInitialFocus,
    getFocusableElements,
  };
}

/**
 * Hook for managing keyboard navigation in lists/grids
 */
export function useKeyboardNavigation(
  containerRef: React.RefObject<HTMLElement>,
  options: {
    /** Direction of navigation */
    direction?: "horizontal" | "vertical" | "grid";
    /** Whether to wrap around at edges */
    wrap?: boolean;
    /** Selector for navigable items */
    itemSelector?: string;
  } = {},
) {
  const {
    direction = "vertical",
    wrap = true,
    itemSelector = '[role="option"], button, a, [tabindex="0"]',
  } = options;

  const getItems = useCallback(() => {
    if (!containerRef.current) return [];
    return Array.from(
      containerRef.current.querySelectorAll(itemSelector),
    ) as HTMLElement[];
  }, [containerRef, itemSelector]);

  // Helper to calculate next index with wrapping
  const getNextIndex = useCallback(
    (current: number, delta: number, total: number): number => {
      const next = current + delta;
      if (wrap) {
        if (next >= total) return 0;
        if (next < 0) return total - 1;
      }
      return next;
    },
    [wrap],
  );

  // Helper to calculate the next index based on navigation config
  const calculateNextIndex = useCallback(
    (
      navConfig: (typeof navigationKeys)[keyof typeof navigationKeys],
      currentIndex: number,
      itemsLength: number,
    ) => {
      if ("absolute" in navConfig) {
        return navConfig.absolute === -1 ? itemsLength - 1 : navConfig.absolute;
      }
      if (navConfig.directions.includes(direction)) {
        return getNextIndex(currentIndex, navConfig.delta, itemsLength);
      }
      return currentIndex;
    },
    [direction, getNextIndex],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (typeof document === "undefined") return;

      const items = getItems();
      if (items.length === 0) return;

      const currentIndex = items.findIndex(
        (item) => item === document.activeElement,
      );
      if (currentIndex === -1) return;

      const navConfig =
        navigationKeys[event.key as keyof typeof navigationKeys];
      if (!navConfig) return;

      const nextIndex = calculateNextIndex(
        navConfig,
        currentIndex,
        items.length,
      );

      if (nextIndex !== currentIndex) {
        event.preventDefault();
        if (nextIndex >= 0 && nextIndex < items.length && items[nextIndex]) {
          items[nextIndex]?.focus();
        }
      }
    },
    [getItems, calculateNextIndex],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [containerRef, handleKeyDown]);

  return { getItems };
}

/**
 * Utility to announce keyboard shortcuts to screen readers
 */
export function announceShortcuts() {
  if (typeof document === "undefined") return;

  const shortcuts = Object.entries(KEYBOARD_SHORTCUTS)
    .map(([key, description]) => `${key}: ${description}`)
    .join(". ");

  // Use the screen reader announcer utility
  const announcer = document.getElementById("global-announcer-polite");
  if (announcer) {
    announcer.textContent = `Available keyboard shortcuts: ${shortcuts}`;
  }
}
