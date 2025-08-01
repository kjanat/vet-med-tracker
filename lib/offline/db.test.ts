import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	addToQueue,
	clearQueue,
	getQueuedMutations,
	getQueueSize,
	openDB,
	type QueuedMutation,
	removeFromQueue,
} from "./db";

// Mock IndexedDB
const mockDB = {
	objectStoreNames: {
		contains: vi.fn(),
	},
	createObjectStore: vi.fn().mockReturnValue({
		createIndex: vi.fn(),
	}),
	transaction: vi.fn(),
};

const mockTransaction = {
	objectStore: vi.fn(),
};

const mockObjectStore = {
	put: vi.fn(),
	get: vi.fn(),
	delete: vi.fn(),
	clear: vi.fn(),
	count: vi.fn(),
	openCursor: vi.fn(),
	index: vi.fn().mockReturnValue({
		openCursor: vi.fn(),
		count: vi.fn(),
	}),
};

// Setup IndexedDB mock
global.indexedDB = {
	open: vi.fn().mockReturnValue({
		onsuccess: null,
		onerror: null,
		onupgradeneeded: null,
		result: mockDB,
	}),
} as unknown as IDBFactory;

describe("Offline Queue Database", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockDB.transaction.mockReturnValue(mockTransaction);
		mockTransaction.objectStore.mockReturnValue(mockObjectStore);
	});

	describe("openDB", () => {
		it("should open database successfully", async () => {
			const mockRequest = {
				onsuccess: null as
					| ((this: IDBRequest<IDBDatabase>, ev: Event) => unknown)
					| null,
				onerror: null as
					| ((this: IDBRequest<IDBDatabase>, ev: Event) => unknown)
					| null,
				onupgradeneeded: null as
					| ((this: IDBOpenDBRequest, ev: IDBVersionChangeEvent) => unknown)
					| null,
				result: mockDB,
			};

			(global.indexedDB.open as ReturnType<typeof vi.fn>).mockReturnValue(
				mockRequest,
			);

			const dbPromise = openDB();

			// Simulate success
			if (mockRequest.onsuccess) {
				mockRequest.onsuccess.call(
					mockRequest as unknown as IDBRequest<IDBDatabase>,
					new Event("success"),
				);
			}

			const db = await dbPromise;
			expect(db).toBe(mockDB);
		});

		it("should handle upgrade needed", async () => {
			const mockRequest = {
				onsuccess: null as
					| ((this: IDBRequest<IDBDatabase>, ev: Event) => unknown)
					| null,
				onerror: null as
					| ((this: IDBRequest<IDBDatabase>, ev: Event) => unknown)
					| null,
				onupgradeneeded: null as
					| ((this: IDBOpenDBRequest, ev: IDBVersionChangeEvent) => unknown)
					| null,
				result: mockDB,
			};

			(global.indexedDB.open as ReturnType<typeof vi.fn>).mockReturnValue(
				mockRequest,
			);

			mockDB.objectStoreNames.contains.mockReturnValue(false);

			const dbPromise = openDB();

			// Simulate upgrade needed
			if (mockRequest.onupgradeneeded) {
				const event = new Event("upgradeneeded") as IDBVersionChangeEvent;
				Object.defineProperty(event, "target", {
					value: { result: mockDB },
				});
				mockRequest.onupgradeneeded.call(
					mockRequest as unknown as IDBOpenDBRequest,
					event,
				);
			}

			// Simulate success
			if (mockRequest.onsuccess) {
				mockRequest.onsuccess.call(
					mockRequest as unknown as IDBRequest<IDBDatabase>,
					new Event("success"),
				);
			}

			await dbPromise;

			expect(mockDB.createObjectStore).toHaveBeenCalledWith("mutation_queue", {
				keyPath: "id",
			});
			expect(mockDB.createObjectStore).toHaveBeenCalledWith("sync_status", {
				keyPath: "id",
			});
		});
	});

	describe("addToQueue", () => {
		it("should add mutation to queue", async () => {
			const mutation: QueuedMutation = {
				id: "test-123",
				type: "admin.create",
				payload: { test: "data" },
				timestamp: Date.now(),
				retries: 0,
				maxRetries: 3,
				householdId: "household-123",
				userId: "user-123",
			};

			mockObjectStore.put.mockReturnValue({
				onsuccess: null,
				onerror: null,
			});

			// Mock openDB
			vi.mocked(global.indexedDB.open).mockReturnValue({
				onsuccess: null,
				onerror: null,
				onupgradeneeded: null,
				result: mockDB,
			} as unknown as IDBOpenDBRequest);

			const openDBPromise = openDB();
			const mockRequest = vi.mocked(global.indexedDB.open).mock.results[0]
				?.value as IDBOpenDBRequest;
			if (mockRequest.onsuccess) {
				mockRequest.onsuccess.call(mockRequest, new Event("success"));
			}

			await openDBPromise;

			const putRequest = {
				onsuccess: null as ((this: IDBRequest, ev: Event) => unknown) | null,
				onerror: null as ((this: IDBRequest, ev: Event) => unknown) | null,
			};
			mockObjectStore.put.mockReturnValue(putRequest);

			const addPromise = addToQueue(mutation);

			// Simulate put success
			if (putRequest.onsuccess) {
				putRequest.onsuccess.call(
					putRequest as IDBRequest,
					new Event("success"),
				);
			}

			await addPromise;

			expect(mockObjectStore.put).toHaveBeenCalledWith(mutation);
		});
	});

	describe("getQueuedMutations", () => {
		it("should retrieve all queued mutations", async () => {
			const mutations: QueuedMutation[] = [
				{
					id: "test-1",
					type: "admin.create",
					payload: { test: "data1" },
					timestamp: 1000,
					retries: 0,
					maxRetries: 3,
					householdId: "household-123",
					userId: "user-123",
				},
				{
					id: "test-2",
					type: "inventory.update",
					payload: { test: "data2" },
					timestamp: 2000,
					retries: 1,
					maxRetries: 3,
					householdId: "household-123",
					userId: "user-123",
				},
			];

			const cursorMock = {
				value: mutations[0],
				continue: vi.fn(),
			};

			const cursorRequest = {
				onsuccess: null as ((this: IDBRequest, ev: Event) => unknown) | null,
				onerror: null as ((this: IDBRequest, ev: Event) => unknown) | null,
				result: cursorMock,
			};

			mockObjectStore.openCursor.mockReturnValue(cursorRequest);

			// Mock openDB
			vi.mocked(global.indexedDB.open).mockReturnValue({
				onsuccess: null,
				onerror: null,
				onupgradeneeded: null,
				result: mockDB,
			} as unknown as IDBOpenDBRequest);

			const openDBPromise = openDB();
			const mockRequest = vi.mocked(global.indexedDB.open).mock.results[0]
				?.value as IDBOpenDBRequest;
			if (mockRequest.onsuccess) {
				mockRequest.onsuccess.call(mockRequest, new Event("success"));
			}

			await openDBPromise;

			const getPromise = getQueuedMutations();

			// Simulate cursor iteration
			if (cursorRequest.onsuccess) {
				// First call - return first mutation
				Object.defineProperty(cursorRequest, "result", {
					value: { value: mutations[0], continue: vi.fn() },
					writable: true,
				});
				cursorRequest.onsuccess.call(
					cursorRequest as IDBRequest,
					new Event("success"),
				);

				// Second call - return second mutation
				Object.defineProperty(cursorRequest, "result", {
					value: { value: mutations[1], continue: vi.fn() },
					writable: true,
				});
				cursorRequest.onsuccess.call(
					cursorRequest as IDBRequest,
					new Event("success"),
				);

				// Third call - no more results
				Object.defineProperty(cursorRequest, "result", {
					value: null,
					writable: true,
				});
				cursorRequest.onsuccess.call(
					cursorRequest as IDBRequest,
					new Event("success"),
				);
			}

			const result = await getPromise;

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual(mutations[0]);
			expect(result[1]).toEqual(mutations[1]);
		});

		it("should filter by householdId when provided", async () => {
			const householdId = "household-123";

			mockObjectStore.index.mockReturnValue({
				openCursor: vi.fn().mockReturnValue({
					onsuccess: null,
					onerror: null,
					result: null,
				}),
				count: vi.fn(),
			});

			// Mock openDB
			vi.mocked(global.indexedDB.open).mockReturnValue({
				onsuccess: null,
				onerror: null,
				onupgradeneeded: null,
				result: mockDB,
			} as unknown as IDBOpenDBRequest);

			const openDBPromise = openDB();
			const mockRequest = vi.mocked(global.indexedDB.open).mock.results[0]
				?.value as IDBOpenDBRequest;
			if (mockRequest.onsuccess) {
				mockRequest.onsuccess.call(mockRequest, new Event("success"));
			}

			await openDBPromise;

			const cursorRequest = {
				onsuccess: null as ((this: IDBRequest, ev: Event) => unknown) | null,
				onerror: null as ((this: IDBRequest, ev: Event) => unknown) | null,
				result: null,
			};

			mockObjectStore.index().openCursor.mockReturnValue(cursorRequest);

			const getPromise = getQueuedMutations(householdId);

			// Simulate empty result
			if (cursorRequest.onsuccess) {
				cursorRequest.onsuccess.call(
					cursorRequest as IDBRequest,
					new Event("success"),
				);
			}

			const result = await getPromise;

			expect(mockObjectStore.index).toHaveBeenCalledWith("householdId");
			expect(mockObjectStore.index().openCursor).toHaveBeenCalledWith(
				IDBKeyRange.only(householdId),
			);
			expect(result).toEqual([]);
		});
	});

	describe("removeFromQueue", () => {
		it("should remove mutation from queue", async () => {
			const mutationId = "test-123";

			const deleteRequest = {
				onsuccess: null as ((this: IDBRequest, ev: Event) => unknown) | null,
				onerror: null as ((this: IDBRequest, ev: Event) => unknown) | null,
			};

			mockObjectStore.delete.mockReturnValue(deleteRequest);

			// Mock openDB
			vi.mocked(global.indexedDB.open).mockReturnValue({
				onsuccess: null,
				onerror: null,
				onupgradeneeded: null,
				result: mockDB,
			} as unknown as IDBOpenDBRequest);

			const openDBPromise = openDB();
			const mockRequest = vi.mocked(global.indexedDB.open).mock.results[0]
				?.value as IDBOpenDBRequest;
			if (mockRequest.onsuccess) {
				mockRequest.onsuccess.call(mockRequest, new Event("success"));
			}

			await openDBPromise;

			const removePromise = removeFromQueue(mutationId);

			// Simulate delete success
			if (deleteRequest.onsuccess) {
				deleteRequest.onsuccess.call(
					deleteRequest as IDBRequest,
					new Event("success"),
				);
			}

			await removePromise;

			expect(mockObjectStore.delete).toHaveBeenCalledWith(mutationId);
		});
	});

	describe("getQueueSize", () => {
		it("should return total queue size", async () => {
			const expectedSize = 5;

			const countRequest = {
				onsuccess: null as ((this: IDBRequest, ev: Event) => unknown) | null,
				onerror: null as ((this: IDBRequest, ev: Event) => unknown) | null,
				result: expectedSize,
			};

			mockObjectStore.count.mockReturnValue(countRequest);

			// Mock openDB
			vi.mocked(global.indexedDB.open).mockReturnValue({
				onsuccess: null,
				onerror: null,
				onupgradeneeded: null,
				result: mockDB,
			} as unknown as IDBOpenDBRequest);

			const openDBPromise = openDB();
			const mockRequest = vi.mocked(global.indexedDB.open).mock.results[0]
				?.value as IDBOpenDBRequest;
			if (mockRequest.onsuccess) {
				mockRequest.onsuccess.call(mockRequest, new Event("success"));
			}

			await openDBPromise;

			const sizePromise = getQueueSize();

			// Simulate count success
			if (countRequest.onsuccess) {
				countRequest.onsuccess.call(
					countRequest as IDBRequest,
					new Event("success"),
				);
			}

			const size = await sizePromise;

			expect(size).toBe(expectedSize);
			expect(mockObjectStore.count).toHaveBeenCalled();
		});

		it("should return queue size for specific household", async () => {
			const householdId = "household-123";
			const expectedSize = 3;

			const countRequest = {
				onsuccess: null as ((this: IDBRequest, ev: Event) => unknown) | null,
				onerror: null as ((this: IDBRequest, ev: Event) => unknown) | null,
				result: expectedSize,
			};

			mockObjectStore.index().count.mockReturnValue(countRequest);

			// Mock openDB
			vi.mocked(global.indexedDB.open).mockReturnValue({
				onsuccess: null,
				onerror: null,
				onupgradeneeded: null,
				result: mockDB,
			} as unknown as IDBOpenDBRequest);

			const openDBPromise = openDB();
			const mockRequest = vi.mocked(global.indexedDB.open).mock.results[0]
				?.value as IDBOpenDBRequest;
			if (mockRequest.onsuccess) {
				mockRequest.onsuccess.call(mockRequest, new Event("success"));
			}

			await openDBPromise;

			const sizePromise = getQueueSize(householdId);

			// Simulate count success
			if (countRequest.onsuccess) {
				countRequest.onsuccess.call(
					countRequest as IDBRequest,
					new Event("success"),
				);
			}

			const size = await sizePromise;

			expect(size).toBe(expectedSize);
			expect(mockObjectStore.index).toHaveBeenCalledWith("householdId");
			expect(mockObjectStore.index().count).toHaveBeenCalledWith(
				IDBKeyRange.only(householdId),
			);
		});
	});

	describe("clearQueue", () => {
		it("should clear entire queue when no householdId provided", async () => {
			const clearRequest = {
				onsuccess: null as ((this: IDBRequest, ev: Event) => unknown) | null,
				onerror: null as ((this: IDBRequest, ev: Event) => unknown) | null,
			};

			mockObjectStore.clear.mockReturnValue(clearRequest);

			// Mock openDB
			vi.mocked(global.indexedDB.open).mockReturnValue({
				onsuccess: null,
				onerror: null,
				onupgradeneeded: null,
				result: mockDB,
			} as unknown as IDBOpenDBRequest);

			const openDBPromise = openDB();
			const mockRequest = vi.mocked(global.indexedDB.open).mock.results[0]
				?.value as IDBOpenDBRequest;
			if (mockRequest.onsuccess) {
				mockRequest.onsuccess.call(mockRequest, new Event("success"));
			}

			await openDBPromise;

			const clearPromise = clearQueue();

			// Simulate clear success
			if (clearRequest.onsuccess) {
				clearRequest.onsuccess.call(
					clearRequest as IDBRequest,
					new Event("success"),
				);
			}

			await clearPromise;

			expect(mockObjectStore.clear).toHaveBeenCalled();
		});
	});
});
