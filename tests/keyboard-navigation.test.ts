/**
 * Keyboard Navigation Testing Suite
 *
 * Tests the keyboard navigation utilities created for the button analysis
 * quality improvements. Validates WCAG 2.1 compliance and accessibility.
 */

import { JSDOM } from "jsdom";
import {
  accessibilityPatterns,
  checkWCAGCompliance,
  keyboardHandlers,
  testFormKeyboardNavigation,
  validateTabOrder,
} from "@/lib/utils/keyboard-navigation";

// Setup DOM environment for testing
const dom = new JSDOM("<!DOCTYPE html><html><body></body></html>");
global.window = dom.window as any;
global.document = dom.window.document;

describe("Keyboard Navigation Utilities", () => {
  let container: HTMLElement;
  let form: HTMLFormElement;

  beforeEach(() => {
    container = document.createElement("div");
    form = document.createElement("form");
    container.appendChild(form);
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("testFormKeyboardNavigation", () => {
    it("should identify focusable elements correctly", () => {
      // Create a complex form similar to the regimen form
      form.innerHTML = `
        <input type="text" name="animalId" />
        <button type="button">Select Medication</button>
        <select name="scheduleType">
          <option value="FIXED">Fixed</option>
          <option value="PRN">PRN</option>
        </select>
        <input type="time" name="newTime" />
        <button type="button">Add Time</button>
        <input type="date" name="startDate" />
        <input type="date" name="endDate" />
        <input type="checkbox" name="highRisk" />
        <textarea name="notes"></textarea>
        <button type="submit">Save Regimen</button>
        <button type="button">Cancel</button>
      `;

      const results = testFormKeyboardNavigation(form);

      expect(results).toHaveLength(11); // All interactive elements
      expect(results.every((result) => result.canFocus)).toBe(true);
      expect(
        results.filter((result) => result.element.includes("button")).length,
      ).toBe(4);
      expect(
        results.filter((result) => result.element.includes("input")).length,
      ).toBe(5);
    });

    it("should detect accessibility issues", () => {
      form.innerHTML = `
        <div role="button">No tabindex</div>
        <button></button>
        <div role="combobox">Missing aria-expanded</div>
      `;

      const results = testFormKeyboardNavigation(form);

      // Find the div role="button" element
      const buttonWithoutTabindex = results.find((r) =>
        r.element.includes('div[role="button"]'),
      );
      expect(buttonWithoutTabindex?.issues).toContain(
        'Role="button" element missing tabindex',
      );

      // Find the actual button element (not the div) - button with no text and no aria-label
      const emptyLabelButton = results.find(
        (r) => r.element.includes("button") && !r.element.includes("div"),
      );
      expect(emptyLabelButton?.issues).toContain(
        "Button missing accessible label",
      );

      const comboboxMissingExpanded = results.find((r) =>
        r.element.includes('div[role="combobox"]'),
      );
      expect(comboboxMissingExpanded?.issues).toContain(
        "Combobox missing aria-expanded attribute",
      );
    });
  });

  describe("validateTabOrder", () => {
    it("should validate logical tab order", () => {
      container.innerHTML = `
        <input tabindex="1" />
        <input tabindex="2" />
        <input tabindex="3" />
        <button>Regular button</button>
      `;

      const result = validateTabOrder(container);
      expect(result.isLogical).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it("should detect tab order issues", () => {
      container.innerHTML = `
        <input tabindex="1" />
        <input tabindex="5" />
        <input tabindex="2" />
      `;

      const result = validateTabOrder(container);
      expect(result.isLogical).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]).toContain("Tab order issue");
    });
  });

  describe("keyboardHandlers", () => {
    it("should handle button-like keyboard events", () => {
      const mockCallback = jest.fn();
      const handler = keyboardHandlers.buttonLike(mockCallback);

      // Test Enter key
      const enterEvent = new dom.window.KeyboardEvent("keydown", {
        key: "Enter",
      });
      Object.defineProperty(enterEvent, "preventDefault", { value: jest.fn() });
      handler(enterEvent as any);
      expect(mockCallback).toHaveBeenCalledTimes(1);

      // Test Space key
      const spaceEvent = new dom.window.KeyboardEvent("keydown", { key: " " });
      Object.defineProperty(spaceEvent, "preventDefault", { value: jest.fn() });
      handler(spaceEvent as any);
      expect(mockCallback).toHaveBeenCalledTimes(2);

      // Test other key (should not trigger)
      const tabEvent = new dom.window.KeyboardEvent("keydown", { key: "Tab" });
      handler(tabEvent as any);
      expect(mockCallback).toHaveBeenCalledTimes(2);
    });

    it("should handle arrow navigation", () => {
      const mockUp = jest.fn();
      const mockDown = jest.fn();
      const mockSelect = jest.fn();
      const handler = keyboardHandlers.arrowNavigation(
        mockUp,
        mockDown,
        mockSelect,
      );

      // Test ArrowUp
      const upEvent = new dom.window.KeyboardEvent("keydown", {
        key: "ArrowUp",
      });
      Object.defineProperty(upEvent, "preventDefault", { value: jest.fn() });
      handler(upEvent as any);
      expect(mockUp).toHaveBeenCalledTimes(1);

      // Test ArrowDown
      const downEvent = new dom.window.KeyboardEvent("keydown", {
        key: "ArrowDown",
      });
      Object.defineProperty(downEvent, "preventDefault", { value: jest.fn() });
      handler(downEvent as any);
      expect(mockDown).toHaveBeenCalledTimes(1);

      // Test Enter for selection
      const enterEvent = new dom.window.KeyboardEvent("keydown", {
        key: "Enter",
      });
      Object.defineProperty(enterEvent, "preventDefault", { value: jest.fn() });
      handler(enterEvent as any);
      expect(mockSelect).toHaveBeenCalledTimes(1);
    });

    it("should handle escape key for closing", () => {
      const mockClose = jest.fn();
      const handler = keyboardHandlers.escapeClose(mockClose);

      const escapeEvent = new dom.window.KeyboardEvent("keydown", {
        key: "Escape",
      });
      Object.defineProperty(escapeEvent, "preventDefault", {
        value: jest.fn(),
      });
      handler(escapeEvent as any);
      expect(mockClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("checkWCAGCompliance", () => {
    it("should validate WCAG compliance", () => {
      const compliantButton = document.createElement("button");
      compliantButton.textContent = "Test Button";
      compliantButton.setAttribute("aria-label", "Test action");

      const result = checkWCAGCompliance(compliantButton);
      expect(result.compliant).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("should detect WCAG violations", () => {
      const problematicDiv = document.createElement("div");
      problematicDiv.onclick = () => {}; // Interactive but no keyboard access
      problematicDiv.setAttribute("tabindex", "-1");
      problematicDiv.setAttribute("role", "button");

      const result = checkWCAGCompliance(problematicDiv);
      expect(result.compliant).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
    });
  });

  describe("accessibilityPatterns", () => {
    it("should provide correct button patterns", () => {
      const pattern = accessibilityPatterns.button;
      expect(pattern.role).toBe("button");
      expect(pattern.tabIndex).toBe(0);
      expect(pattern.onKeyDown).toBeDefined();
    });

    it("should provide correct close button patterns", () => {
      const mockClose = jest.fn();
      const pattern = accessibilityPatterns.closeButton(mockClose);
      expect(pattern.role).toBe("button");
      expect(pattern.tabIndex).toBe(0);
      expect(pattern["aria-label"]).toBe("Close");
      expect(pattern.onKeyDown).toBeDefined();
    });

    it("should provide correct submit button patterns", () => {
      const pattern = accessibilityPatterns.submitButton;
      expect(pattern.type).toBe("submit");
      expect(pattern["aria-label"]).toBe("Submit form");
    });
  });
});

// Integration test with AccessibleButton component
describe("AccessibleButton Integration", () => {
  it("should work with the keyboard navigation utilities", () => {
    // This test would normally be in a separate file with React Testing Library
    // but we're demonstrating the utility integration here
    const mockForm = document.createElement("form");

    // Simulate an AccessibleButton being tested
    const button = document.createElement("button");
    button.setAttribute("role", "button");
    button.setAttribute("tabindex", "0");
    button.setAttribute("aria-label", "Test accessible button");
    button.textContent = "Test Button";
    mockForm.appendChild(button);

    const results = testFormKeyboardNavigation(mockForm);
    const buttonResult = results.find((r) => r.element.includes("button"));

    expect(buttonResult?.canFocus).toBe(true);
    expect(buttonResult?.hasTabIndex).toBe(true);
    expect(buttonResult?.hasAriaLabel).toBe(true);
    expect(buttonResult?.issues).toHaveLength(0);

    // Test WCAG compliance
    const wcagResult = checkWCAGCompliance(button);
    expect(wcagResult.compliant).toBe(true);
  });
});
