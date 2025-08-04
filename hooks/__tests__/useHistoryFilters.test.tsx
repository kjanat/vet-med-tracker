import { act, renderHook } from "@testing-library/react";
import {
	type ReadonlyURLSearchParams,
	usePathname,
	useRouter,
	useSearchParams,
} from "next/navigation";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useHistoryFilters } from "../useHistoryFilters";

// Mock next/navigation
vi.mock("next/navigation", () => ({
	useRouter: vi.fn(),
	useSearchParams: vi.fn(),
	usePathname: vi.fn(),
}));

describe("useHistoryFilters", () => {
	const mockPush = vi.fn();
	const mockReplace = vi.fn();
	let mockSearchParams: URLSearchParams;
	let readonlySearchParams: ReadonlyURLSearchParams;

	beforeEach(() => {
		vi.clearAllMocks();
		mockSearchParams = new URLSearchParams();

		// Create a ReadonlyURLSearchParams mock that delegates to URLSearchParams
		readonlySearchParams = {
			get: (name: string) => mockSearchParams.get(name),
			getAll: (name: string) => mockSearchParams.getAll(name),
			has: (name: string) => mockSearchParams.has(name),
			keys: () => mockSearchParams.keys(),
			values: () => mockSearchParams.values(),
			entries: () => mockSearchParams.entries(),
			forEach: (
				callback: (value: string, key: string, parent: URLSearchParams) => void,
			) => mockSearchParams.forEach(callback),
			toString: () => mockSearchParams.toString(),
			get size() {
				return mockSearchParams.size;
			},
			[Symbol.iterator]: () => mockSearchParams[Symbol.iterator](),
		} as unknown as ReadonlyURLSearchParams;
		vi.mocked(useRouter).mockReturnValue({
			push: mockPush,
			replace: mockReplace,
			back: vi.fn(),
			forward: vi.fn(),
			refresh: vi.fn(),
			prefetch: vi.fn(),
		});
		vi.mocked(useSearchParams).mockReturnValue(readonlySearchParams);
		vi.mocked(usePathname).mockReturnValue("/dashboard/history");
	});

	it("should build query strings using URLSearchParams", () => {
		const { result } = renderHook(() => useHistoryFilters());

		act(() => {
			result.current.setFilter("animalId", "123");
		});

		// Verify it's building the URL with params.toString() and pathname
		expect(mockPush).toHaveBeenCalledWith("/dashboard/history?animalId=123", {
			scroll: false,
		});
	});

	it("should handle multiple filters", () => {
		mockSearchParams.set("from", "2024-01-01");
		mockSearchParams.set("to", "2024-01-31");

		const { result } = renderHook(() => useHistoryFilters());

		act(() => {
			result.current.setFilter("animalId", "456");
		});

		// Verify it preserves existing params
		const callArg = mockPush.mock.calls[0]?.[0];
		expect(callArg).toBeDefined();
		expect(callArg).toContain("/dashboard/history?");
		expect(callArg).toContain("from=2024-01-01");
		expect(callArg).toContain("to=2024-01-31");
		expect(callArg).toContain("animalId=456");
	});

	it("should use pathname from usePathname hook", () => {
		// Change the pathname
		vi.mocked(usePathname).mockReturnValue("/different/path");

		const { result } = renderHook(() => useHistoryFilters());

		act(() => {
			result.current.setFilter("type", "scheduled");
		});

		// Verify it uses the current pathname
		expect(mockPush).toHaveBeenCalledWith("/different/path?type=scheduled", {
			scroll: false,
		});
	});
});
