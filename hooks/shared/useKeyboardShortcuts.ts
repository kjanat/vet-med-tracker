"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useScreenReaderAnnouncements } from "@/components/ui/screen-reader-announcer";
import type {
  ShortcutConfig,
  UseKeyboardShortcutsOptions,
} from "@/lib/services/keyboard";
import { KeyboardShortcutService } from "@/lib/services/keyboard";

// Re-export types for backward compatibility
export type { ShortcutConfig, UseKeyboardShortcutsOptions };

/**
 * Advanced keyboard shortcuts hook with conflict resolution and focus management
 *
 * Refactored to use modular services for better testability and maintainability.
 * Maintains full backward compatibility with the original API.
 *
 * @example
 * ```tsx
 * const { registerShortcut, unregisterShortcut, isShortcutActive } = useKeyboardShortcuts({
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
  const [_shortcuts, setShortcuts] = useState<Map<string, ShortcutConfig>>(
    new Map(),
  );
  const [activeShortcuts, setActiveShortcuts] = useState<Set<string>>(
    new Set(),
  );
  const { announce } = useScreenReaderAnnouncements();
  const serviceRef = useRef<KeyboardShortcutService | null>(null);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
    serviceRef.current?.updateOptions(options);
  }, [options]);

  // Initialize service
  useEffect(() => {
    const service = new KeyboardShortcutService(
      optionsRef.current,
      (newShortcuts) => setShortcuts(new Map(newShortcuts)),
      (newActiveShortcuts) => setActiveShortcuts(new Set(newActiveShortcuts)),
      announce,
    );
    serviceRef.current = service;
    service.startListening();

    return () => {
      serviceRef.current?.destroy({ silent: true });
      serviceRef.current = null;
    };
  }, [announce]);

  /**
   * Register a new keyboard shortcut
   */
  const registerShortcut = useCallback((config: ShortcutConfig) => {
    serviceRef.current?.registerShortcut(config);
  }, []);

  /**
   * Unregister a keyboard shortcut
   */
  const unregisterShortcut = useCallback((key: string) => {
    serviceRef.current?.unregisterShortcut(key);
  }, []);

  /**
   * Check if a shortcut is currently active
   */
  const isShortcutActive = useCallback(
    (key: string) => serviceRef.current?.isShortcutActive(key) ?? false,
    [],
  );

  /**
   * Get all registered shortcuts
   */
  const getShortcuts = useCallback(
    () => serviceRef.current?.getShortcuts() ?? [],
    [],
  );

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
      action: () => router.push("/auth/admin/record" as any),
      description: "Navigating to record medication page",
      key: "Ctrl+R",
    });

    registerShortcut({
      action: () => router.push("/auth/medications/inventory" as any),
      description: "Navigating to inventory page",
      key: "Ctrl+I",
    });

    registerShortcut({
      action: () => router.push("/auth/dashboard/history" as any),
      description: "Navigating to history page",
      key: "Ctrl+H",
    });

    registerShortcut({
      action: () => router.push("/auth/manage/animals" as any),
      description: "Navigating to manage animals page",
      key: "Ctrl+N",
    });

    registerShortcut({
      action: () => router.push("/auth/settings" as any),
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
      action: () => router.push("/auth/admin/record" as any),
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
      action: () => router.push("/auth/medications/regimens" as any),
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
