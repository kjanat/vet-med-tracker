export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  metaKey?: boolean;
  description: string;
  handler: () => void;
}

export class KeyboardService {
  private static shortcuts: Map<string, KeyboardShortcut> = new Map();
  private static isInitialized = false;

  static initialize(): void {
    if (KeyboardService.isInitialized || typeof window === "undefined") return;

    document.addEventListener(
      "keydown",
      KeyboardService.handleKeyDown.bind(KeyboardService),
    );
    KeyboardService.isInitialized = true;
  }

  static registerShortcut(shortcut: KeyboardShortcut): void {
    const key = KeyboardService.getShortcutKey(shortcut);
    KeyboardService.shortcuts.set(key, shortcut);
  }

  static unregisterShortcut(shortcut: KeyboardShortcut): void {
    const key = KeyboardService.getShortcutKey(shortcut);
    KeyboardService.shortcuts.delete(key);
  }

  static getRegisteredShortcuts(): KeyboardShortcut[] {
    return Array.from(KeyboardService.shortcuts.values());
  }

  private static getShortcutKey(shortcut: KeyboardShortcut): string {
    const modifiers = [];
    if (shortcut.ctrlKey) modifiers.push("ctrl");
    if (shortcut.altKey) modifiers.push("alt");
    if (shortcut.shiftKey) modifiers.push("shift");
    if (shortcut.metaKey) modifiers.push("meta");

    return `${modifiers.join("+")}-${shortcut.key.toLowerCase()}`;
  }

  private static handleKeyDown(event: KeyboardEvent): void {
    // Don't trigger shortcuts when typing in inputs
    const target = event.target as HTMLElement;
    if (
      target.tagName === "INPUT" ||
      target.tagName === "TEXTAREA" ||
      target.isContentEditable
    ) {
      return;
    }

    const key = KeyboardService.getShortcutKey({
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      description: "",
      handler: () => {},
      key: event.key,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
    });

    const shortcut = KeyboardService.shortcuts.get(key);
    if (shortcut) {
      event.preventDefault();
      shortcut.handler();
    }
  }

  static cleanup(): void {
    if (typeof window !== "undefined") {
      document.removeEventListener(
        "keydown",
        KeyboardService.handleKeyDown.bind(KeyboardService),
      );
    }
    KeyboardService.shortcuts.clear();
    KeyboardService.isInitialized = false;
  }
}
