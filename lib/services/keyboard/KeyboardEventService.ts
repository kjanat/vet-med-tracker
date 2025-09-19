/**
 * KeyboardEventService - Pure functions for keyboard event handling and parsing
 */

import type { ParsedShortcut, ShortcutConfig } from "./types";

/**
 * Parse shortcut string into modifiers and key
 */
export function parseShortcut(shortcut: string): ParsedShortcut {
  const parts = shortcut.split("+");
  const key = parts[parts.length - 1] || "";
  const modifiers = {
    alt: parts.includes("Alt"),
    ctrl: parts.includes("Ctrl"),
    meta: parts.includes("Meta") || parts.includes("Cmd"),
    shift: parts.includes("Shift"),
  };
  return { key, modifiers };
}

/**
 * Check if keyboard event matches shortcut configuration
 */
export function matchesShortcut(
  event: KeyboardEvent,
  config: ShortcutConfig,
): boolean {
  const parsed = parseShortcut(config.key);

  // Check modifiers
  if (parsed.modifiers.ctrl && !(event.ctrlKey || event.metaKey)) return false;
  if (parsed.modifiers.alt && !event.altKey) return false;
  if (parsed.modifiers.shift && !event.shiftKey) return false;
  if (parsed.modifiers.meta && !event.metaKey) return false;

  // Check main key (case insensitive)
  return parsed.key
    ? event.key.toLowerCase() === parsed.key.toLowerCase()
    : false;
}

/**
 * Apply event behavior (preventDefault, stopPropagation)
 */
export function applyEventBehavior(
  event: KeyboardEvent,
  config: ShortcutConfig,
): void {
  if (config.preventDefault !== false) {
    event.preventDefault();
  }
  if (config.stopPropagation !== false) {
    event.stopPropagation();
  }
}

/**
 * Get safe target element with SSR protection
 */
export function getSafeTarget(
  target?: HTMLElement | Document | null,
): HTMLElement | Document | null {
  return target || (typeof document !== "undefined" ? document : null);
}

/**
 * Check if event key matches any of the provided shortcuts
 */
export function findMatchingShortcut(
  event: KeyboardEvent,
  shortcuts: Map<string, ShortcutConfig>,
): [string, ShortcutConfig] | null {
  for (const [key, config] of shortcuts.entries()) {
    if (config.disabled) continue;

    if (matchesShortcut(event, config)) {
      return [key, config];
    }
  }
  return null;
}

/**
 * Validate shortcut configuration
 */
export function validateShortcutConfig(config: ShortcutConfig): boolean {
  return !!(config.key && config.action && typeof config.action === "function");
}
