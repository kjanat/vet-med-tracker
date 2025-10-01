export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  description: string;
  handler: () => void;
}

export interface ShortcutConfig {
  key: string;
  description: string;
  action: () => void;
}

export interface UseKeyboardShortcutsOptions {
  enabled?: boolean;
  respectInputs?: boolean;
}

export class KeyboardService {
  private shortcuts: Map<string, ShortcutConfig> = new Map();
  private activeShortcuts: Set<string> = new Set();
  private options: UseKeyboardShortcutsOptions;
  private readonly onShortcutsChange: (
    shortcuts: Map<string, ShortcutConfig>,
  ) => void;
  private readonly onActiveChange: (active: Set<string>) => void;
  private readonly announce: (message: string) => void;
  private readonly handleKeyDownBound: (event: KeyboardEvent) => void;

  constructor(
    options: UseKeyboardShortcutsOptions,
    onShortcutsChange: (shortcuts: Map<string, ShortcutConfig>) => void,
    onActiveChange: (active: Set<string>) => void,
    announce: (message: string) => void,
  ) {
    this.options = options;
    this.onShortcutsChange = onShortcutsChange;
    this.onActiveChange = onActiveChange;
    this.announce = announce;
    this.handleKeyDownBound = this.handleKeyDown.bind(this);
  }

  updateOptions(options: UseKeyboardShortcutsOptions): void {
    this.options = options;
  }

  startListening(): void {
    if (typeof window !== "undefined") {
      document.addEventListener("keydown", this.handleKeyDownBound);
    }
  }

  destroy(options?: { silent?: boolean }): void {
    if (typeof window !== "undefined") {
      document.removeEventListener("keydown", this.handleKeyDownBound);
    }
    if (!options?.silent) {
      this.shortcuts.clear();
      this.activeShortcuts.clear();
    }
  }

  registerShortcut(config: ShortcutConfig): void {
    this.shortcuts.set(config.key, config);
    this.onShortcutsChange(this.shortcuts);
  }

  unregisterShortcut(key: string): void {
    this.shortcuts.delete(key);
    this.onShortcutsChange(this.shortcuts);
  }

  isShortcutActive(key: string): boolean {
    return this.activeShortcuts.has(key);
  }

  getShortcuts(): ShortcutConfig[] {
    return Array.from(this.shortcuts.values());
  }

  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.options.enabled) return;

    // Don't trigger shortcuts when typing in inputs
    if (this.options.respectInputs) {
      const target = event.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }
    }

    const key = this.buildShortcutKey(event);
    const shortcut = this.shortcuts.get(key);

    if (shortcut) {
      event.preventDefault();
      this.activeShortcuts.add(key);
      this.onActiveChange(this.activeShortcuts);
      this.announce(shortcut.description);
      shortcut.action();

      setTimeout(() => {
        this.activeShortcuts.delete(key);
        this.onActiveChange(this.activeShortcuts);
      }, 500);
    }
  }

  private buildShortcutKey(event: KeyboardEvent): string {
    const parts = [];
    if (event.ctrlKey) parts.push("Ctrl");
    if (event.altKey) parts.push("Alt");
    if (event.shiftKey) parts.push("Shift");
    if (event.metaKey) parts.push("Meta");
    parts.push(event.key);
    return parts.join("+");
  }
}

// Legacy static methods for backward compatibility
export const KeyboardServiceLegacy = {
  cleanup(): void {
    if (typeof window !== "undefined") {
      document.removeEventListener(
        "keydown",
        KeyboardServiceLegacy.handleKeyDown.bind(KeyboardServiceLegacy),
      );
    }
    KeyboardServiceLegacy.shortcuts.clear();
    KeyboardServiceLegacy.isInitialized = false;
  },

  getRegisteredShortcuts(): KeyboardShortcut[] {
    return Array.from(KeyboardServiceLegacy.shortcuts.values());
  },

  getShortcutKey(shortcut: KeyboardShortcut): string {
    const modifiers = [];
    if (shortcut.ctrlKey) modifiers.push("ctrl");
    if (shortcut.altKey) modifiers.push("alt");
    if (shortcut.shiftKey) modifiers.push("shift");
    if (shortcut.metaKey) modifiers.push("meta");
    return `${modifiers.join("+")}-${shortcut.key.toLowerCase()}`;
  },

  handleKeyDown(event: KeyboardEvent): void {
    const target = event.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      return;
    }

    const key = KeyboardServiceLegacy.getShortcutKey({
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      description: "",
      handler: () => {},
      key: event.key,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
    });

    const shortcut = KeyboardServiceLegacy.shortcuts.get(key);
    if (shortcut) {
      event.preventDefault();
      shortcut.handler();
    }
  },

  initialize(): void {
    if (KeyboardServiceLegacy.isInitialized || typeof window === "undefined")
      return;
    document.addEventListener(
      "keydown",
      KeyboardServiceLegacy.handleKeyDown.bind(KeyboardServiceLegacy),
    );
    KeyboardServiceLegacy.isInitialized = true;
  },
  isInitialized: false,

  registerShortcut(shortcut: KeyboardShortcut): void {
    const key = KeyboardServiceLegacy.getShortcutKey(shortcut);
    KeyboardServiceLegacy.shortcuts.set(key, shortcut);
  },
  shortcuts: new Map<string, KeyboardShortcut>(),

  unregisterShortcut(shortcut: KeyboardShortcut): void {
    const key = KeyboardServiceLegacy.getShortcutKey(shortcut);
    KeyboardServiceLegacy.shortcuts.delete(key);
  },
};
