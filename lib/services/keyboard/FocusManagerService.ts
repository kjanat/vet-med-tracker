/**
 * FocusManagerService - Focus and context management for keyboard shortcuts
 */

import type { FocusManagerOptions } from "./types";

export class FocusManagerService {
  private respectInputs: boolean;
  private inputSelector: string;

  constructor(options: FocusManagerOptions = {}) {
    this.respectInputs = options.respectInputs ?? true;
    this.inputSelector =
      options.inputSelector ?? "input, textarea, select, [contenteditable]";
  }

  /**
   * Check if the provided element is an input element
   */
  isInputElement(element: Element | null): boolean {
    if (!element || !this.respectInputs) return false;
    return element.matches(this.inputSelector);
  }

  /**
   * Check if the current context allows shortcuts to be processed
   */
  canProcessShortcuts(event: KeyboardEvent, enabled: boolean): boolean {
    if (!enabled) return false;

    if (typeof document !== "undefined") {
      const activeElement = document.activeElement;
      // Allow Escape key even in input fields
      if (this.isInputElement(activeElement) && event.key !== "Escape") {
        return false;
      }
    }

    return true;
  }

  /**
   * Get the currently active element
   */
  static getActiveElement(): Element | null {
    return typeof document !== "undefined" ? document.activeElement : null;
  }

  /**
   * Check if the active element is editable
   */
  static isActiveElementEditable(): boolean {
    const activeElement = FocusManagerService.getActiveElement();
    if (!activeElement) return false;

    return (
      activeElement.tagName === "INPUT" ||
      activeElement.tagName === "TEXTAREA" ||
      activeElement.tagName === "SELECT" ||
      activeElement.getAttribute("contenteditable") === "true"
    );
  }

  /**
   * Update focus manager options
   */
  updateOptions(options: Partial<FocusManagerOptions>): void {
    if (options.respectInputs !== undefined) {
      this.respectInputs = options.respectInputs;
    }
    if (options.inputSelector !== undefined) {
      this.inputSelector = options.inputSelector;
    }
  }

  /**
   * Create a new focus manager with different options
   */
  static create(options: FocusManagerOptions = {}): FocusManagerService {
    return new FocusManagerService(options);
  }
}
