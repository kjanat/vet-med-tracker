/**
 * ShortcutRegistryService - Manages shortcut registration, state, and conflict resolution
 */

import type {
  ActiveShortcutsSet,
  ShortcutConfig,
  ShortcutExecutionContext,
  ShortcutMap,
} from "./types";

export class ShortcutRegistryService {
  private shortcuts: ShortcutMap = new Map();
  private activeShortcuts: ActiveShortcutsSet = new Set();
  private readonly onShortcutsChange?: (shortcuts: ShortcutMap) => void;
  private readonly onActiveShortcutsChange?: (
    active: ActiveShortcutsSet,
  ) => void;

  constructor(
    onShortcutsChange?: (shortcuts: ShortcutMap) => void,
    onActiveShortcutsChange?: (active: ActiveShortcutsSet) => void,
  ) {
    this.onShortcutsChange = onShortcutsChange;
    this.onActiveShortcutsChange = onActiveShortcutsChange;
  }

  /**
   * Register a new keyboard shortcut
   */
  registerShortcut(config: ShortcutConfig): void {
    const newMap = new Map(this.shortcuts);
    newMap.set(config.key, config);
    this.shortcuts = newMap;
    this.onShortcutsChange?.(this.shortcuts);
  }

  /**
   * Unregister a keyboard shortcut
   */
  unregisterShortcut(key: string): void {
    const newMap = new Map(this.shortcuts);
    newMap.delete(key);
    this.shortcuts = newMap;
    this.onShortcutsChange?.(this.shortcuts);
  }

  /**
   * Check if a shortcut is currently active
   */
  isShortcutActive(key: string): boolean {
    return this.activeShortcuts.has(key);
  }

  /**
   * Get all registered shortcuts
   */
  getShortcuts(): ShortcutConfig[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get shortcuts map for iteration
   */
  getShortcutsMap(): ShortcutMap {
    return this.shortcuts;
  }

  /**
   * Get active shortcuts as array
   */
  getActiveShortcuts(): string[] {
    return Array.from(this.activeShortcuts);
  }

  /**
   * Mark a shortcut as active
   */
  setShortcutActive(key: string): void {
    const newSet = new Set(this.activeShortcuts);
    newSet.add(key);
    this.activeShortcuts = newSet;
    this.onActiveShortcutsChange?.(this.activeShortcuts);
  }

  /**
   * Remove shortcut from active set if it no longer matches the event
   */
  updateActiveShortcuts(
    event: KeyboardEvent,
    matchesShortcut: (event: KeyboardEvent, config: ShortcutConfig) => boolean,
  ): void {
    const newSet = new Set(this.activeShortcuts);
    let hasChanges = false;

    for (const key of newSet) {
      const config = this.shortcuts.get(key);
      if (config && !matchesShortcut(event, config)) {
        newSet.delete(key);
        hasChanges = true;
      }
    }

    if (hasChanges) {
      this.activeShortcuts = newSet;
      this.onActiveShortcutsChange?.(this.activeShortcuts);
    }
  }

  /**
   * Execute a shortcut action with error handling
   */
  executeShortcut(
    context: ShortcutExecutionContext,
    announce?: (message: string, priority?: "polite" | "assertive") => void,
  ): void {
    const { config, key } = context;

    // Mark shortcut as active
    this.setShortcutActive(key);

    try {
      // Execute the action
      config.action();

      // Announce to screen readers if available
      if (config.description && announce) {
        announce(config.description, "polite");
      }
    } catch (error) {
      console.error(`Error executing shortcut ${key}:`, error);
    }
  }

  /**
   * Check for potential conflicts in shortcut registrations
   */
  getShortcutConflicts(): Array<{ key: string; count: number }> {
    const keyCount = new Map<string, number>();

    for (const config of this.shortcuts.values()) {
      const count = keyCount.get(config.key) || 0;
      keyCount.set(config.key, count + 1);
    }

    return Array.from(keyCount.entries())
      .filter(([, count]) => count > 1)
      .map(([key, count]) => ({ count, key }));
  }

  /**
   * Clear all shortcuts
   */
  clear({ silent = false }: { silent?: boolean } = {}): void {
    this.shortcuts.clear();
    this.activeShortcuts.clear();

    if (silent) {
      return;
    }

    this.onShortcutsChange?.(this.shortcuts);
    this.onActiveShortcutsChange?.(this.activeShortcuts);
  }

  /**
   * Get shortcuts by pattern (useful for debugging)
   */
  getShortcutsByPattern(pattern: string): ShortcutConfig[] {
    return Array.from(this.shortcuts.values()).filter(
      (config) =>
        config.key.includes(pattern) ||
        config.description.toLowerCase().includes(pattern.toLowerCase()),
    );
  }

  /**
   * Bulk register shortcuts
   */
  registerMultipleShortcuts(configs: ShortcutConfig[]): void {
    const newMap = new Map(this.shortcuts);
    for (const config of configs) {
      newMap.set(config.key, config);
    }
    this.shortcuts = newMap;
    this.onShortcutsChange?.(this.shortcuts);
  }
}
