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

export function openDB(): Promise<IDBDatabase> {
	return new Promise((resolve, reject) => {
		const request = indexedDB.open(DB_NAME, DB_VERSION);

		request.onerror = () => reject(request.error);
		request.onsuccess = () => resolve(request.result);

		request.onupgradeneeded = (event) => {
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
		};
	});
}

export async function addToQueue(mutation: QueuedMutation): Promise<void> {
	const db = await openDB();
	const tx = db.transaction([STORES.QUEUE], "readwrite");
	const store = tx.objectStore(STORES.QUEUE);

	await new Promise<void>((resolve, reject) => {
		const request = store.put(mutation);
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

export async function getQueuedMutations(
	householdId?: string,
): Promise<QueuedMutation[]> {
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
}

export async function removeFromQueue(id: string): Promise<void> {
	const db = await openDB();
	const tx = db.transaction([STORES.QUEUE], "readwrite");
	const store = tx.objectStore(STORES.QUEUE);

	await new Promise<void>((resolve, reject) => {
		const request = store.delete(id);
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

export async function updateQueuedMutation(
	mutation: QueuedMutation,
): Promise<void> {
	const db = await openDB();
	const tx = db.transaction([STORES.QUEUE], "readwrite");
	const store = tx.objectStore(STORES.QUEUE);

	await new Promise<void>((resolve, reject) => {
		const request = store.put(mutation);
		request.onsuccess = () => resolve();
		request.onerror = () => reject(request.error);
	});
}

export async function clearQueue(householdId?: string): Promise<void> {
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
}

export async function getQueueSize(householdId?: string): Promise<number> {
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
}
