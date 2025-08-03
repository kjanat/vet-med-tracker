// IndexedDB setup for offline queue
export const DB_NAME = "vetmed-offline";
export const DB_VERSION = 1;

export interface QueuedMutation {
	id: string;
	type: "admin.create" | "inventory.update" | "inventory.markAsInUse";
	payload: unknown;
	timestamp: number;
	retries: number;
	maxRetries: number;
	lastError?: string;
	householdId: string;
	userId: string;
}

export const STORES = {
	QUEUE: "mutation_queue",
	SYNC_STATUS: "sync_status",
} as const;

// Cache for IndexedDB availability
let indexedDBAvailable: boolean | null = null;
let indexedDBError: Error | null = null;

// Check if IndexedDB is available and working
export function checkIndexedDBSupport(): Promise<boolean> {
	if (indexedDBAvailable !== null) {
		return Promise.resolve(indexedDBAvailable);
	}

	return new Promise((resolve) => {
		if (typeof window === "undefined" || !window.indexedDB) {
			indexedDBAvailable = false;
			indexedDBError = new Error("IndexedDB not supported by this browser");
			console.warn("IndexedDB not supported:", indexedDBError.message);
			resolve(false);
			return;
		}

		// Test if we can actually open a database
		const testDBName = "vetmed-test-db";
		const testRequest = indexedDB.open(testDBName, 1);

		const cleanup = () => {
			try {
				if (testRequest.result) {
					testRequest.result.close();
				}
				indexedDB.deleteDatabase(testDBName);
				// eslint-disable-next-line @typescript-eslint/no-unused-vars
			} catch (_e) {
				// Ignore cleanup errors
			}
		};

		const timeout = setTimeout(() => {
			indexedDBAvailable = false;
			indexedDBError = new Error("IndexedDB test timed out");
			console.warn("IndexedDB test timed out");
			cleanup();
			resolve(false);
		}, 5000);

		testRequest.onerror = () => {
			clearTimeout(timeout);
			indexedDBAvailable = false;
			indexedDBError = testRequest.error || new Error("IndexedDB test failed");
			console.warn("IndexedDB test failed:", indexedDBError);
			cleanup();
			resolve(false);
		};

		testRequest.onsuccess = () => {
			clearTimeout(timeout);
			indexedDBAvailable = true;
			indexedDBError = null;
			cleanup();
			resolve(true);
		};

		testRequest.onupgradeneeded = () => {
			// Just create a simple test store
			try {
				const db = testRequest.result;
				if (!db.objectStoreNames.contains("test")) {
					db.createObjectStore("test");
				}
			} catch (e) {
				clearTimeout(timeout);
				indexedDBAvailable = false;
				indexedDBError = e as Error;
				console.warn("IndexedDB upgrade test failed:", e);
				cleanup();
				resolve(false);
			}
		};
	});
}

export async function openDB(): Promise<IDBDatabase> {
	// Check if IndexedDB is available first
	const isSupported = await checkIndexedDBSupport();
	if (!isSupported) {
		throw indexedDBError || new Error("IndexedDB not available");
	}

	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => {
			const error = request.error || new Error("Failed to open IndexedDB");
			console.error("IndexedDB open failed:", error);

			// Mark as unavailable for future calls
			indexedDBAvailable = false;
			indexedDBError = error;

			reject(error);
		};

		request.onsuccess = () => resolve(request.result);

		request.onupgradeneeded = (event) => {
			try {
				const db = (event.target as IDBOpenDBRequest).result;

				// Create mutation queue store
				if (!db.objectStoreNames.contains(STORES.QUEUE)) {
					const queueStore = db.createObjectStore(STORES.QUEUE, {
						keyPath: "id",
					});
					queueStore.createIndex("timestamp", "timestamp");
					queueStore.createIndex("type", "type");
					queueStore.createIndex("householdId", "householdId");
				}

				// Create sync status store
				if (!db.objectStoreNames.contains(STORES.SYNC_STATUS)) {
					db.createObjectStore(STORES.SYNC_STATUS, {
						keyPath: "id",
					});
				}
			} catch (error) {
				console.error("IndexedDB upgrade failed:", error);
				// Mark as unavailable
				indexedDBAvailable = false;
				indexedDBError = error as Error;
				reject(error);
			}
		};
	});
}

export async function addToQueue(mutation: QueuedMutation): Promise<void> {
	try {
		const db = await openDB();
		const tx = db.transaction([STORES.QUEUE], "readwrite");
		const store = tx.objectStore(STORES.QUEUE);

		await new Promise<void>((resolve, reject) => {
			const request = store.put(mutation);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	} catch (error) {
		console.warn("Failed to add to offline queue:", error);
		// In case of IndexedDB failure, we can't store offline data
		// The calling code should handle this gracefully
		throw error;
	}
}

export async function getQueuedMutations(
	householdId?: string,
): Promise<QueuedMutation[]> {
	try {
		const db = await openDB();
		const tx = db.transaction([STORES.QUEUE], "readonly");
		const store = tx.objectStore(STORES.QUEUE);

		return new Promise((resolve, reject) => {
			const mutations: QueuedMutation[] = [];
			const request = householdId
				? store.index("householdId").openCursor(IDBKeyRange.only(householdId))
				: store.openCursor();

			request.onsuccess = (event) => {
				const cursor = (event.target as IDBRequest).result;
				if (cursor) {
					mutations.push(cursor.value);
					cursor.continue();
				} else {
					// Sort by timestamp
					mutations.sort((a, b) => a.timestamp - b.timestamp);
					resolve(mutations);
				}
			};

			request.onerror = () => reject(request.error);
		});
	} catch (error) {
		console.warn("Failed to get queued mutations:", error);
		// Return empty array as fallback
		return [];
	}
}

export async function removeFromQueue(id: string): Promise<void> {
	try {
		const db = await openDB();
		const tx = db.transaction([STORES.QUEUE], "readwrite");
		const store = tx.objectStore(STORES.QUEUE);

		await new Promise<void>((resolve, reject) => {
			const request = store.delete(id);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	} catch (error) {
		console.warn("Failed to remove from offline queue:", error);
		// If we can't remove from queue, it's not critical
		// The item might be processed again but that should be handled by idempotency
	}
}

export async function updateQueuedMutation(
	mutation: QueuedMutation,
): Promise<void> {
	try {
		const db = await openDB();
		const tx = db.transaction([STORES.QUEUE], "readwrite");
		const store = tx.objectStore(STORES.QUEUE);

		await new Promise<void>((resolve, reject) => {
			const request = store.put(mutation);
			request.onsuccess = () => resolve();
			request.onerror = () => reject(request.error);
		});
	} catch (error) {
		console.warn("Failed to update queued mutation:", error);
		// If we can't update the mutation, it's not critical for functionality
		// But we should log it for debugging
	}
}

export async function clearQueue(householdId?: string): Promise<void> {
	try {
		const db = await openDB();
		const tx = db.transaction([STORES.QUEUE], "readwrite");
		const store = tx.objectStore(STORES.QUEUE);

		if (householdId) {
			// Clear only for specific household
			const mutations = await getQueuedMutations(householdId);
			await Promise.all(mutations.map((m) => removeFromQueue(m.id)));
		} else {
			// Clear all
			await new Promise<void>((resolve, reject) => {
				const request = store.clear();
				request.onsuccess = () => resolve();
				request.onerror = () => reject(request.error);
			});
		}
	} catch (error) {
		console.warn("Failed to clear offline queue:", error);
		// If we can't clear the queue, it's not critical
		// The items will still be processed normally
	}
}

export async function getQueueSize(householdId?: string): Promise<number> {
	try {
		const db = await openDB();
		const tx = db.transaction([STORES.QUEUE], "readonly");
		const store = tx.objectStore(STORES.QUEUE);

		return new Promise((resolve, reject) => {
			const request = householdId
				? store.index("householdId").count(IDBKeyRange.only(householdId))
				: store.count();

			request.onsuccess = () => resolve(request.result);
			request.onerror = () => reject(request.error);
		});
	} catch (error) {
		console.warn("Failed to get queue size:", error);
		// Return 0 as fallback - this means no pending items
		return 0;
	}
}

// Helper function to get specific error suggestions
function getIndexedDBErrorSuggestion(errorMsg: string): string {
	if (typeof window === "undefined") {
		return "Try refreshing the page";
	}

	// Check for private/incognito mode
	if (window.navigator?.cookieEnabled === false) {
		return "Cookies are disabled. Please enable cookies in your browser settings.";
	}

	if (errorMsg.includes("quota") || errorMsg.includes("storage")) {
		return "Browser storage is full. Try clearing browser data or closing other tabs.";
	}

	if (errorMsg.includes("security") || errorMsg.includes("permission")) {
		return "Browser security settings may be blocking storage. Try disabling strict security extensions.";
	}

	if (window.location.protocol === "file:") {
		return "File:// protocol detected. Please access the app through a web server (http:// or https://).";
	}

	// Check if we might be in private mode
	try {
		const testStorage = window.localStorage;
		testStorage.setItem("test", "test");
		testStorage.removeItem("test");
		return "Try refreshing the page";
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
	} catch (_e) {
		return "You may be in private/incognito mode. Try using a regular browser window.";
	}
}

// Utility functions for IndexedDB diagnostics
export async function getIndexedDBDiagnostics(): Promise<{
	supported: boolean;
	available: boolean;
	error?: string;
	suggestion?: string;
}> {
	const isSupported = await checkIndexedDBSupport();

	if (!isSupported) {
		const errorMsg = indexedDBError?.message || "Unknown error";
		const suggestion = getIndexedDBErrorSuggestion(errorMsg);

		return {
			supported: false,
			available: false,
			error: errorMsg,
			suggestion,
		};
	}

	return {
		supported: true,
		available: true,
	};
}

// Reset IndexedDB availability cache (useful for testing or retrying)
export function resetIndexedDBCache(): void {
	indexedDBAvailable = null;
	indexedDBError = null;
}
