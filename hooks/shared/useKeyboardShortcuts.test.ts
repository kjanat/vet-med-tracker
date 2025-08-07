/**
 * @vitest-environment jsdom
 */

import { act, renderHook } from "@testing-library/react";
import { vi } from "vitest";
import {
	useGlobalKeyboardShortcuts,
	useKeyboardShortcuts,
} from "./useKeyboardShortcuts";

// Mock dependencies
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
	}),
}));

vi.mock("@/components/ui/screen-reader-announcer", () => ({
	useScreenReaderAnnouncements: () => ({
		announce: vi.fn(),
	}),
}));

describe("useKeyboardShortcuts", () => {
	let mockKeydownEvent: KeyboardEvent;

	beforeEach(() => {
		// Clean up document listeners
		vi.clearAllMocks();
		mockKeydownEvent = new KeyboardEvent("keydown", {
			key: "k",
			ctrlKey: true,
			bubbles: true,
			cancelable: true,
		});
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	it("should register and execute keyboard shortcuts", () => {
		const mockCallback = vi.fn();
		const { result } = renderHook(() => useKeyboardShortcuts());

		act(() => {
			result.current.registerShortcut({
				key: "Ctrl+K",
				description: "Test shortcut",
				action: mockCallback,
			});
		});

		act(() => {
			document.dispatchEvent(mockKeydownEvent);
		});

		expect(mockCallback).toHaveBeenCalledTimes(1);
	});

	it("should unregister keyboard shortcuts", () => {
		const mockCallback = vi.fn();
		const { result } = renderHook(() => useKeyboardShortcuts());

		act(() => {
			result.current.registerShortcut({
				key: "Ctrl+K",
				description: "Test shortcut",
				action: mockCallback,
			});
		});

		act(() => {
			result.current.unregisterShortcut("Ctrl+K");
		});

		act(() => {
			document.dispatchEvent(mockKeydownEvent);
		});

		expect(mockCallback).not.toHaveBeenCalled();
	});

	it("should respect input elements when respectInputs is true", () => {
		const mockCallback = vi.fn();
		const { result } = renderHook(() =>
			useKeyboardShortcuts({ respectInputs: true }),
		);

		// Mock active element as input
		const mockInput = document.createElement("input");
		vi.spyOn(document, "activeElement", "get").mockReturnValue(mockInput);

		act(() => {
			result.current.registerShortcut({
				key: "Ctrl+K",
				description: "Test shortcut",
				action: mockCallback,
			});
		});

		act(() => {
			document.dispatchEvent(mockKeydownEvent);
		});

		expect(mockCallback).not.toHaveBeenCalled();
	});

	it("should allow shortcuts in input elements when respectInputs is false", () => {
		const mockCallback = vi.fn();
		const { result } = renderHook(() =>
			useKeyboardShortcuts({ respectInputs: false }),
		);

		// Mock active element as input
		const mockInput = document.createElement("input");
		vi.spyOn(document, "activeElement", "get").mockReturnValue(mockInput);

		act(() => {
			result.current.registerShortcut({
				key: "Ctrl+K",
				description: "Test shortcut",
				action: mockCallback,
			});
		});

		act(() => {
			document.dispatchEvent(mockKeydownEvent);
		});

		expect(mockCallback).toHaveBeenCalledTimes(1);
	});

	it("should track active shortcuts", () => {
		const mockCallback = vi.fn();
		const { result } = renderHook(() => useKeyboardShortcuts());

		act(() => {
			result.current.registerShortcut({
				key: "Ctrl+K",
				description: "Test shortcut",
				action: mockCallback,
			});
		});

		expect(result.current.isShortcutActive("Ctrl+K")).toBe(false);

		act(() => {
			document.dispatchEvent(mockKeydownEvent);
		});

		expect(result.current.isShortcutActive("Ctrl+K")).toBe(true);
	});

	it("should return all registered shortcuts", () => {
		const { result } = renderHook(() => useKeyboardShortcuts());

		act(() => {
			result.current.registerShortcut({
				key: "Ctrl+K",
				description: "Search",
				action: vi.fn(),
			});
		});

		act(() => {
			result.current.registerShortcut({
				key: "Ctrl+N",
				description: "New",
				action: vi.fn(),
			});
		});

		const shortcuts = result.current.getShortcuts();
		expect(shortcuts).toHaveLength(2);
		expect(shortcuts.map((s) => s.key)).toContain("Ctrl+K");
		expect(shortcuts.map((s) => s.key)).toContain("Ctrl+N");
	});
});

describe("useGlobalKeyboardShortcuts", () => {
	it("should register global shortcuts without errors", () => {
		expect(() => {
			renderHook(() => useGlobalKeyboardShortcuts());
		}).not.toThrow();
	});
});
