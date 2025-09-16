// @ts-nocheck
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

/**
 * Mock IndexedDB offline queue for testing
 */
export async function mockOfflineQueue(page: Page) {
  await page.addInitScript(() => {
    // Mock IndexedDB with in-memory storage
    const storage = new Map<string, QueuedMutationData>();
    let queueData: QueuedMutationData[] = [];

    // Override IndexedDB
    Object.defineProperty(window, "indexedDB", {
      configurable: true,
      value: {
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
                  count: () => ({
                    onsuccess: null,
                    result: queueData.length,
                  }),
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
      },
    });

    // Expose queue data for testing
    window.getOfflineQueueData = () => queueData;
    window.clearOfflineQueue = () => {
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
    window.apiCallCount = {
      "admin.create": 0,
      "inventory.update": 0,
      "inventory.markAsInUse": 0,
    };
    const apiCallCount = window.apiCallCount ?? {};
    window.apiCallCount = apiCallCount;

    // Mock failure conditions
    window.mockTRPCFailures = {
      "admin.create": () => false,
      "inventory.update": () => false,
      "inventory.markAsInUse": () => false,
    };
    const failureHandlers = window.mockTRPCFailures ?? {};
    window.mockTRPCFailures = failureHandlers;

    // Override tRPC client
    const originalApi = window.api;
    if (originalApi) {
      // Mock admin.create
      const adminApi = originalApi.admin;
      const createMutation = adminApi?.create;
      if (createMutation?.mutate) {
        createMutation.mutate = async (input: Record<string, unknown>) => {
          apiCallCount["admin.create"]++;

          if (failureHandlers["admin.create"]?.()) {
            throw new Error("Mock network error");
          }

          // Return mock success response
          return {
            id: `admin-${Date.now()}`,
            ...input,
            createdAt: new Date().toISOString(),
          };
        };
      }

      // Mock inventory.updateQuantity
      const inventoryApi = originalApi.inventory;
      const updateQuantityMutation = inventoryApi?.updateQuantity;
      if (updateQuantityMutation?.mutate) {
        updateQuantityMutation.mutate = async (
          input: Record<string, unknown>,
        ) => {
          apiCallCount["inventory.update"]++;

          if (failureHandlers["inventory.update"]?.()) {
            throw new Error("Mock network error");
          }

          const { id } = input as MockInput;
          return {
            id,
            quantity: 100, // Mock updated quantity
            ...input,
          };
        };
      }

      // Mock inventory.markAsInUse
      const markAsInUseMutation = inventoryApi?.markAsInUse;
      if (markAsInUseMutation?.mutate) {
        markAsInUseMutation.mutate = async (input: Record<string, unknown>) => {
          apiCallCount["inventory.markAsInUse"]++;

          if (failureHandlers["inventory.markAsInUse"]?.()) {
            throw new Error("Mock network error");
          }

          const { id } = input as MockInput;
          return {
            id,
            inUse: true,
            ...input,
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
    const data = window.getOfflineQueueData?.();
    return data ? data.length : 0;
  });
}

/**
 * Get offline queue data for assertions
 */
export async function getQueueData(page: Page): Promise<QueuedMutationData[]> {
  return await page.evaluate(() => {
    return window.getOfflineQueueData?.() ?? [];
  });
}

/**
 * Clear offline queue for test cleanup
 */
export async function clearOfflineQueue(page: Page) {
  await page.evaluate(() => {
    window.clearOfflineQueue?.();
  });
}

/**
 * Wait for sync to complete
 */
export async function waitForSync(page: Page, timeout = 5000) {
  await page.waitForFunction(
    () => {
      const data = window.getOfflineQueueData?.();
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
      if (!window.mockTRPCFailures) {
        window.mockTRPCFailures = {};
      }
      window.mockTRPCFailures[type] = () => false;
    });
  }, mutationTypes);
}

/**
 * Mock failed sync for specific mutation types
 */
export async function mockFailedSync(page: Page, mutationTypes: string[]) {
  await page.evaluate((types) => {
    types.forEach((type) => {
      if (!window.mockTRPCFailures) {
        window.mockTRPCFailures = {};
      }
      window.mockTRPCFailures[type] = () => true;
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
    return window.apiCallCount ?? {};
  });
}

/**
 * Reset API call counts
 */
export async function resetApiCallCounts(page: Page) {
  await page.evaluate(() => {
    window.apiCallCount = {
      "admin.create": 0,
      "inventory.update": 0,
      "inventory.markAsInUse": 0,
    };
  });
}

/**
 * Select an animal from the dropdown
 */
export async function selectAnimal(page: Page, animalName: string) {
  await page.getByTestId("animal-selector").click();
  await page.getByText(animalName).click();
}

/**
 * Select a regimen from the dropdown
 */
export async function selectRegimen(page: Page, regimenName: string) {
  await page.getByTestId("regimen-selector").click();
  await page.getByText(regimenName).click();
}

/**
 * Hold and release the record button to record an administration
 */
export async function holdRecordButton(page: Page, holdDuration = 3000) {
  const recordButton = page.getByTestId("record-button");
  await recordButton.press("Space");
  await page.waitForTimeout(holdDuration);
  await recordButton.press("Space"); // Release
}

/**
 * Complete full administration recording flow
 */
export async function recordAdministration(
  page: Page,
  animalName: string,
  regimenName: string,
  options?: {
    inventorySource?: string;
    holdDuration?: number;
    waitAfter?: number;
  },
) {
  const {
    inventorySource,
    holdDuration = 3000,
    waitAfter = 1000,
  } = options || {};

  await selectAnimal(page, animalName);
  await selectRegimen(page, regimenName);

  if (inventorySource) {
    await page.getByTestId("inventory-source").click();
    await page.getByText(inventorySource).click();
  }

  await holdRecordButton(page, holdDuration);

  if (waitAfter > 0) {
    await page.waitForTimeout(waitAfter);
  }
}
