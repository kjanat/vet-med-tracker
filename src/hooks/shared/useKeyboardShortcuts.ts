"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useScreenReaderAnnouncements } from "@/components/ui/screen-reader-announcer";
import type {
  ShortcutConfig,
  UseKeyboardShortcutsOptions,
} from "@/lib/services/keyboard";
import { KeyboardService } from "@/lib/services/keyboard";

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
  const serviceRef = useRef<KeyboardService | null>(null);
  const optionsRef = useRef(options);

  useEffect(() => {
    optionsRef.current = options;
    serviceRef.current?.updateOptions(options);
  }, [options]);

  // Initialize service
  useEffect(() => {
    const service = new KeyboardService(
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
