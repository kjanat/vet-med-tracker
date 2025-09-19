/**
 * Keyboard shortcut services - modular, testable keyboard shortcut management
 */

export { FocusManagerService } from "./FocusManagerService";
export {
  applyEventBehavior,
  findMatchingShortcut,
  getSafeTarget,
  matchesShortcut,
  parseShortcut,
  validateShortcutConfig,
} from "./KeyboardEventService";
export { KeyboardShortcutService } from "./KeyboardShortcutService";
export { ShortcutRegistryService } from "./ShortcutRegistryService";

export type {
  ActiveShortcutsSet,
  FocusManagerOptions,
  KeyboardEventOptions,
  ParsedShortcut,
  ShortcutConfig,
  ShortcutExecutionContext,
  ShortcutMap,
  ShortcutRegistryOptions,
  UseKeyboardShortcutsOptions,
} from "./types";
