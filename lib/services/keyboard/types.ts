/**
 * Core types and interfaces for keyboard shortcut services
 */

export interface ShortcutConfig {
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

export interface ParsedShortcut {
  key: string;
  modifiers: {
    alt: boolean;
    ctrl: boolean;
    meta: boolean;
    shift: boolean;
  };
}

export interface KeyboardEventOptions {
  preventDefault?: boolean;
  stopPropagation?: boolean;
}

export interface FocusManagerOptions {
  respectInputs?: boolean;
  inputSelector?: string;
}

export interface ShortcutRegistryOptions {
  enabled?: boolean;
  target?: HTMLElement | Document | null;
}

export interface UseKeyboardShortcutsOptions
  extends FocusManagerOptions,
    ShortcutRegistryOptions {
  /** Target element for event listeners (defaults to document) */
  target?: HTMLElement | Document | null;
}

export type ShortcutExecutionContext = {
  event: KeyboardEvent;
  config: ShortcutConfig;
  key: string;
};

export type ShortcutMap = Map<string, ShortcutConfig>;
export type ActiveShortcutsSet = Set<string>;
