import type { Page } from "@playwright/test";

interface QueuedMutationData {
  id: string;
  type: string;
  input: unknown;
  timestamp: number;
  retries: number;
}

interface MockInput {
  id: string;
}

interface MockWindow extends Window {
  getOfflineQueueData: () => QueuedMutationData[];
  clearOfflineQueue: () => void;
  apiCallCount: Record<string, number>;
  mockTRPCFailures: Record<string, () => boolean>;
}

/**
 * Mock IndexedDB offline queue for testing
 */
export async function mockOfflineQueue(page: Page) {
  await page.addInitScript(() => {
    // Mock IndexedDB with in-memory storage
    const storage = new Map<string, QueuedMutationData>();
    let queueData: QueuedMutationData[] = [];

    // Override IndexedDB
    (window as any).indexedDB = {
      open: (): IDBOpenDBRequest => {
        return {
          onsuccess: null,
          onerror: null,
          onupgradeneeded: null,
          result: {
            transaction: () => ({
              objectStore: () => ({
                put: (data: QueuedMutationData) => {
                  queueData.push(data);
                  storage.set(data.id, data);
                  return { onsuccess: null };
                },
                get: (id: string) => {
                  const data = storage.get(id);
                  return {
                    onsuccess: null,
                    result: data,
                  };
                },
                delete: (id: string) => {
                  storage.delete(id);
                  queueData = queueData.filter((item) => item.id !== id);
                  return { onsuccess: null };
                },
                clear: () => {
                  storage.clear();
                  queueData = [];
                  return { onsuccess: null };
                },
                count: () => {
                  return {
                    onsuccess: null,
                    result: queueData.length,
                  };
                },
                openCursor: () => {
                  let index = 0;
                  return {
                    onsuccess: null,
                    result: {
                      value: queueData[index],
                      continue: () => {
                        index++;
                        return queueData[index];
                      },
                    },
                  };
                },
                index: () => ({
                  openCursor: () => ({
                    onsuccess: null,
                    result: null,
                  }),
                  count: () => ({
                    onsuccess: null,
                    result: 0,
                  }),
                }),
              }),
            }),
            objectStoreNames: {
              contains: () => true,
            },
            createObjectStore: () => ({
              createIndex: () => {},
            }),
          },
        } as unknown as IDBOpenDBRequest;
      },
    };

    // Expose queue data for testing
    (window as unknown as MockWindow).getOfflineQueueData = () => queueData;
    (window as unknown as MockWindow).clearOfflineQueue = () => {
      storage.clear();
      queueData = [];
    };
  });
}

/**
 * Mock tRPC mutations for testing
 */
export async function mockTRPCMutations(page: Page) {
  await page.addInitScript(() => {
    // Track API calls
    (window as any).apiCallCount = {
      "admin.create": 0,
      "inventory.update": 0,
      "inventory.markAsInUse": 0,
    };

    // Mock failure conditions
    (window as any).mockTRPCFailures = {
      "admin.create": () => false,
      "inventory.update": () => false,
      "inventory.markAsInUse": () => false,
    };

    // Override tRPC client
    const originalApi = (window as any).api;
    if (originalApi) {
      // Mock admin.create
      const originalAdminCreate = originalApi.admin?.create?.mutate;
      if (originalAdminCreate) {
        originalApi.admin.create.mutate = async (input: unknown) => {
          (window as any).apiCallCount["admin.create"]++;

          if ((window as any).mockTRPCFailures["admin.create"]()) {
            throw new Error("Mock network error");
          }

          // Return mock success response
          return {
            id: `admin-${Date.now()}`,
            ...(input as any),
            createdAt: new Date().toISOString(),
          };
        };
      }

      // Mock inventory.updateQuantity
      const originalInventoryUpdate =
        originalApi.inventory?.updateQuantity?.mutate;
      if (originalInventoryUpdate) {
        originalApi.inventory.updateQuantity.mutate = async (
          input: unknown,
        ) => {
          (window as any).apiCallCount["inventory.update"]++;

          if ((window as any).mockTRPCFailures["inventory.update"]()) {
            throw new Error("Mock network error");
          }

          return {
            id: (input as MockInput).id,
            quantity: 100, // Mock updated quantity
            ...(input as any),
          };
        };
      }

      // Mock inventory.markAsInUse
      const originalMarkAsInUse = originalApi.inventory?.markAsInUse?.mutate;
      if (originalMarkAsInUse) {
        originalApi.inventory.markAsInUse.mutate = async (input: unknown) => {
          (window as any).apiCallCount["inventory.markAsInUse"]++;

          if ((window as any).mockTRPCFailures["inventory.markAsInUse"]()) {
            throw new Error("Mock network error");
          }

          return {
            id: (input as MockInput).id,
            inUse: true,
            ...(input as any),
          };
        };
      }
    }
  });
}

/**
 * Simulate going offline
 */
export async function simulateOffline(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(navigator, "onLine", {
      writable: true,
      value: false,
    });
    window.dispatchEvent(new Event("offline"));
  });

  // Wait for offline state to be recognized
  await page.waitForTimeout(100);
}

/**
 * Simulate going online
 */
export async function simulateOnline(page: Page) {
  await page.evaluate(() => {
    Object.defineProperty(navigator, "onLine", {
      writable: true,
      value: true,
    });
    window.dispatchEvent(new Event("online"));
  });

  // Wait for online state to be recognized
  await page.waitForTimeout(100);
}

/**
 * Get current offline queue size
 */
export async function getQueueSize(page: Page): Promise<number> {
  return await page.evaluate(() => {
    const data = (window as any).getOfflineQueueData();
    return data ? data.length : 0;
  });
}

/**
 * Get offline queue data for assertions
 */
export async function getQueueData(page: Page): Promise<QueuedMutationData[]> {
  return await page.evaluate(() => {
    return (window as any).getOfflineQueueData() || [];
  });
}

/**
 * Clear offline queue for test cleanup
 */
export async function clearOfflineQueue(page: Page) {
  await page.evaluate(() => {
    (window as any).clearOfflineQueue();
  });
}

/**
 * Wait for sync to complete
 */
export async function waitForSync(page: Page, timeout = 5000) {
  await page.waitForFunction(
    () => {
      const data = (window as any).getOfflineQueueData();
      return !data || data.length === 0;
    },
    { timeout },
  );
}

/**
 * Mock successful sync for specific mutation types
 */
export async function mockSuccessfulSync(page: Page, mutationTypes: string[]) {
  await page.evaluate((types) => {
    types.forEach((type) => {
      (window as any).mockTRPCFailures[type] = () => false;
    });
  }, mutationTypes);
}

/**
 * Mock failed sync for specific mutation types
 */
export async function mockFailedSync(page: Page, mutationTypes: string[]) {
  await page.evaluate((types) => {
    types.forEach((type) => {
      (window as any).mockTRPCFailures[type] = () => true;
    });
  }, mutationTypes);
}

/**
 * Get API call counts for assertions
 */
export async function getApiCallCounts(
  page: Page,
): Promise<Record<string, number>> {
  return await page.evaluate(() => {
    return (window as any).apiCallCount || {};
  });
}

/**
 * Reset API call counts
 */
export async function resetApiCallCounts(page: Page) {
  await page.evaluate(() => {
    (window as any).apiCallCount = {
      "admin.create": 0,
      "inventory.update": 0,
      "inventory.markAsInUse": 0,
    };
  });
}
