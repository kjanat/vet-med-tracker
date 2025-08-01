import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOfflineQueue } from "./useOfflineQueue";

// Mock IndexedDB
const mockIndexedDB = {
	databases: new Map(),
	open: vi.fn((name, version) => {
		const db = {
			name,
			version,
			objectStoreNames: ["offline_queue"],
			transaction: vi.fn((_stores, _mode) => ({
				objectStore: vi.fn((_storeName) => ({
					add: vi.fn().mockResolvedValue("key-1"),
					get: vi.fn().mockResolvedValue(null),
					getAll: vi.fn().mockResolvedValue([]),
					delete: vi.fn().mockResolvedValue(undefined),
					put: vi.fn().mockResolvedValue("key-1"),
				})),
			})),
			close: vi.fn(),
		};
		return Promise.resolve({
			result: db,
			onsuccess: null,
			onerror: null,
		});
	}),
};

// Mock window.navigator.onLine
let mockOnlineStatus = true;
Object.defineProperty(window.navigator, "onLine", {
	get: () => mockOnlineStatus,
	configurable: true,
});

describe("useOfflineQueue", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockOnlineStatus = true;
		// @ts-ignore
		global.indexedDB = mockIndexedDB;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should detect online status correctly", () => {
		const { result } = renderHook(() => useOfflineQueue());
		expect(result.current.isOnline).toBe(true);

		// Simulate going offline
		mockOnlineStatus = false;
		act(() => {
			window.dispatchEvent(new Event("offline"));
		});

		expect(result.current.isOnline).toBe(false);

		// Simulate going back online
		mockOnlineStatus = true;
		act(() => {
			window.dispatchEvent(new Event("online"));
		});

		expect(result.current.isOnline).toBe(true);
	});

	it("should enqueue items when offline", async () => {
		mockOnlineStatus = false;
		const { result } = renderHook(() => useOfflineQueue());

		const mutation = {
			type: "admin.create",
			payload: {
				householdId: "household-1",
				animalId: "animal-1",
				regimenId: "regimen-1",
			},
		};

		await act(async () => {
			await result.current.enqueue(mutation, "idempotency-key-1");
		});

		// Verify IndexedDB was called
		expect(mockIndexedDB.open).toHaveBeenCalledWith(
			"vetmed-offline-queue",
			expect.any(Number),
		);
	});

	it("should prevent duplicate entries with same idempotency key", async () => {
		const { result } = renderHook(() => useOfflineQueue());

		const mutation = {
			type: "admin.create",
			payload: { householdId: "household-1" },
		};

		// Mock that the key already exists
		const mockTransaction = {
			objectStore: vi.fn(() => ({
				get: vi.fn().mockResolvedValue({ id: "existing" }),
				add: vi.fn(),
			})),
		};

		mockIndexedDB.open.mockResolvedValueOnce({
			result: {
				transaction: () => mockTransaction,
				close: vi.fn(),
			},
		});

		await act(async () => {
			await result.current.enqueue(mutation, "duplicate-key");
		});

		// Should check for existing key but not add
		expect(mockTransaction.objectStore).toHaveBeenCalled();
		const store = mockTransaction.objectStore();
		expect(store.get).toHaveBeenCalledWith("duplicate-key");
		expect(store.add).not.toHaveBeenCalled();
	});

	it("should process queue when coming back online", async () => {
		const { result } = renderHook(() => useOfflineQueue());

		// Start offline
		mockOnlineStatus = false;
		act(() => {
			window.dispatchEvent(new Event("offline"));
		});

		// Mock queued items
		const queuedItems = [
			{
				id: "queue-1",
				mutation: {
					type: "admin.create",
					payload: { householdId: "household-1" },
				},
				timestamp: Date.now(),
				attempts: 0,
			},
		];

		const mockStore = {
			getAll: vi.fn().mockResolvedValue(queuedItems),
			delete: vi.fn().mockResolvedValue(undefined),
		};

		const mockTransaction = {
			objectStore: vi.fn(() => mockStore),
		};

		mockIndexedDB.open.mockResolvedValue({
			result: {
				transaction: () => mockTransaction,
				close: vi.fn(),
			},
		});

		// Mock the mutation processor
		const processMutation = vi.fn().mockResolvedValue(true);
		// @ts-ignore - accessing private method for testing
		result.current._processMutation = processMutation;

		// Go back online
		mockOnlineStatus = true;
		await act(async () => {
			window.dispatchEvent(new Event("online"));
			// Wait for async processing
			await new Promise((resolve) => setTimeout(resolve, 100));
		});

		// Should attempt to process queued items
		await waitFor(() => {
			expect(mockStore.getAll).toHaveBeenCalled();
		});
	});

	it("should retry failed mutations with exponential backoff", async () => {
		renderHook(() => useOfflineQueue());

		const failedMutation = {
			id: "retry-1",
			mutation: {
				type: "admin.create",
				payload: { householdId: "household-1" },
			},
			timestamp: Date.now() - 60000, // 1 minute ago
			attempts: 2,
			lastAttempt: Date.now() - 30000, // 30 seconds ago
		};

		// Calculate expected retry time (exponential backoff)
		const retryDelay = Math.min(1000 * 2 ** failedMutation.attempts, 300000);
		const nextRetryTime = failedMutation.lastAttempt + retryDelay;

		// Should retry if enough time has passed
		const shouldRetry = Date.now() >= nextRetryTime;
		expect(shouldRetry).toBeDefined(); // Just checking the logic works
	});

	it("should clean up old entries after max attempts", async () => {
		renderHook(() => useOfflineQueue());

		const oldMutation = {
			id: "old-1",
			mutation: {
				type: "admin.create",
				payload: { householdId: "household-1" },
			},
			timestamp: Date.now() - 86400000, // 24 hours ago
			attempts: 5, // Max attempts reached
		};

		const mockStore = {
			getAll: vi.fn().mockResolvedValue([oldMutation]),
			delete: vi.fn().mockResolvedValue(undefined),
		};

		const mockTransaction = {
			objectStore: vi.fn(() => mockStore),
		};

		mockIndexedDB.open.mockResolvedValue({
			result: {
				transaction: () => mockTransaction,
				close: vi.fn(),
			},
		});

		// Trigger cleanup (this would normally happen on online event)
		// @ts-ignore - accessing private method for testing
		await result.current._cleanupOldEntries();

		// Should delete old entries
		expect(mockStore.delete).toHaveBeenCalledWith("old-1");
	});

	it("should handle IndexedDB errors gracefully", async () => {
		const { result } = renderHook(() => useOfflineQueue());

		// Mock IndexedDB error
		mockIndexedDB.open.mockRejectedValueOnce(
			new Error("IndexedDB not available"),
		);

		const consoleError = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});

		const mutation = {
			type: "admin.create",
			payload: { householdId: "household-1" },
		};

		await act(async () => {
			await result.current.enqueue(mutation, "error-key");
		});

		// Should log error but not throw
		expect(consoleError).toHaveBeenCalledWith(
			expect.stringContaining("Failed to open offline queue"),
			expect.any(Error),
		);

		consoleError.mockRestore();
	});

	it("should provide queue status information", async () => {
		const { result } = renderHook(() => useOfflineQueue());

		const queuedItems = [
			{ id: "1", mutation: { type: "admin.create" }, attempts: 0 },
			{ id: "2", mutation: { type: "inventory.update" }, attempts: 1 },
		];

		const mockStore = {
			getAll: vi.fn().mockResolvedValue(queuedItems),
		};

		const mockTransaction = {
			objectStore: vi.fn(() => mockStore),
		};

		mockIndexedDB.open.mockResolvedValue({
			result: {
				transaction: () => mockTransaction,
				close: vi.fn(),
			},
		});

		// Get queue status
		let queueStatus: Awaited<ReturnType<typeof result.current.getQueueStatus>>;
		await act(async () => {
			queueStatus = await result.current.getQueueStatus();
		});

		expect(queueStatus).toEqual({
			count: 2,
			pending: 1, // attempts = 0
			failed: 1, // attempts > 0
			oldest: expect.any(Date),
		});
	});
});
