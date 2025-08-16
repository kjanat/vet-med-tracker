/**
 * IndexedDB storage for offline photo functionality
 * Stores photos locally when offline and syncs when online
 * Uses the existing IndexedDB setup from the project
 */

import { checkIndexedDBSupport } from "./db";

export interface OfflinePhoto {
  id: string;
  file: File;
  fileName: string;
  animalId?: string;
  householdId: string;
  userId: string;
  timestamp: Date;
  status: "pending" | "uploading" | "uploaded" | "failed";
  retryCount: number;
  error?: string;
  url?: string; // Set when successfully uploaded
}

export interface PhotoSyncStats {
  pending: number;
  uploading: number;
  uploaded: number;
  failed: number;
  total: number;
}

const PHOTO_STORE_NAME = "photos";
const DB_VERSION_WITH_PHOTOS = 2; // Increment version to add photos store

let photoDB: IDBDatabase | null = null;

/**
 * Open IndexedDB with photos store
 */
async function openPhotoStorage(): Promise<IDBDatabase> {
  if (photoDB && !photoDB.version) return photoDB;

  const isSupported = await checkIndexedDBSupport();
  if (!isSupported) {
    throw new Error("IndexedDB not supported");
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open("vetmed-photos", DB_VERSION_WITH_PHOTOS);

    request.onerror = () => {
      const error = request.error || new Error("Failed to open photo storage");
      console.error("Photo storage open failed:", error);
      reject(error);
    };

    request.onsuccess = () => {
      photoDB = request.result;
      resolve(photoDB);
    };

    request.onupgradeneeded = (event) => {
      try {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create photos store if it doesn't exist
        if (!db.objectStoreNames.contains(PHOTO_STORE_NAME)) {
          const photoStore = db.createObjectStore(PHOTO_STORE_NAME, {
            keyPath: "id",
          });

          // Create indexes
          photoStore.createIndex("by-status", "status");
          photoStore.createIndex("by-animal", "animalId");
          photoStore.createIndex("by-household", "householdId");
          photoStore.createIndex("by-timestamp", "timestamp");
        }
      } catch (error) {
        console.error("Photo storage upgrade failed:", error);
        reject(error);
      }
    };
  });
}

/**
 * Generate unique photo ID
 */
function generatePhotoId(): string {
  return `photo_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Store photo for offline upload
 */
export async function storePhotoOffline(
  file: File,
  userId: string,
  householdId: string,
  animalId?: string,
): Promise<string> {
  const db = await openPhotoStorage();

  const photoId = generatePhotoId();
  const photo: OfflinePhoto = {
    id: photoId,
    file,
    fileName: file.name,
    animalId,
    householdId,
    userId,
    timestamp: new Date(),
    status: "pending",
    retryCount: 0,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction([PHOTO_STORE_NAME], "readwrite");
    const store = tx.objectStore(PHOTO_STORE_NAME);

    const request = store.add(photo);
    request.onsuccess = () => {
      console.log(`Photo stored offline: ${photoId}`);
      resolve(photoId);
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all photos with optional filtering
 */
export async function getStoredPhotos(filter?: {
  status?: OfflinePhoto["status"];
  animalId?: string;
  householdId?: string;
  limit?: number;
}): Promise<OfflinePhoto[]> {
  const db = await openPhotoStorage();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([PHOTO_STORE_NAME], "readonly");
    const store = tx.objectStore(PHOTO_STORE_NAME);

    let request: IDBRequest;

    // Use appropriate index based on filter
    if (filter?.status) {
      request = store.index("by-status").getAll(filter.status);
    } else if (filter?.animalId) {
      request = store.index("by-animal").getAll(filter.animalId);
    } else if (filter?.householdId) {
      request = store.index("by-household").getAll(filter.householdId);
    } else {
      request = store.getAll();
    }

    request.onsuccess = () => {
      let photos = request.result as OfflinePhoto[];

      // Sort by timestamp (newest first)
      photos.sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

      // Apply limit if specified
      if (filter?.limit) {
        photos = photos.slice(0, filter.limit);
      }

      resolve(photos);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Get photo by ID
 */
export async function getPhotoById(
  id: string,
): Promise<OfflinePhoto | undefined> {
  const db = await openPhotoStorage();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([PHOTO_STORE_NAME], "readonly");
    const store = tx.objectStore(PHOTO_STORE_NAME);

    const request = store.get(id);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update photo status
 */
export async function updatePhotoStatus(
  id: string,
  updates: Partial<
    Pick<OfflinePhoto, "status" | "error" | "url" | "retryCount">
  >,
): Promise<void> {
  const db = await openPhotoStorage();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([PHOTO_STORE_NAME], "readwrite");
    const store = tx.objectStore(PHOTO_STORE_NAME);

    // First get the existing photo
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const photo = getRequest.result as OfflinePhoto;
      if (!photo) {
        reject(new Error(`Photo not found: ${id}`));
        return;
      }

      // Update the photo
      const updatedPhoto = { ...photo, ...updates };
      const putRequest = store.put(updatedPhoto);
      putRequest.onsuccess = () => {
        console.log(`Photo status updated: ${id} -> ${updates.status}`);
        resolve();
      };
      putRequest.onerror = () => reject(putRequest.error);
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Delete photo from storage
 */
export async function deleteStoredPhoto(id: string): Promise<void> {
  const db = await openPhotoStorage();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([PHOTO_STORE_NAME], "readwrite");
    const store = tx.objectStore(PHOTO_STORE_NAME);

    const request = store.delete(id);
    request.onsuccess = () => {
      console.log(`Photo deleted: ${id}`);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get sync statistics
 */
export async function getPhotoSyncStats(): Promise<PhotoSyncStats> {
  const db = await openPhotoStorage();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([PHOTO_STORE_NAME], "readonly");
    const store = tx.objectStore(PHOTO_STORE_NAME);
    const statusIndex = store.index("by-status");

    const stats = {
      pending: 0,
      uploading: 0,
      uploaded: 0,
      failed: 0,
      total: 0,
    };

    // Count by status using cursor
    let completed = 0;
    const statuses: Array<keyof Omit<PhotoSyncStats, "total">> = [
      "pending",
      "uploading",
      "uploaded",
      "failed",
    ];

    // Count total
    const totalRequest = store.count();
    totalRequest.onsuccess = () => {
      stats.total = totalRequest.result;
      completed++;
      if (completed === statuses.length + 1) {
        resolve(stats);
      }
    };
    totalRequest.onerror = () => reject(totalRequest.error);

    // Count by each status
    statuses.forEach((status) => {
      const statusRequest = statusIndex.count(status);
      statusRequest.onsuccess = () => {
        stats[status] = statusRequest.result;
        completed++;
        if (completed === statuses.length + 1) {
          resolve(stats);
        }
      };
      statusRequest.onerror = () => reject(statusRequest.error);
    });
  });
}

/**
 * Clean up old photos (uploaded photos older than 30 days)
 */
export async function cleanupOldPhotos(
  maxAgeDays: number = 30,
): Promise<number> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxAgeDays);

  // Get uploaded photos
  const uploadedPhotos = await getStoredPhotos({ status: "uploaded" });
  const oldPhotos = uploadedPhotos.filter(
    (photo) => new Date(photo.timestamp) < cutoffDate,
  );

  let deletedCount = 0;
  for (const photo of oldPhotos) {
    await deleteStoredPhoto(photo.id);
    deletedCount++;
  }

  console.log(`Cleaned up ${deletedCount} old photos`);
  return deletedCount;
}

/**
 * Upload photo to server
 */
export async function uploadPhotoToServer(
  photo: OfflinePhoto,
): Promise<string> {
  // Update status to uploading
  await updatePhotoStatus(photo.id, { status: "uploading" });

  try {
    const formData = new FormData();
    formData.append("file", photo.file);

    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Upload failed: ${response.status}`);
    }

    const result = await response.json();
    const url = result.url;

    // Update status to uploaded
    await updatePhotoStatus(photo.id, {
      status: "uploaded",
      url,
      error: undefined,
    });

    return url;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Upload failed";

    // Update status to failed and increment retry count
    await updatePhotoStatus(photo.id, {
      status: "failed",
      error: errorMessage,
      retryCount: photo.retryCount + 1,
    });

    throw error;
  }
}

/**
 * Sync all pending photos
 */
export async function syncPendingPhotos(): Promise<{
  success: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}> {
  const pendingPhotos = await getStoredPhotos({ status: "pending" });

  let successCount = 0;
  let failedCount = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (const photo of pendingPhotos) {
    try {
      await uploadPhotoToServer(photo);
      successCount++;
    } catch (error) {
      failedCount++;
      errors.push({
        id: photo.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  console.log(
    `Photo sync completed: ${successCount} success, ${failedCount} failed`,
  );

  return { success: successCount, failed: failedCount, errors };
}

/**
 * Retry failed uploads
 */
export async function retryFailedPhotos(maxRetries: number = 3): Promise<{
  success: number;
  failed: number;
  errors: Array<{ id: string; error: string }>;
}> {
  const failedPhotos = await getStoredPhotos({ status: "failed" });
  const retriablePhotos = failedPhotos.filter(
    (photo) => photo.retryCount < maxRetries,
  );

  let successCount = 0;
  let failedCount = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (const photo of retriablePhotos) {
    try {
      // Reset to pending for retry
      await updatePhotoStatus(photo.id, { status: "pending" });
      await uploadPhotoToServer(photo);
      successCount++;
    } catch (error) {
      failedCount++;
      errors.push({
        id: photo.id,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  console.log(
    `Photo retry completed: ${successCount} success, ${failedCount} failed`,
  );

  return { success: successCount, failed: failedCount, errors };
}

/**
 * Check if photo storage is supported
 */
export function isPhotoStorageSupported(): boolean {
  return (
    typeof window !== "undefined" && "indexedDB" in window && !!window.indexedDB
  );
}

/**
 * Initialize photo storage for use
 */
export async function initPhotoStorage(): Promise<void> {
  await openPhotoStorage();
}
