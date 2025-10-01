/**
 * Keyboard Navigation Testing Utility
 *
 * Provides utilities for testing and improving keyboard navigation
 * across complex forms and interactive components.
 */

export interface KeyboardTestResult {
  element: string;
  canFocus: boolean;
  hasTabIndex: boolean;
  hasAriaLabel: boolean;
  hasKeyboardHandler: boolean;
  issues: string[];
}

/**
 * Test keyboard navigation accessibility for a form
 */
export function testFormKeyboardNavigation(
  formElement: HTMLFormElement,
): KeyboardTestResult[] {
  const results: KeyboardTestResult[] = [];
  const interactiveElements = formElement.querySelectorAll(
    'input, button, select, textarea, [role="button"], [role="combobox"], [tabindex]',
  );

  interactiveElements.forEach((element, index) => {
    const tagName = element.tagName.toLowerCase();
    const role = element.getAttribute("role");
    const tabIndex = element.getAttribute("tabindex");
    const ariaLabel =
      element.getAttribute("aria-label") ||
      element.getAttribute("aria-labelledby");
    const hasKeyboardHandler =
      element.getAttribute("onkeydown") || element.getAttribute("onkeyup");

    const issues: string[] = [];

    // Check if element is focusable
    const canFocus = (element as HTMLElement).tabIndex !== -1;

    // Check for common accessibility issues
    if (tagName === "div" && role === "button" && !tabIndex) {
      issues.push('Role="button" element missing tabindex');
    }

    if (
      (tagName === "button" || role === "button") &&
      !ariaLabel &&
      !element.textContent?.trim()
    ) {
      issues.push("Button missing accessible label");
    }

    if (role === "combobox" && !element.getAttribute("aria-expanded")) {
      issues.push("Combobox missing aria-expanded attribute");
    }

    results.push({
      canFocus,
      element: `${tagName}${role ? `[role="${role}"]` : ""}${index}`,
      hasAriaLabel: Boolean(ariaLabel),
      hasKeyboardHandler: Boolean(hasKeyboardHandler),
      hasTabIndex: Boolean(tabIndex),
      issues,
    });
  });

  return results;
}

/**
 * Check if keyboard navigation follows logical order
 */
export function validateTabOrder(container: HTMLElement): {
  isLogical: boolean;
  issues: string[];
} {
  const focusableElements = container.querySelectorAll(
    'input:not([disabled]), button:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
  );

  const issues: string[] = [];
  let isLogical = true;

  // Check for tab order gaps or jumps
  let lastTabIndex = -1;
  focusableElements.forEach((element, index) => {
    const tabIndex = parseInt(element.getAttribute("tabindex") || "0", 10);

    if (tabIndex > 0 && tabIndex < lastTabIndex) {
      issues.push(
        `Tab order issue at element ${index}: tabindex ${tabIndex} after ${lastTabIndex}`,
      );
      isLogical = false;
    }

    lastTabIndex = Math.max(lastTabIndex, tabIndex);
  });

  return { isLogical, issues };
}

/**
 * Enhanced keyboard event handlers for common patterns
 */
export const keyboardHandlers = {
  /**
   * Handle arrow keys for selection lists
   */
  arrowNavigation:
    (onUp: () => void, onDown: () => void, onSelect?: () => void) =>
    (event: React.KeyboardEvent) => {
      switch (event.key) {
        case "ArrowUp":
          event.preventDefault();
          onUp();
          break;
        case "ArrowDown":
          event.preventDefault();
          onDown();
          break;
        case "Enter":
          if (onSelect) {
            event.preventDefault();
            onSelect();
          }
          break;
      }
    },
  /**
   * Handle Enter and Space for button-like elements
   */
  buttonLike: (callback: () => void) => (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      callback();
    }
  },

  /**
   * Handle Escape key for closing dialogs/modals
   */
  escapeClose: (onClose: () => void) => (event: React.KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
    }
  },
};

/**
 * Common accessibility patterns for buttons
 */
export const accessibilityPatterns = {
  /**
   * Standard button props with keyboard support
   */
  button: {
    onKeyDown: keyboardHandlers.buttonLike(() => {}), // Override with actual handler
    role: "button",
    tabIndex: 0,
  },

  /**
   * Close button with escape handling
   */
  closeButton: (onClose: () => void) => ({
    "aria-label": "Close",
    onKeyDown: keyboardHandlers.buttonLike(onClose),
    role: "button",
    tabIndex: 0,
  }),

  /**
   * Form submit button
   */
  submitButton: {
    "aria-label": "Submit form",
    type: "submit" as const,
  },
};

/**
 * WCAG 2.1 keyboard navigation compliance checker
 */
export function checkWCAGCompliance(element: HTMLElement): {
  compliant: boolean;
  level: "A" | "AA" | "AAA";
  violations: string[];
} {
  const violations: string[] = [];

  // 2.1.1 Keyboard (Level A) - All functionality available via keyboard
  const hasKeyboardAccess =
    element.tabIndex !== -1 || element.getAttribute("role") === "button";
  if (!hasKeyboardAccess && element.onclick) {
    violations.push("Interactive element without keyboard access (WCAG 2.1.1)");
  }

  // 2.1.2 No Keyboard Trap (Level A) - Focus can move away
  const hasTabIndex = element.getAttribute("tabindex");
  if (hasTabIndex === "-1" && element.getAttribute("role") === "button") {
    violations.push(
      'Button role element with tabindex="-1" may create keyboard trap (WCAG 2.1.2)',
    );
  }

  // 2.4.3 Focus Order (Level A) - Logical tab order
  // This would need container context to fully validate

  const compliant = violations.length === 0;
  const level = compliant ? "AA" : "A"; // Simplified - would need full analysis

  return { compliant, level, violations };
}
