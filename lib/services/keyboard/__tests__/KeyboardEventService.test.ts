import { describe, expect, it } from "bun:test";
import {
  findMatchingShortcut,
  matchesShortcut,
  parseShortcut,
  validateShortcutConfig,
} from "../KeyboardEventService";
import type { ShortcutConfig } from "../types";

describe("KeyboardEventService", () => {
  describe("parseShortcut", () => {
    it("should parse simple key", () => {
      const result = parseShortcut("k");
      expect(result).toEqual({
        key: "k",
        modifiers: { alt: false, ctrl: false, meta: false, shift: false },
      });
    });

    it("should parse complex shortcut", () => {
      const result = parseShortcut("Ctrl+Shift+K");
      expect(result).toEqual({
        key: "K",
        modifiers: { alt: false, ctrl: true, meta: false, shift: true },
      });
    });

    it("should handle Meta/Cmd equivalence", () => {
      const meta = parseShortcut("Meta+K");
      const cmd = parseShortcut("Cmd+K");
      expect(meta.modifiers.meta).toBe(true);
      expect(cmd.modifiers.meta).toBe(true);
    });
  });

  describe("matchesShortcut", () => {
    const mockEvent = (props: Partial<KeyboardEvent>) =>
      ({
        altKey: false,
        ctrlKey: false,
        key: "k",
        metaKey: false,
        shiftKey: false,
        ...props,
      }) as KeyboardEvent;

    it("should match simple key", () => {
      const config: ShortcutConfig = {
        action: () => {},
        description: "test",
        key: "k",
      };
      const event = mockEvent({ key: "k" });
      expect(matchesShortcut(event, config)).toBe(true);
    });

    it("should match Ctrl+K", () => {
      const config: ShortcutConfig = {
        action: () => {},
        description: "test",
        key: "Ctrl+K",
      };
      const event = mockEvent({ ctrlKey: true, key: "K" });
      expect(matchesShortcut(event, config)).toBe(true);
    });

    it("should not match without required modifiers", () => {
      const config: ShortcutConfig = {
        action: () => {},
        description: "test",
        key: "Ctrl+K",
      };
      const event = mockEvent({ ctrlKey: false, key: "K" });
      expect(matchesShortcut(event, config)).toBe(false);
    });

    it("should be case insensitive", () => {
      const config: ShortcutConfig = {
        action: () => {},
        description: "test",
        key: "K",
      };
      const event = mockEvent({ key: "k" });
      expect(matchesShortcut(event, config)).toBe(true);
    });
  });

  describe("validateShortcutConfig", () => {
    it("should validate valid config", () => {
      const config: ShortcutConfig = {
        action: () => {},
        description: "test",
        key: "k",
      };
      expect(validateShortcutConfig(config)).toBe(true);
    });

    it("should reject config without key", () => {
      const config = {
        action: () => {},
        description: "test",
        key: "",
      } as ShortcutConfig;
      expect(validateShortcutConfig(config)).toBe(false);
    });

    it("should reject config without action", () => {
      const config = {
        action: null,
        description: "test",
        key: "k",
      } as unknown as ShortcutConfig;
      expect(validateShortcutConfig(config)).toBe(false);
    });
  });

  describe("findMatchingShortcut", () => {
    it("should find matching shortcut", () => {
      const config: ShortcutConfig = {
        action: () => {},
        description: "test",
        key: "k",
      };
      const shortcuts = new Map([["k", config]]);
      const event = { key: "k" } as KeyboardEvent;

      const result = findMatchingShortcut(event, shortcuts);
      expect(result).toEqual(["k", config]);
    });

    it("should return null for no match", () => {
      const shortcuts = new Map();
      const event = { key: "k" } as KeyboardEvent;

      const result = findMatchingShortcut(event, shortcuts);
      expect(result).toBeNull();
    });

    it("should skip disabled shortcuts", () => {
      const config: ShortcutConfig = {
        action: () => {},
        description: "test",
        disabled: true,
        key: "k",
      };
      const shortcuts = new Map([["k", config]]);
      const event = { key: "k" } as KeyboardEvent;

      const result = findMatchingShortcut(event, shortcuts);
      expect(result).toBeNull();
    });
  });
});
