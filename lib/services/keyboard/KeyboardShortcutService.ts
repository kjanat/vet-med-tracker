/**
 * KeyboardShortcutService - Main orchestrator service that composes other services
 */

import { FocusManagerService } from "./FocusManagerService";
import {
  applyEventBehavior,
  findMatchingShortcut,
  getSafeTarget,
  matchesShortcut,
  validateShortcutConfig,
} from "./KeyboardEventService";
import { ShortcutRegistryService } from "./ShortcutRegistryService";
import type {
  ActiveShortcutsSet,
  ShortcutConfig,
  ShortcutMap,
  UseKeyboardShortcutsOptions,
} from "./types";

export class KeyboardShortcutService {
  private focusManager: FocusManagerService;
  private registry: ShortcutRegistryService;
  private enabled: boolean;
  private targetElement: HTMLElement | Document | null;
  private eventHandlers: {
    keydown?: (event: KeyboardEvent) => void;
    keyup?: (event: KeyboardEvent) => void;
  } = {};

  constructor(
    options: UseKeyboardShortcutsOptions = {},
    onShortcutsChange?: (shortcuts: ShortcutMap) => void,
    onActiveShortcutsChange?: (active: ActiveShortcutsSet) => void,
    announce?: (message: string, priority?: "polite" | "assertive") => void,
  ) {
    const {
      enabled = true,
      target,
      respectInputs = true,
      inputSelector = "input, textarea, select, [contenteditable]",
    } = options;

    this.enabled = enabled;
    this.targetElement = getSafeTarget(target);
    this.focusManager = new FocusManagerService({
      inputSelector,
      respectInputs,
    });
    this.registry = new ShortcutRegistryService(
      onShortcutsChange,
      onActiveShortcutsChange,
    );

    // Set up event handlers
    this.setupEventHandlers(announce);
  }

  private setupEventHandlers(
    announce?: (message: string, priority?: "polite" | "assertive") => void,
  ): void {
    this.eventHandlers.keydown = (event: KeyboardEvent) => {
      if (!this.focusManager.canProcessShortcuts(event, this.enabled)) return;

      const match = findMatchingShortcut(
        event,
        this.registry.getShortcutsMap(),
      );
      if (match) {
        const [key, config] = match;
        applyEventBehavior(event, config);
        this.registry.executeShortcut({ config, event, key }, announce);
      }
    };

    this.eventHandlers.keyup = (event: KeyboardEvent) => {
      this.registry.updateActiveShortcuts(event, matchesShortcut);
    };
  }

  /**
   * Start listening for keyboard events
   */
  startListening(): void {
    if (!this.enabled || !this.targetElement) return;

    if (this.eventHandlers.keydown) {
      this.targetElement.addEventListener(
        "keydown",
        this.eventHandlers.keydown as EventListener,
      );
    }
    if (this.eventHandlers.keyup) {
      this.targetElement.addEventListener(
        "keyup",
        this.eventHandlers.keyup as EventListener,
      );
    }
  }

  /**
   * Stop listening for keyboard events
   */
  stopListening(): void {
    if (!this.targetElement) return;

    if (this.eventHandlers.keydown) {
      this.targetElement.removeEventListener(
        "keydown",
        this.eventHandlers.keydown as EventListener,
      );
    }
    if (this.eventHandlers.keyup) {
      this.targetElement.removeEventListener(
        "keyup",
        this.eventHandlers.keyup as EventListener,
      );
    }
  }

  /**
   * Update service options
   */
  updateOptions(options: Partial<UseKeyboardShortcutsOptions>): void {
    if (options.enabled !== undefined) {
      this.enabled = options.enabled;
    }

    if (options.target !== undefined) {
      // Stop listening on old target
      this.stopListening();

      // Update target
      this.targetElement = getSafeTarget(options.target);

      // Start listening on new target
      this.startListening();
    }

    // Update focus manager
    this.focusManager.updateOptions({
      inputSelector: options.inputSelector,
      respectInputs: options.respectInputs,
    });
  }

  /**
   * Register a shortcut
   */
  registerShortcut(config: ShortcutConfig): void {
    if (validateShortcutConfig(config)) {
      this.registry.registerShortcut(config);
    } else {
      console.warn("Invalid shortcut configuration:", config);
    }
  }

  /**
   * Unregister a shortcut
   */
  unregisterShortcut(key: string): void {
    this.registry.unregisterShortcut(key);
  }

  /**
   * Check if shortcut is active
   */
  isShortcutActive(key: string): boolean {
    return this.registry.isShortcutActive(key);
  }

  /**
   * Get all shortcuts
   */
  getShortcuts(): ShortcutConfig[] {
    return this.registry.getShortcuts();
  }

  /**
   * Get active shortcuts
   */
  getActiveShortcuts(): string[] {
    return this.registry.getActiveShortcuts();
  }

  /**
   * Get registry for advanced operations
   */
  getRegistry(): ShortcutRegistryService {
    return this.registry;
  }

  /**
   * Get focus manager for advanced operations
   */
  getFocusManager(): FocusManagerService {
    return this.focusManager;
  }

  /**
   * Cleanup service
   */
  destroy({ silent = false }: { silent?: boolean } = {}): void {
    this.stopListening();
    this.registry.clear({ silent });
  }
}
