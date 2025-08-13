import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactElement, ReactNode } from "react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { QueuedMutation } from "@/lib/offline/db";
import * as db from "@/lib/offline/db";
import { trpc } from "@/server/trpc/client";
import { useOfflineQueue } from "./useOfflineQueue";

// Mock dependencies
vi.mock("@/lib/offline/db");
vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({ user: { id: "user-123" } })),
}));
vi.mock("@/components/providers/app-provider-consolidated", () => ({
  useApp: vi.fn(() => ({ selectedHousehold: { id: "household-123" } })),
}));
vi.mock("@/lib/trpc/client", () => ({
  trpc: {
    admin: {
      create: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn(),
        })),
      },
    },
    inventory: {
      updateQuantity: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn(),
        })),
      },
      markAsInUse: {
        useMutation: vi.fn(() => ({
          mutateAsync: vi.fn(),
        })),
      },
    },
    useUtils: vi.fn(() => ({
      admin: {
        list: { invalidate: vi.fn() },
      },
      regimen: {
        listDue: { invalidate: vi.fn() },
      },
      inventory: {
        getSources: { invalidate: vi.fn() },
        getHouseholdInventory: { invalidate: vi.fn() },
      },
    })),
  },
}));
vi.mock("sonner");

// Create a wrapper component with necessary providers
const wrapper = ({ children }: { children: ReactNode }) => {
  return children as ReactElement;
};

describe("useOfflineQueue Integration Tests", () => {
  const mockHouseholdId = "household-123";
  const mockUserId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(db.getQueueSize).mockResolvedValue(0);
    vi.mocked(db.getQueuedMutations).mockResolvedValue([]);

    // Mock online status
    Object.defineProperty(window.navigator, "onLine", {
      writable: true,
      value: true,
    });
  });

  describe("Online Sync Scenarios", () => {
    it("should sync queued mutations when coming back online", async () => {
      const mockMutations: db.QueuedMutation[] = [
        {
          id: "mutation-1",
          type: "admin.create",
          payload: { test: "data1" },
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          householdId: mockHouseholdId,
          userId: mockUserId,
        },
        {
          id: "mutation-2",
          type: "inventory.update",
          payload: { test: "data2" },
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          householdId: mockHouseholdId,
          userId: mockUserId,
        },
      ];

      vi.mocked(db.getQueuedMutations).mockResolvedValue(mockMutations);
      vi.mocked(db.getQueueSize).mockResolvedValue(2);

      // Mock the mutations
      const adminCreateMock = vi.mocked(trpc.admin.create.useMutation);
      const inventoryUpdateMock = vi.mocked(
        trpc.inventory.updateQuantity.useMutation,
      );

      adminCreateMock.mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({ id: "admin-1" }),
        mutate: vi.fn(),
        reset: vi.fn(),
        error: null,
        data: undefined,
        status: "idle",
        isIdle: true,
        isPending: false,
        isError: false,
        isSuccess: false,
        failureCount: 0,
        failureReason: null,
        isPaused: false,
        variables: undefined,
        submittedAt: 0,
        trpc: { path: "admin.create" },
        context: undefined,
      } as any);

      inventoryUpdateMock.mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({ id: "inventory-1" }),
        mutate: vi.fn(),
        reset: vi.fn(),
        error: null,
        data: undefined,
        status: "idle",
        isIdle: true,
        isPending: false,
        isError: false,
        isSuccess: false,
        failureCount: 0,
        failureReason: null,
        isPaused: false,
        variables: undefined,
        submittedAt: 0,
        trpc: { path: "inventory.updateQuantity" },
        context: undefined,
      } as any);

      vi.mocked(db.removeFromQueue).mockResolvedValue();

      // Start offline
      Object.defineProperty(window.navigator, "onLine", {
        writable: true,
        configurable: true,
        value: false,
      });
      const { result } = renderHook(() => useOfflineQueue(), { wrapper });

      expect(result.current.isOnline).toBe(false);

      // Simulate coming back online
      Object.defineProperty(window.navigator, "onLine", {
        writable: true,
        configurable: true,
        value: true,
      });
      act(() => {
        window.dispatchEvent(new Event("online"));
      });

      // Wait for auto-sync to complete
      await waitFor(() => {
        expect(result.current.isProcessing).toBe(false);
      });

      // Verify mutations were processed
      const adminMutateAsync =
        adminCreateMock.mock.results[0]?.value.mutateAsync;
      const inventoryMutateAsync =
        inventoryUpdateMock.mock.results[0]?.value.mutateAsync;

      expect(adminMutateAsync).toHaveBeenCalledWith({ test: "data1" });
      expect(inventoryMutateAsync).toHaveBeenCalledWith({ test: "data2" });

      // Verify items removed from queue
      expect(db.removeFromQueue).toHaveBeenCalledWith("mutation-1");
      expect(db.removeFromQueue).toHaveBeenCalledWith("mutation-2");

      // Verify success notification
      expect(toast.success).toHaveBeenCalledWith(
        "Successfully synced 2 offline changes",
      );
    });

    it("should handle partial sync failures with retry", async () => {
      const mockMutations: db.QueuedMutation[] = [
        {
          id: "mutation-1",
          type: "admin.create",
          payload: { test: "data1" },
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          householdId: mockHouseholdId,
          userId: mockUserId,
        },
        {
          id: "mutation-2",
          type: "admin.create",
          payload: { test: "data2" },
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          householdId: mockHouseholdId,
          userId: mockUserId,
        },
      ];

      vi.mocked(db.getQueuedMutations).mockResolvedValue(mockMutations);
      vi.mocked(db.getQueueSize).mockResolvedValue(2);

      // First mutation succeeds, second fails
      const adminCreateMock = vi.mocked(trpc.admin.create.useMutation);
      adminCreateMock.mockReturnValue({
        mutateAsync: vi
          .fn()
          .mockResolvedValueOnce({ id: "admin-1" })
          .mockRejectedValueOnce(new Error("Network error")),
        mutate: vi.fn(),
        reset: vi.fn(),
        error: null,
        data: undefined,
        status: "idle",
        isIdle: true,
        isPending: false,
        isError: false,
        isSuccess: false,
        failureCount: 0,
        failureReason: null,
        isPaused: false,
        variables: undefined,
        submittedAt: 0,
        trpc: { path: "admin.create" },
        context: undefined,
      } as any);

      vi.mocked(db.removeFromQueue).mockResolvedValue();
      vi.mocked(db.updateQueuedMutation).mockResolvedValue();

      const { result } = renderHook(() => useOfflineQueue(), { wrapper });

      // Trigger manual sync
      await act(async () => {
        await result.current.sync();
      });

      // Verify first mutation was removed
      expect(db.removeFromQueue).toHaveBeenCalledWith("mutation-1");

      // Verify second mutation was updated with error
      expect(db.updateQueuedMutation).toHaveBeenCalledWith(
        "mutation-2",
        expect.objectContaining({
          retries: 1,
          lastError: "Network error",
        }),
      );

      // Verify partial success notification
      expect(toast.success).toHaveBeenCalledWith("Synced 1 change, 1 failed");
    });

    it("should skip mutations that exceed max retries", async () => {
      const mockMutations: db.QueuedMutation[] = [
        {
          id: "mutation-1",
          type: "admin.create",
          payload: { test: "data1" },
          timestamp: Date.now(),
          retries: 3, // Already at max retries
          maxRetries: 3,
          householdId: mockHouseholdId,
          userId: mockUserId,
        },
      ];

      vi.mocked(db.getQueuedMutations).mockResolvedValue(mockMutations);
      vi.mocked(db.getQueueSize).mockResolvedValue(1);
      vi.mocked(db.removeFromQueue).mockResolvedValue();

      const { result } = renderHook(() => useOfflineQueue(), { wrapper });

      await act(async () => {
        await result.current.sync();
      });

      // Verify mutation was not attempted
      const adminCreateMock = vi.mocked(trpc.admin.create.useMutation);
      expect(adminCreateMock).toHaveBeenCalled();
      const mutateAsync = adminCreateMock.mock.results[0]?.value.mutateAsync;
      expect(mutateAsync).not.toHaveBeenCalled();

      // Verify it was removed from queue
      expect(db.removeFromQueue).toHaveBeenCalledWith("mutation-1");

      // Verify warning notification
      expect(toast.warning).toHaveBeenCalledWith(
        "1 change exceeded retry limit and was removed",
      );
    });
  });

  describe("Offline Enqueue Scenarios", () => {
    it("should enqueue mutations when offline", async () => {
      Object.defineProperty(window.navigator, "onLine", {
        writable: true,
        configurable: true,
        value: false,
      });

      vi.mocked(db.addToQueue).mockResolvedValue();
      vi.mocked(db.getQueueSize)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(1);

      const { result } = renderHook(() => useOfflineQueue(), { wrapper });

      const payload = { animalId: "animal-1", regimenId: "regimen-1" };
      const idempotencyKey = "test-key-123";

      await act(async () => {
        await result.current.enqueue("admin.create", payload, idempotencyKey);
      });

      // Verify mutation was added to queue
      expect(db.addToQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          id: idempotencyKey,
          type: "admin.create",
          payload,
          householdId: mockHouseholdId,
          userId: mockUserId,
          retries: 0,
          maxRetries: 3,
        }),
      );

      // Verify queue size updated
      expect(result.current.queueSize).toBe(1);

      // Verify offline notification
      expect(toast.info).toHaveBeenCalledWith(
        "Saved offline - will sync when connected",
      );
    });

    it("should not enqueue when online", async () => {
      Object.defineProperty(window.navigator, "onLine", {
        writable: true,
        configurable: true,
        value: true,
      });

      const { result } = renderHook(() => useOfflineQueue(), { wrapper });

      const payload = { animalId: "animal-1", regimenId: "regimen-1" };
      const idempotencyKey = "test-key-123";

      await act(async () => {
        await result.current.enqueue("admin.create", payload, idempotencyKey);
      });

      // Verify mutation was not added to queue
      expect(db.addToQueue).not.toHaveBeenCalled();
    });
  });

  describe("Progress Tracking", () => {
    it("should track sync progress accurately", async () => {
      const mockMutations: db.QueuedMutation[] = Array.from(
        { length: 5 },
        (_, i) => ({
          id: `mutation-${i}`,
          type: "admin.create",
          payload: { test: `data${i}` },
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          householdId: mockHouseholdId,
          userId: mockUserId,
        }),
      );

      vi.mocked(db.getQueuedMutations).mockResolvedValue(mockMutations);
      vi.mocked(db.getQueueSize).mockResolvedValue(5);

      const adminCreateMock = vi.mocked(trpc.admin.create.useMutation);
      adminCreateMock.mockReturnValue({
        mutateAsync: vi.fn().mockResolvedValue({ id: "admin-1" }),
        mutate: vi.fn(),
        reset: vi.fn(),
        error: null,
        data: undefined,
        status: "idle",
        isIdle: true,
        isPending: false,
        isError: false,
        isSuccess: false,
        failureCount: 0,
        failureReason: null,
        isPaused: false,
        variables: undefined,
        submittedAt: 0,
        trpc: { path: "admin.create" },
        context: undefined,
      } as any);

      vi.mocked(db.removeFromQueue).mockResolvedValue();

      const { result } = renderHook(() => useOfflineQueue(), { wrapper });

      const _progressUpdates: Array<{ current: number; total: number }> = [];

      // Capture progress updates
      const originalSync = result.current.sync;
      await act(async () => {
        await originalSync();
      });

      // Initial progress should be 0/5
      expect(result.current.syncProgress.total).toBe(0);
      expect(result.current.syncProgress.current).toBe(0);

      // Verify all mutations were processed
      const mutateAsync = adminCreateMock.mock.results[0]?.value.mutateAsync;
      expect(mutateAsync).toHaveBeenCalledTimes(5);
      expect(db.removeFromQueue).toHaveBeenCalledTimes(5);
    });
  });

  describe("Queue Management", () => {
    it("should clear queue with confirmation", async () => {
      const mockMutations: db.QueuedMutation[] = [
        {
          id: "mutation-1",
          type: "admin.create",
          payload: { test: "data1" },
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          householdId: mockHouseholdId,
          userId: mockUserId,
        },
      ];

      vi.mocked(db.getQueuedMutations).mockResolvedValue(mockMutations);
      vi.mocked(db.getQueueSize)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0);
      vi.mocked(db.clearQueue).mockResolvedValue();

      // Mock window.confirm
      global.confirm = vi.fn().mockReturnValue(true);

      const { result } = renderHook(() => useOfflineQueue(), { wrapper });

      await act(async () => {
        await result.current.clearQueue();
      });

      // Verify confirmation was requested
      expect(global.confirm).toHaveBeenCalledWith(
        "Are you sure you want to clear 1 pending change? This cannot be undone.",
      );

      // Verify queue was cleared
      expect(db.clearQueue).toHaveBeenCalledWith(mockHouseholdId);

      // Verify queue size updated
      expect(result.current.queueSize).toBe(0);

      // Verify success notification
      expect(toast.success).toHaveBeenCalledWith("Offline queue cleared");
    });

    it("should not clear queue if user cancels", async () => {
      vi.mocked(db.getQueueSize).mockResolvedValue(1);
      global.confirm = vi.fn().mockReturnValue(false);

      const { result } = renderHook(() => useOfflineQueue(), { wrapper });

      await act(async () => {
        await result.current.clearQueue();
      });

      // Verify queue was not cleared
      expect(db.clearQueue).not.toHaveBeenCalled();
    });

    it("should get queue details", async () => {
      const mockMutations: db.QueuedMutation[] = [
        {
          id: "mutation-1",
          type: "admin.create",
          payload: { test: "data1" },
          timestamp: Date.now() - 60000, // 1 minute ago
          retries: 1,
          maxRetries: 3,
          lastError: "Previous error",
          householdId: mockHouseholdId,
          userId: mockUserId,
        },
      ];

      vi.mocked(db.getQueuedMutations).mockResolvedValue(mockMutations);

      const { result } = renderHook(() => useOfflineQueue(), { wrapper });

      let details: QueuedMutation[] | undefined;
      await act(async () => {
        details = await result.current.getQueueDetails();
      });

      expect(details).toEqual(mockMutations);
      expect(db.getQueuedMutations).toHaveBeenCalledWith(mockHouseholdId);
    });
  });

  describe("Error Handling", () => {
    it("should handle sync errors gracefully", async () => {
      const mockMutations: db.QueuedMutation[] = [
        {
          id: "mutation-1",
          type: "invalid-type" as QueuedMutation["type"],
          payload: { test: "data1" },
          timestamp: Date.now(),
          retries: 0,
          maxRetries: 3,
          householdId: mockHouseholdId,
          userId: mockUserId,
        },
      ];

      vi.mocked(db.getQueuedMutations).mockResolvedValue(mockMutations);
      vi.mocked(db.getQueueSize).mockResolvedValue(1);
      vi.mocked(db.updateQueuedMutation).mockResolvedValue();

      const { result } = renderHook(() => useOfflineQueue(), { wrapper });

      await act(async () => {
        await result.current.sync();
      });

      // Verify error was logged
      expect(db.updateQueuedMutation).toHaveBeenCalledWith(
        "mutation-1",
        expect.objectContaining({
          retries: 1,
          lastError: expect.stringContaining("Unknown mutation type"),
        }),
      );
    });
  });
});
