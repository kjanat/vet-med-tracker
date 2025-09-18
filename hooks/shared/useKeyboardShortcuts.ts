"use client";

import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { useScreenReaderAnnouncements } from "@/components/ui/screen-reader-announcer";

/**
 * Keyboard shortcut configuration interface
 */
interface ShortcutConfig {
  key: string;
  description: string;
  action: () => void;
  modifiers?: {
    ctrl?: boolean;
    alt?: boolean;
    shift?: boolean;
    meta?: boolean;
  };
  preventDefault?: boolean;
  stopPropagation?: boolean;
  disabled?: boolean;
}

/**
 * Hook options interface
 */
interface UseKeyboardShortcutsOptions {
  /** Whether shortcuts are globally enabled */
  enabled?: boolean;
  /** Target element for event listeners (defaults to document) */
  target?: HTMLElement | Document | null;
  /** Whether to prevent shortcuts when typing in inputs */
  respectInputs?: boolean;
  /** Custom input element selector */
  inputSelector?: string;
}

/**
 * Advanced keyboard shortcuts hook with conflict resolution and focus management
 *
 * @example
 * ```tsx
 * const { registerShortcut, unregisterShortcut, isActive } = useKeyboardShortcuts({
 *   enabled: true,
 *   respectInputs: true,
 * });
 *
 * useEffect(() => {
 *   registerShortcut({
 *     key: "Ctrl+K",
 *     description: "Open search",
 *     action: () => setSearchOpen(true),
 *   });
 * }, [registerShortcut]);
 * ```
 */
export function useKeyboardShortcuts(
  options: UseKeyboardShortcutsOptions = {},
) {
  const {
    enabled = true,
    target,
    respectInputs = true,
    inputSelector = "input, textarea, select, [contenteditable]",
  } = options;

  const [shortcuts, setShortcuts] = useState<Map<string, ShortcutConfig>>(
    new Map(),
  );
  const [activeShortcuts, setActiveShortcuts] = useState<Set<string>>(
    new Set(),
  );
  const _router = useRouter();
  const { announce } = useScreenReaderAnnouncements();

  // Get the target element with SSR safety
  const targetElement =
    target || (typeof document !== "undefined" ? document : null);

  /**
   * Check if the current active element is an input
   */
  const isInputElement = useCallback(
    (element: Element | null): boolean => {
      if (!element || !respectInputs) return false;
      return element.matches(inputSelector);
    },
    [respectInputs, inputSelector],
  );

  /**
   * Parse shortcut string into modifiers and key
   */
  const parseShortcut = useCallback((shortcut: string) => {
    const parts = shortcut.split("+");
    const key = parts[parts.length - 1];
    const modifiers = {
      alt: parts.includes("Alt"),
      ctrl: parts.includes("Ctrl"),
      meta: parts.includes("Meta") || parts.includes("Cmd"),
      shift: parts.includes("Shift"),
    };
    return { key, modifiers };
  }, []);

  /**
   * Check if keyboard event matches shortcut configuration
   */
  const matchesShortcut = useCallback(
    (event: KeyboardEvent, config: ShortcutConfig): boolean => {
      const parsed = parseShortcut(config.key);

      // Check modifiers
      if (parsed.modifiers.ctrl && !(event.ctrlKey || event.metaKey))
        return false;
      if (parsed.modifiers.alt && !event.altKey) return false;
      if (parsed.modifiers.shift && !event.shiftKey) return false;
      if (parsed.modifiers.meta && !event.metaKey) return false;

      // Check main key (case insensitive)
      return parsed.key
        ? event.key.toLowerCase() === parsed.key.toLowerCase()
        : false;
    },
    [parseShortcut],
  );

  /**
   * Register a new keyboard shortcut
   */
  const registerShortcut = useCallback((config: ShortcutConfig) => {
    setShortcuts((prev) => {
      const newMap = new Map(prev);
      newMap.set(config.key, config);
      return newMap;
    });
  }, []);

  /**
   * Unregister a keyboard shortcut
   */
  const unregisterShortcut = useCallback((key: string) => {
    setShortcuts((prev) => {
      const newMap = new Map(prev);
      newMap.delete(key);
      return newMap;
    });
  }, []);

  /**
   * Check if a shortcut is currently active
   */
  const isShortcutActive = useCallback(
    (key: string) => activeShortcuts.has(key),
    [activeShortcuts],
  );

  /**
   * Get all registered shortcuts
   */
  const getShortcuts = useCallback(
    () => Array.from(shortcuts.values()),
    [shortcuts],
  );

  /**
   * Check if the current context allows shortcuts
   */
  const canProcessShortcuts = useCallback(
    (event: KeyboardEvent): boolean => {
      if (!enabled) return false;

      if (typeof document !== "undefined") {
        const activeElement = document.activeElement;
        if (isInputElement(activeElement) && event.key !== "Escape") {
          return false;
        }
      }

      return true;
    },
    [enabled, isInputElement],
  );

  /**
   * Execute a matched shortcut
   */
  const executeShortcut = useCallback(
    (event: KeyboardEvent, key: string, config: ShortcutConfig) => {
      // Update active shortcuts
      setActiveShortcuts((prev) => new Set(prev).add(key));

      // Handle event behavior
      if (config.preventDefault !== false) {
        event.preventDefault();
      }
      if (config.stopPropagation !== false) {
        event.stopPropagation();
      }

      // Execute action
      try {
        config.action();
        if (config.description) {
          announce(config.description, "polite");
        }
      } catch (error) {
        console.error(`Error executing shortcut ${key}:`, error);
      }
    },
    [announce],
  );

  /**
   * Find and execute matching shortcut
   */
  const processShortcuts = useCallback(
    (event: KeyboardEvent) => {
      for (const [key, config] of shortcuts.entries()) {
        if (config.disabled) continue;

        if (matchesShortcut(event, config)) {
          executeShortcut(event, key, config);
          return true; // Found and executed shortcut
        }
      }
      return false; // No shortcut found
    },
    [shortcuts, matchesShortcut, executeShortcut],
  );

  /**
   * Handle keydown events
   */
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!canProcessShortcuts(event)) return;
      processShortcuts(event);
    },
    [canProcessShortcuts, processShortcuts],
  );

  /**
   * Handle keyup events to clear active shortcuts
   */
  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      setActiveShortcuts((prev) => {
        const newSet = new Set(prev);
        // Remove shortcuts that no longer match
        for (const key of newSet) {
          const config = shortcuts.get(key);
          if (config && !matchesShortcut(event, config)) {
            newSet.delete(key);
          }
        }
        return newSet;
      });
    },
    [shortcuts, matchesShortcut],
  );

  // Add event listeners
  useEffect(() => {
    if (!enabled || !targetElement) return;

    targetElement.addEventListener("keydown", handleKeyDown as EventListener);
    targetElement.addEventListener("keyup", handleKeyUp as EventListener);

    return () => {
      targetElement.removeEventListener(
        "keydown",
        handleKeyDown as EventListener,
      );
      targetElement.removeEventListener("keyup", handleKeyUp as EventListener);
    };
  }, [handleKeyDown, handleKeyUp, enabled, targetElement]);

  return {
    activeShortcuts: Array.from(activeShortcuts),
    getShortcuts,
    isShortcutActive,
    registerShortcut,
    unregisterShortcut,
  };
}

/**
 * Pre-configured hook for global application shortcuts
 *
 * This hook automatically registers common navigation shortcuts for the VetMed app.
 * Components can use this for instant access to navigation shortcuts.
 *
 * @example
 * ```tsx
 * function App() {
 *   useGlobalKeyboardShortcuts({ enabled: true });
 *   return <div>App content</div>;
 * }
 * ```
 */
export function useGlobalKeyboardShortcuts(
  options: UseKeyboardShortcutsOptions = {},
) {
  const router = useRouter();
  const { announce: _announce } = useScreenReaderAnnouncements();
  const { registerShortcut } = useKeyboardShortcuts(options);

  useEffect(() => {
    // Navigation shortcuts
    registerShortcut({
      action: () => router.push("/admin/record" as Route),
      description: "Navigating to record medication page",
      key: "Ctrl+R",
    });

    registerShortcut({
      action: () => router.push("/medications/inventory" as Route),
      description: "Navigating to inventory page",
      key: "Ctrl+I",
    });

    registerShortcut({
      action: () => router.push("/dashboard/history" as Route),
      description: "Navigating to history page",
      key: "Ctrl+H",
    });

    registerShortcut({
      action: () => router.push("/manage/animals" as Route),
      description: "Navigating to manage animals page",
      key: "Ctrl+N",
    });

    registerShortcut({
      action: () => router.push("/settings" as Route),
      description: "Navigating to settings page",
      key: "Ctrl+S",
    });

    // Search shortcut
    registerShortcut({
      action: () => {
        window.dispatchEvent(new CustomEvent("open-global-search"));
      },
      description: "Opening global search",
      key: "Ctrl+K",
    });

    // Quick actions
    registerShortcut({
      action: () => router.push("/admin/record" as Route),
      description: "Quick action: record medication",
      key: "Ctrl+Shift+A",
    });

    registerShortcut({
      action: () => {
        window.dispatchEvent(new CustomEvent("open-inventory-form"));
      },
      description: "Quick action: add inventory item",
      key: "Ctrl+Shift+I",
    });

    registerShortcut({
      action: () => router.push("/medications/regimens" as Route),
      description: "Quick action: create new regimen",
      key: "Ctrl+Shift+R",
    });

    // Menu toggle
    registerShortcut({
      action: () => {
        window.dispatchEvent(new CustomEvent("toggle-main-menu"));
      },
      description: "Toggling main menu",
      key: "Alt+M",
    });
  }, [registerShortcut, router]);
}

/**
 * Hook for contextual keyboard shortcuts based on current pathname
 *
 * @example
 * ```tsx
 * function RecordPage() {
 *   const { shortcuts } = useContextualKeyboardShortcuts();
 *   return (
 *     <div>
 *       <ShortcutsHelpDialog shortcuts={shortcuts} />
 *     </div>
 *   );
 * }
 * ```
 */
export function useContextualKeyboardShortcuts() {
  const [pathname, setPathname] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setPathname(window.location.pathname);

      const handleLocationChange = () => {
        setPathname(window.location.pathname);
      };

      window.addEventListener("popstate", handleLocationChange);
      return () => window.removeEventListener("popstate", handleLocationChange);
    }
  }, []);

  const getContextualShortcuts = useCallback((): Array<{
    key: string;
    description: string;
  }> => {
    if (pathname.includes("/admin/record")) {
      return [
        { description: "Cancel recording", key: "Escape" },
        { description: "Confirm selection", key: "Enter" },
        { description: "Hold to confirm medication", key: "Space" },
      ];
    }

    if (pathname.includes("/inventory")) {
      return [
        { description: "Add new inventory item", key: "Ctrl+Shift+I" },
        { description: "Search inventory", key: "Ctrl+K" },
      ];
    }

    if (pathname.includes("/history")) {
      return [
        { description: "Search history", key: "Ctrl+K" },
        { description: "Expand record details", key: "Enter" },
        { description: "Expand record details", key: "Space" },
      ];
    }

    return [];
  }, [pathname]);

  return {
    pathname,
    shortcuts: getContextualShortcuts(),
  };
}
