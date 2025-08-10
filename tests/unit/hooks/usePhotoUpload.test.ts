/**
 * Unit tests for usePhotoUpload hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { usePhotoUpload } from "@/hooks/offline/usePhotoUpload";
import { testConfig } from "@/tests/helpers/test-fixtures";

// Mock dependencies
vi.mock("@/lib/utils/image-compression", () => ({
	compressImage: vi.fn(),
}));

vi.mock("@/lib/offline/photo-storage", () => ({
	storePhoto: vi.fn(),
	getPhotoUrl: vi.fn(),
	deletePhoto: vi.fn(),
}));

vi.mock("@/hooks/offline/useOfflineQueue", () => ({
	useOfflineQueue: vi.fn(),
}));

const mockCompressImage = vi.mocked(
	(await import("@/lib/utils/image-compression")).compressImage,
);
const mockStorePhoto = vi.mocked(
	(await import("@/lib/offline/photo-storage")).storePhoto,
);
const mockGetPhotoUrl = vi.mocked(
	(await import("@/lib/offline/photo-storage")).getPhotoUrl,
);
const mockDeletePhoto = vi.mocked(
	(await import("@/lib/offline/photo-storage")).deletePhoto,
);
const mockUseOfflineQueue = vi.mocked(
	(await import("@/hooks/offline/useOfflineQueue")).useOfflineQueue,
);

// Helper to create a mock File
const createMockFile = (
	name: string,
	size: number = 1024,
	type: string = "image/jpeg",
): File => {
	const file = new File([new ArrayBuffer(size)], name, { type });
	return file;
};

describe("usePhotoUpload", () => {
	const mockQueueOperation = vi.fn();

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock offline queue
		mockUseOfflineQueue.mockReturnValue({
			queueOperation: mockQueueOperation,
			processQueue: vi.fn(),
			isOnline: true,
			queueSize: 0,
		});

		// Mock image compression
		mockCompressImage.mockResolvedValue(createMockFile("compressed.jpg", 512));

		// Mock photo storage
		mockStorePhoto.mockResolvedValue("stored-photo-id");
		mockGetPhotoUrl.mockReturnValue("blob:mock-url");
		mockDeletePhoto.mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("initializes with correct default state", () => {
		const { result } = renderHook(() => usePhotoUpload());

		expect(result.current.isUploading).toBe(false);
		expect(result.current.uploadProgress).toBe(0);
		expect(result.current.photos).toEqual([]);
		expect(result.current.error).toBeNull();
	});

	it("uploads photo successfully", async () => {
		const { result } = renderHook(() => usePhotoUpload());
		const testFile = createMockFile("test.jpg", 2048);

		await act(async () => {
			await result.current.uploadPhoto(testFile);
		});

		expect(mockCompressImage).toHaveBeenCalledWith(testFile, {
			maxWidth: 1920,
			maxHeight: 1920,
			quality: 0.85,
		});

		expect(mockStorePhoto).toHaveBeenCalledWith(
			expect.any(File),
			expect.objectContaining({
				originalName: "test.jpg",
				originalSize: 2048,
				compressedSize: 512,
			}),
		);

		await waitFor(() => {
			expect(result.current.photos).toHaveLength(1);
			expect(result.current.photos[0]).toMatchObject({
				id: "stored-photo-id",
				originalName: "test.jpg",
				url: "blob:mock-url",
				isUploaded: true,
			});
			expect(result.current.isUploading).toBe(false);
		});
	});

	it("handles upload progress correctly", async () => {
		const { result } = renderHook(() => usePhotoUpload());
		const testFile = createMockFile("test.jpg", 2048);

		// Mock slow compression to test progress
		mockCompressImage.mockImplementation(
			() =>
				new Promise((resolve) => {
					setTimeout(() => resolve(createMockFile("compressed.jpg", 512)), 100);
				}),
		);

		act(() => {
			result.current.uploadPhoto(testFile);
		});

		// Should show uploading state
		expect(result.current.isUploading).toBe(true);
		expect(result.current.uploadProgress).toBeGreaterThan(0);

		await waitFor(() => {
			expect(result.current.isUploading).toBe(false);
			expect(result.current.uploadProgress).toBe(100);
		});
	});

	it("handles upload errors gracefully", async () => {
		const { result } = renderHook(() => usePhotoUpload());
		const testFile = createMockFile("test.jpg", 2048);

		mockCompressImage.mockRejectedValue(new Error("Compression failed"));

		await act(async () => {
			try {
				await result.current.uploadPhoto(testFile);
			} catch (error) {
				// Expected to throw
			}
		});

		expect(result.current.error).toBe("Compression failed");
		expect(result.current.isUploading).toBe(false);
		expect(result.current.photos).toHaveLength(0);
	});

	it("validates file size", async () => {
		const { result } = renderHook(() => usePhotoUpload({ maxSizeMB: 1 }));
		const largeFile = createMockFile("large.jpg", 2 * 1024 * 1024); // 2MB

		await act(async () => {
			try {
				await result.current.uploadPhoto(largeFile);
			} catch (error) {
				// Expected to throw
			}
		});

		expect(result.current.error).toMatch(/file size exceeds/i);
		expect(mockCompressImage).not.toHaveBeenCalled();
	});

	it("validates file type", async () => {
		const { result } = renderHook(() => usePhotoUpload());
		const textFile = createMockFile("document.txt", 1024, "text/plain");

		await act(async () => {
			try {
				await result.current.uploadPhoto(textFile);
			} catch (error) {
				// Expected to throw
			}
		});

		expect(result.current.error).toMatch(/invalid file type/i);
		expect(mockCompressImage).not.toHaveBeenCalled();
	});

	it("deletes photo correctly", async () => {
		const { result } = renderHook(() => usePhotoUpload());
		const testFile = createMockFile("test.jpg", 1024);

		// First upload a photo
		await act(async () => {
			await result.current.uploadPhoto(testFile);
		});

		expect(result.current.photos).toHaveLength(1);
		const photoId = result.current.photos[0]?.id;

		// Then delete it
		await act(async () => {
			await result.current.deletePhoto(photoId!);
		});

		expect(mockDeletePhoto).toHaveBeenCalledWith(photoId);
		expect(result.current.photos).toHaveLength(0);
	});

	it("handles offline uploads", async () => {
		// Mock offline state
		mockUseOfflineQueue.mockReturnValue({
			queueOperation: mockQueueOperation,
			processQueue: vi.fn(),
			isOnline: false,
			queueSize: 1,
		});

		const { result } = renderHook(() => usePhotoUpload());
		const testFile = createMockFile("test.jpg", 1024);

		await act(async () => {
			await result.current.uploadPhoto(testFile);
		});

		// Should queue the upload operation
		expect(mockQueueOperation).toHaveBeenCalledWith({
			type: "PHOTO_UPLOAD",
			data: expect.objectContaining({
				file: expect.any(File),
			}),
		});

		// Photo should be marked as pending
		expect(result.current.photos).toHaveLength(1);
		expect(result.current.photos[0]?.isUploaded).toBe(false);
		expect(result.current.photos[0]?.isPending).toBe(true);
	});

	it("uploads multiple photos concurrently", async () => {
		const { result } = renderHook(() =>
			usePhotoUpload({ maxConcurrentUploads: 2 }),
		);
		const files = [
			createMockFile("photo1.jpg", 1024),
			createMockFile("photo2.jpg", 1024),
			createMockFile("photo3.jpg", 1024),
		];

		await act(async () => {
			await Promise.all(files.map((file) => result.current.uploadPhoto(file)));
		});

		expect(mockCompressImage).toHaveBeenCalledTimes(3);
		expect(mockStorePhoto).toHaveBeenCalledTimes(3);
		expect(result.current.photos).toHaveLength(3);
	});

	it("respects max concurrent uploads limit", async () => {
		const { result } = renderHook(() =>
			usePhotoUpload({ maxConcurrentUploads: 1 }),
		);

		let resolveFirst: (value: File) => void;
		let resolveSecond: (value: File) => void;

		mockCompressImage
			.mockImplementationOnce(
				() =>
					new Promise((resolve) => {
						resolveFirst = resolve;
					}),
			)
			.mockImplementationOnce(
				() =>
					new Promise((resolve) => {
						resolveSecond = resolve;
					}),
			);

		const file1 = createMockFile("photo1.jpg", 1024);
		const file2 = createMockFile("photo2.jpg", 1024);

		// Start both uploads
		act(() => {
			result.current.uploadPhoto(file1);
			result.current.uploadPhoto(file2);
		});

		// Should be uploading first file
		expect(result.current.isUploading).toBe(true);

		// Resolve first upload
		await act(async () => {
			resolveFirst!(createMockFile("compressed1.jpg", 512));
		});

		// Now second upload should start
		expect(mockCompressImage).toHaveBeenCalledTimes(2);

		// Resolve second upload
		await act(async () => {
			resolveSecond!(createMockFile("compressed2.jpg", 512));
		});

		await waitFor(() => {
			expect(result.current.photos).toHaveLength(2);
			expect(result.current.isUploading).toBe(false);
		});
	});

	it("generates thumbnail for uploaded photos", async () => {
		const { result } = renderHook(() =>
			usePhotoUpload({ generateThumbnails: true }),
		);
		const testFile = createMockFile("test.jpg", 2048);

		await act(async () => {
			await result.current.uploadPhoto(testFile);
		});

		// Should call compress twice - once for main image, once for thumbnail
		expect(mockCompressImage).toHaveBeenCalledTimes(2);
		expect(mockCompressImage).toHaveBeenCalledWith(testFile, {
			maxWidth: 200,
			maxHeight: 200,
			quality: 0.7,
		});

		expect(result.current.photos[0]).toMatchObject({
			hasThumbnail: true,
			thumbnailUrl: expect.stringMatching(/^blob:/),
		});
	});

	it("retries failed uploads", async () => {
		const { result } = renderHook(() => usePhotoUpload({ retryAttempts: 2 }));
		const testFile = createMockFile("test.jpg", 1024);

		// Mock first call to fail, second to succeed
		mockStorePhoto
			.mockRejectedValueOnce(new Error("Network error"))
			.mockResolvedValueOnce("stored-photo-id");

		await act(async () => {
			await result.current.uploadPhoto(testFile);
		});

		expect(mockStorePhoto).toHaveBeenCalledTimes(2);
		expect(result.current.photos).toHaveLength(1);
		expect(result.current.photos[0]?.isUploaded).toBe(true);
	});

	it("clears error when new upload starts", async () => {
		const { result } = renderHook(() => usePhotoUpload());

		// First, cause an error
		mockCompressImage.mockRejectedValueOnce(new Error("First error"));

		await act(async () => {
			try {
				await result.current.uploadPhoto(createMockFile("test1.jpg", 1024));
			} catch (error) {
				// Expected
			}
		});

		expect(result.current.error).toBe("First error");

		// Now start a successful upload
		mockCompressImage.mockResolvedValueOnce(
			createMockFile("compressed.jpg", 512),
		);

		await act(async () => {
			await result.current.uploadPhoto(createMockFile("test2.jpg", 1024));
		});

		expect(result.current.error).toBeNull();
	});

	it("tracks upload progress for multiple files", async () => {
		const { result } = renderHook(() => usePhotoUpload());

		let resolveFirst: (value: File) => void;
		let resolveSecond: (value: File) => void;

		mockCompressImage
			.mockImplementationOnce(
				() =>
					new Promise((resolve) => {
						resolveFirst = resolve;
					}),
			)
			.mockImplementationOnce(
				() =>
					new Promise((resolve) => {
						resolveSecond = resolve;
					}),
			);

		const file1 = createMockFile("photo1.jpg", 1024);
		const file2 = createMockFile("photo2.jpg", 1024);

		// Start both uploads
		act(() => {
			result.current.uploadPhoto(file1);
			result.current.uploadPhoto(file2);
		});

		expect(result.current.uploadProgress).toBe(0);

		// Complete first upload
		await act(async () => {
			resolveFirst!(createMockFile("compressed1.jpg", 512));
		});

		expect(result.current.uploadProgress).toBe(50);

		// Complete second upload
		await act(async () => {
			resolveSecond!(createMockFile("compressed2.jpg", 512));
		});

		await waitFor(() => {
			expect(result.current.uploadProgress).toBe(100);
		});
	});
});
