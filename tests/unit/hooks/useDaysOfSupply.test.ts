/**
 * Unit tests for useDaysOfSupply hook
 * Tests inventory calculations and medication adherence tracking
 */

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDaysOfSupply } from "@/hooks/inventory/useDaysOfSupply";
import {
	testAnimal,
	testInventoryItem,
	testRegimen,
} from "@/tests/helpers/test-fixtures";

// Mock tRPC
const mockInventoryGet = vi.fn();
const mockRegimenList = vi.fn();
const mockAdminList = vi.fn();

vi.mock("@/server/trpc/client", () => ({
	trpc: {
		inventory: {
			get: {
				useQuery: mockInventoryGet,
			},
		},
		regimen: {
			list: {
				useQuery: mockRegimenList,
			},
		},
		admin: {
			list: {
				useQuery: mockAdminList,
			},
		},
	},
}));

describe("useDaysOfSupply", () => {
	beforeEach(() => {
		vi.clearAllMocks();

		// Default mock responses
		mockInventoryGet.mockReturnValue({
			data: testInventoryItem,
			isLoading: false,
			error: null,
		});

		mockRegimenList.mockReturnValue({
			data: [testRegimen],
			isLoading: false,
			error: null,
		});

		mockAdminList.mockReturnValue({
			data: [],
			isLoading: false,
			error: null,
		});
	});

	it("calculates days of supply correctly for tablets", () => {
		const { result } = renderHook(() =>
			useDaysOfSupply({
				inventoryItemId: testInventoryItem.id,
				animalId: testAnimal.id,
			}),
		);

		expect(result.current.daysOfSupply).toBe(15); // 30 tablets / 2 tablets per day
		expect(result.current.isLoading).toBe(false);
		expect(result.current.error).toBeNull();
	});

	it("calculates days of supply for liquid medication", () => {
		const liquidInventory = {
			...testInventoryItem,
			quantityRemaining: 100,
			quantityUnit: "mL",
		};

		const liquidRegimen = {
			...testRegimen,
			dose: "5mL",
			frequency: "BID", // Twice daily
		};

		mockInventoryGet.mockReturnValue({
			data: liquidInventory,
			isLoading: false,
			error: null,
		});

		mockRegimenList.mockReturnValue({
			data: [liquidRegimen],
			isLoading: false,
			error: null,
		});

		const { result } = renderHook(() =>
			useDaysOfSupply({
				inventoryItemId: liquidInventory.id,
				animalId: testAnimal.id,
			}),
		);

		expect(result.current.daysOfSupply).toBe(10); // 100mL / (5mL * 2 doses per day)
	});

	it("handles multiple regimens for same medication", () => {
		const regimen1 = {
			...testRegimen,
			dose: "250mg",
			frequency: "BID", // 2 times daily
		};

		const regimen2 = {
			...testRegimen,
			id: "regimen-2",
			dose: "125mg",
			frequency: "TID", // 3 times daily
		};

		mockRegimenList.mockReturnValue({
			data: [regimen1, regimen2],
			isLoading: false,
			error: null,
		});

		const { result } = renderHook(() =>
			useDaysOfSupply({
				inventoryItemId: testInventoryItem.id,
				animalId: testAnimal.id,
			}),
		);

		// Total daily dose: (250mg * 2) + (125mg * 3) = 875mg
		// Each tablet is 250mg (from testInventoryItem.unitsPerTablet)
		// Daily tablets needed: 875mg / 250mg = 3.5 tablets
		// Days of supply: 30 tablets / 3.5 tablets = ~8.5 days
		expect(result.current.daysOfSupply).toBeCloseTo(8.5, 1);
	});

	it("accounts for already administered doses", () => {
		const mockAdministrations = [
			{
				id: "admin-1",
				dose: "250mg",
				recordedAt: new Date("2023-06-01T08:00:00Z"),
				sourceItemId: testInventoryItem.id,
			},
			{
				id: "admin-2",
				dose: "250mg",
				recordedAt: new Date("2023-06-01T20:00:00Z"),
				sourceItemId: testInventoryItem.id,
			},
		];

		mockAdminList.mockReturnValue({
			data: mockAdministrations,
			isLoading: false,
			error: null,
		});

		const { result } = renderHook(() =>
			useDaysOfSupply({
				inventoryItemId: testInventoryItem.id,
				animalId: testAnimal.id,
			}),
		);

		// Should account for 2 tablets already used
		// Remaining: 30 - 2 = 28 tablets
		// Days of supply: 28 / 2 = 14 days
		expect(result.current.daysOfSupply).toBe(14);
		expect(result.current.usedQuantity).toBe(2);
	});

	it("returns zero when no regimens exist", () => {
		mockRegimenList.mockReturnValue({
			data: [],
			isLoading: false,
			error: null,
		});

		const { result } = renderHook(() =>
			useDaysOfSupply({
				inventoryItemId: testInventoryItem.id,
				animalId: testAnimal.id,
			}),
		);

		expect(result.current.daysOfSupply).toBe(0);
		expect(result.current.dailyDose).toBe(0);
	});

	it("handles loading states", () => {
		mockInventoryGet.mockReturnValue({
			data: null,
			isLoading: true,
			error: null,
		});

		const { result } = renderHook(() =>
			useDaysOfSupply({
				inventoryItemId: testInventoryItem.id,
				animalId: testAnimal.id,
			}),
		);

		expect(result.current.isLoading).toBe(true);
		expect(result.current.daysOfSupply).toBe(0);
	});

	it("handles errors gracefully", () => {
		const testError = new Error("Failed to load inventory");

		mockInventoryGet.mockReturnValue({
			data: null,
			isLoading: false,
			error: testError,
		});

		const { result } = renderHook(() =>
			useDaysOfSupply({
				inventoryItemId: testInventoryItem.id,
				animalId: testAnimal.id,
			}),
		);

		expect(result.current.isLoading).toBe(false);
		expect(result.current.error).toBe(testError);
		expect(result.current.daysOfSupply).toBe(0);
	});

	it("calculates projected run-out date", () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2023-06-15T12:00:00Z"));

		const { result } = renderHook(() =>
			useDaysOfSupply({
				inventoryItemId: testInventoryItem.id,
				animalId: testAnimal.id,
			}),
		);

		const expectedRunOutDate = new Date("2023-06-30T12:00:00Z"); // 15 days from now
		expect(result.current.projectedRunOutDate).toEqual(expectedRunOutDate);

		vi.useRealTimers();
	});

	it("identifies when supply is running low", () => {
		const lowInventory = {
			...testInventoryItem,
			quantityRemaining: 4, // Only 4 tablets left
		};

		mockInventoryGet.mockReturnValue({
			data: lowInventory,
			isLoading: false,
			error: null,
		});

		const { result } = renderHook(() =>
			useDaysOfSupply({
				inventoryItemId: lowInventory.id,
				animalId: testAnimal.id,
				lowStockThreshold: 7, // Alert when less than 7 days remain
			}),
		);

		expect(result.current.daysOfSupply).toBe(2); // 4 tablets / 2 per day
		expect(result.current.isLowStock).toBe(true);
	});

	it("calculates consumption rate over time", () => {
		const mockAdministrations = Array.from({ length: 10 }, (_, i) => ({
			id: `admin-${i}`,
			dose: "250mg",
			recordedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000), // Daily for 10 days
			sourceItemId: testInventoryItem.id,
		}));

		mockAdminList.mockReturnValue({
			data: mockAdministrations,
			isLoading: false,
			error: null,
		});

		const { result } = renderHook(() =>
			useDaysOfSupply({
				inventoryItemId: testInventoryItem.id,
				animalId: testAnimal.id,
			}),
		);

		// Should detect 1 tablet per day consumption rate over 10 days
		expect(result.current.averageDailyConsumption).toBeCloseTo(1, 1);
		expect(result.current.consumptionRate).toBeDefined();
	});

	it("handles different dose units correctly", () => {
		const mgRegimen = {
			...testRegimen,
			dose: "500mg", // 2 tablets worth
			frequency: "SID", // Once daily
		};

		mockRegimenList.mockReturnValue({
			data: [mgRegimen],
			isLoading: false,
			error: null,
		});

		const { result } = renderHook(() =>
			useDaysOfSupply({
				inventoryItemId: testInventoryItem.id,
				animalId: testAnimal.id,
			}),
		);

		// 500mg daily = 2 tablets daily (250mg per tablet)
		// 30 tablets / 2 tablets per day = 15 days
		expect(result.current.daysOfSupply).toBe(15);
		expect(result.current.dailyDose).toBe(500);
	});

	it("updates when parameters change", () => {
		const { result, rerender } = renderHook((props) => useDaysOfSupply(props), {
			initialProps: {
				inventoryItemId: testInventoryItem.id,
				animalId: testAnimal.id,
			},
		});

		expect(result.current.daysOfSupply).toBe(15);

		// Change to different inventory item
		const newInventoryItem = {
			...testInventoryItem,
			id: "new-inventory-id",
			quantityRemaining: 60,
		};

		mockInventoryGet.mockReturnValue({
			data: newInventoryItem,
			isLoading: false,
			error: null,
		});

		rerender({
			inventoryItemId: newInventoryItem.id,
			animalId: testAnimal.id,
		});

		expect(result.current.daysOfSupply).toBe(30); // 60 tablets / 2 per day
	});

	it("handles expired medications", () => {
		const expiredInventory = {
			...testInventoryItem,
			expirationDate: new Date("2023-01-01"), // Expired
		};

		mockInventoryGet.mockReturnValue({
			data: expiredInventory,
			isLoading: false,
			error: null,
		});

		const { result } = renderHook(() =>
			useDaysOfSupply({
				inventoryItemId: expiredInventory.id,
				animalId: testAnimal.id,
			}),
		);

		expect(result.current.isExpired).toBe(true);
		expect(result.current.daysUntilExpiration).toBeLessThan(0);
	});

	it("warns about upcoming expiration", () => {
		const soonToExpireInventory = {
			...testInventoryItem,
			expirationDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 days from now
		};

		mockInventoryGet.mockReturnValue({
			data: soonToExpireInventory,
			isLoading: false,
			error: null,
		});

		const { result } = renderHook(() =>
			useDaysOfSupply({
				inventoryItemId: soonToExpireInventory.id,
				animalId: testAnimal.id,
				expirationWarningDays: 7,
			}),
		);

		expect(result.current.isExpiringSoon).toBe(true);
		expect(result.current.daysUntilExpiration).toBe(5);
	});

	it("provides reorder recommendations", () => {
		const lowInventory = {
			...testInventoryItem,
			quantityRemaining: 6, // 3 days supply at 2 tablets per day
		};

		mockInventoryGet.mockReturnValue({
			data: lowInventory,
			isLoading: false,
			error: null,
		});

		const { result } = renderHook(() =>
			useDaysOfSupply({
				inventoryItemId: lowInventory.id,
				animalId: testAnimal.id,
				reorderPoint: 7, // Reorder when less than 7 days remain
				reorderQuantity: 30, // Standard bottle size
			}),
		);

		expect(result.current.shouldReorder).toBe(true);
		expect(result.current.recommendedReorderQuantity).toBe(30);
	});
});
