/**
 * Unit tests for usePhotoUpload hook
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePhotoUpload } from "@/hooks/offline/usePhotoUpload";

// Mock dependencies
vi.mock("@/lib/offline/photo-storage", () => ({
  getPhotoSyncStats: vi.fn(),
  initPhotoStorage: vi.fn(),
  isPhotoStorageSupported: vi.fn(),
  storePhotoOffline: vi.fn(),
  syncPendingPhotos: vi.fn(),
}));

vi.mock("@/components/ui/use-toast", () => ({
  useToast: vi.fn(),
}));

// Mock fetch for uploads
global.fetch = vi.fn();

const mockGetPhotoSyncStats = vi.mocked(
  (await import("@/lib/offline/photo-storage")).getPhotoSyncStats,
);
const mockInitPhotoStorage = vi.mocked(
  (await import("@/lib/offline/photo-storage")).initPhotoStorage,
);
const mockIsPhotoStorageSupported = vi.mocked(
  (await import("@/lib/offline/photo-storage")).isPhotoStorageSupported,
);
const mockStorePhotoOffline = vi.mocked(
  (await import("@/lib/offline/photo-storage")).storePhotoOffline,
);
const mockSyncPendingPhotos = vi.mocked(
  (await import("@/lib/offline/photo-storage")).syncPendingPhotos,
);
const mockUseToast = vi.mocked(
  (await import("@/components/ui/use-toast")).useToast,
);

// Helper to create a mock File
const createMockFile = (
  name: string,
  size: number = 1024,
  type: string = "image/jpeg",
): File => {
  return new File([new ArrayBuffer(size)], name, { type });
};

describe("usePhotoUpload", () => {
  const mockToast = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    // Mock toast
    mockUseToast.mockReturnValue({
      toast: mockToast,
      dismiss: vi.fn(),
      toasts: [],
    });

    // Mock photo storage functions
    mockIsPhotoStorageSupported.mockReturnValue(true);
    mockInitPhotoStorage.mockResolvedValue(undefined);
    mockGetPhotoSyncStats.mockResolvedValue({
      pending: 0,
      uploading: 0,
      uploaded: 0,
      failed: 0,
      total: 0,
    });
    mockStorePhotoOffline.mockResolvedValue("stored-photo-id");
    mockSyncPendingPhotos.mockResolvedValue({
      success: 0,
      failed: 0,
      errors: [],
    });

    // Mock fetch for successful upload
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ url: "https://example.com/photo.jpg" }),
    } as any);

    // Mock navigator.onLine
    Object.defineProperty(navigator, "onLine", {
      writable: true,
      value: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes with correct default state", () => {
    const { result } = renderHook(() =>
      usePhotoUpload({
        householdId: "household-1",
        userId: "user-1",
      }),
    );

    expect(result.current.isOnline).toBe(true);
    expect(result.current.isUploading).toBe(false);
    expect(result.current.uploadProgress).toBe(0);
    expect(result.current.error).toBeNull();
    expect(result.current.storageSupported).toBe(true);
    expect(result.current.stats).toEqual({
      pending: 0,
      uploading: 0,
      uploaded: 0,
      failed: 0,
      total: 0,
    });
  });

  it("uploads photo successfully when online", async () => {
    const onUploadSuccess = vi.fn();
    const { result } = renderHook(() =>
      usePhotoUpload({
        householdId: "household-1",
        userId: "user-1",
        onUploadSuccess,
      }),
    );
    const testFile = createMockFile("test.jpg", 2048);

    let uploadedUrl: string;
    await act(async () => {
      uploadedUrl = await result.current.uploadPhoto(testFile);
    });

    expect(fetch).toHaveBeenCalledWith("/api/upload", {
      method: "POST",
      body: expect.any(FormData),
    });

    expect(uploadedUrl!).toBe("https://example.com/photo.jpg");
    expect(result.current.isUploading).toBe(false);
    expect(result.current.uploadProgress).toBe(100);
    expect(onUploadSuccess).toHaveBeenCalledWith(
      "https://example.com/photo.jpg",
      "",
    );
    expect(mockToast).toHaveBeenCalledWith({
      title: "Photo uploaded successfully",
      description: "Your photo has been uploaded and is ready to use.",
    });
  });

  it("stores photo offline when offline", async () => {
    // Set offline
    Object.defineProperty(navigator, "onLine", {
      writable: true,
      value: false,
    });

    const { result } = renderHook(() =>
      usePhotoUpload({
        householdId: "household-1",
        userId: "user-1",
        animalId: "animal-1",
      }),
    );

    // Wait for the hook to reflect offline status
    await waitFor(() => {
      expect(result.current.isOnline).toBe(false);
    });

    const testFile = createMockFile("test.jpg", 1024);

    let photoId: string;
    await act(async () => {
      photoId = await result.current.uploadPhoto(testFile);
    });

    expect(mockStorePhotoOffline).toHaveBeenCalledWith(
      testFile,
      "user-1",
      "household-1",
      "animal-1",
    );
    expect(photoId!).toBe("stored-photo-id");
    expect(result.current.isUploading).toBe(false);
    expect(result.current.uploadProgress).toBe(100);
    expect(mockToast).toHaveBeenCalledWith({
      title: "Photo saved for upload",
      description: "Your photo will be uploaded when you're back online.",
    });
  });

  it("handles upload errors gracefully", async () => {
    const onUploadError = vi.fn();
    const { result } = renderHook(() =>
      usePhotoUpload({
        householdId: "household-1",
        userId: "user-1",
        onUploadError,
      }),
    );

    // Mock fetch to fail
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: "Upload failed" }),
    } as any);

    const testFile = createMockFile("test.jpg", 1024);

    await act(async () => {
      try {
        await result.current.uploadPhoto(testFile);
      } catch (_error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toBe("Upload failed");
    expect(result.current.isUploading).toBe(false);
    expect(result.current.uploadProgress).toBe(0);
    expect(onUploadError).toHaveBeenCalledWith("Upload failed");
    expect(mockToast).toHaveBeenCalledWith({
      title: "Upload failed",
      description: "Upload failed",
      variant: "destructive",
    });
  });

  it("handles offline storage not supported", async () => {
    mockIsPhotoStorageSupported.mockReturnValue(false);

    // Set offline
    Object.defineProperty(navigator, "onLine", {
      writable: true,
      value: false,
    });

    const { result } = renderHook(() =>
      usePhotoUpload({
        householdId: "household-1",
        userId: "user-1",
      }),
    );

    // Wait for hook to reflect offline status and no storage support
    await waitFor(() => {
      expect(result.current.isOnline).toBe(false);
      expect(result.current.storageSupported).toBe(false);
    });

    const testFile = createMockFile("test.jpg", 1024);

    await act(async () => {
      try {
        await result.current.uploadPhoto(testFile);
      } catch (_error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toBe("Offline storage not supported");
    expect(mockStorePhotoOffline).not.toHaveBeenCalled();
  });

  it("syncs pending photos", async () => {
    mockSyncPendingPhotos.mockResolvedValue({
      success: 2,
      failed: 0,
      errors: [],
    });

    const { result } = renderHook(() =>
      usePhotoUpload({
        householdId: "household-1",
        userId: "user-1",
      }),
    );

    await act(async () => {
      await result.current.syncPhotos();
    });

    expect(mockSyncPendingPhotos).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith({
      title: "Photos synced",
      description: "Successfully uploaded 2 photo(s).",
    });
  });

  it("handles sync failures", async () => {
    mockSyncPendingPhotos.mockResolvedValue({
      success: 1,
      failed: 1,
      errors: [{ id: "photo-1", error: "Network error" }],
    });

    const { result } = renderHook(() =>
      usePhotoUpload({
        householdId: "household-1",
        userId: "user-1",
      }),
    );

    await act(async () => {
      await result.current.syncPhotos();
    });

    expect(mockSyncPendingPhotos).toHaveBeenCalled();
    expect(mockToast).toHaveBeenCalledWith({
      title: "Photos synced",
      description: "Successfully uploaded 1 photo(s).",
    });
    expect(mockToast).toHaveBeenCalledWith({
      title: "Some uploads failed",
      description: "1 photo(s) failed to upload and will be retried later.",
      variant: "destructive",
    });
  });

  it("sets upload progress correctly", () => {
    const { result } = renderHook(() =>
      usePhotoUpload({
        householdId: "household-1",
        userId: "user-1",
      }),
    );

    act(() => {
      result.current.setUploadProgress(50);
    });

    expect(result.current.uploadProgress).toBe(50);
  });

  it("clears errors", async () => {
    const { result } = renderHook(() =>
      usePhotoUpload({
        householdId: "household-1",
        userId: "user-1",
      }),
    );

    // First cause an error by failing an upload
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: "Some error" }),
    } as any);

    const testFile = createMockFile("test.jpg", 1024);

    await act(async () => {
      try {
        await result.current.uploadPhoto(testFile);
      } catch (_error) {
        // Expected to throw
      }
    });

    expect(result.current.error).toBe("Some error");

    // Clear the error
    act(() => {
      result.current.clearErrorAction();
    });

    expect(result.current.error).toBeNull();
  });

  it("updates stats", async () => {
    const updatedStats = {
      pending: 2,
      uploading: 1,
      uploaded: 5,
      failed: 0,
      total: 8,
    };
    mockGetPhotoSyncStats.mockResolvedValue(updatedStats);

    const { result } = renderHook(() =>
      usePhotoUpload({
        householdId: "household-1",
        userId: "user-1",
      }),
    );

    await act(async () => {
      await result.current.updateStats();
    });

    expect(mockGetPhotoSyncStats).toHaveBeenCalled();
    expect(result.current.stats).toEqual(updatedStats);
  });

  it("initializes storage when supported", async () => {
    renderHook(() =>
      usePhotoUpload({
        householdId: "household-1",
        userId: "user-1",
      }),
    );

    await waitFor(() => {
      expect(mockInitPhotoStorage).toHaveBeenCalled();
      expect(mockGetPhotoSyncStats).toHaveBeenCalled();
    });
  });

  it("does not initialize storage when not supported", () => {
    mockIsPhotoStorageSupported.mockReturnValue(false);

    const { result } = renderHook(() =>
      usePhotoUpload({
        householdId: "household-1",
        userId: "user-1",
      }),
    );

    expect(result.current.storageSupported).toBe(false);
    expect(mockInitPhotoStorage).not.toHaveBeenCalled();
  });
});
