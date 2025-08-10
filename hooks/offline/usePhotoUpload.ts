"use client";

import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import {
	getPhotoSyncStats,
	initPhotoStorage,
	isPhotoStorageSupported,
	type PhotoSyncStats,
	storePhotoOffline,
	syncPendingPhotos,
} from "@/lib/offline/photo-storage";

export interface UsePhotoUploadOptions {
	householdId: string;
	userId: string;
	animalId?: string;
	onUploadSuccess?: (url: string, photoId: string) => void;
	onUploadError?: (error: string, photoId?: string) => void;
}

export interface PhotoUploadState {
	isOnline: boolean;
	isUploading: boolean;
	uploadProgress: number;
	error: string | null;
	stats: PhotoSyncStats;
	storageSupported: boolean;
}

export function usePhotoUpload({
	householdId,
	userId,
	animalId,
	onUploadSuccess,
	onUploadError,
}: UsePhotoUploadOptions) {
	const { toast } = useToast();

	const [state, setState] = useState<PhotoUploadState>({
		isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
		isUploading: false,
		uploadProgress: 0,
		error: null,
		stats: { pending: 0, uploading: 0, uploaded: 0, failed: 0, total: 0 },
		storageSupported: false,
	});

	/**
	 * Initialize storage and check support
	 */
	useEffect(() => {
		const initialize = async () => {
			const supported = isPhotoStorageSupported();
			setState((prev) => ({ ...prev, storageSupported: supported }));

			if (supported) {
				try {
					await initPhotoStorage();
					await updateStats();
				} catch (error) {
					console.error("Failed to initialize photo storage:", error);
				}
			}
		};

		initialize();
	}, []);

	/**
	 * Handle online/offline status changes
	 */
	useEffect(() => {
		const handleOnline = () => {
			setState((prev) => ({ ...prev, isOnline: true }));
			// Trigger sync when back online
			syncPhotos();
		};

		const handleOffline = () => {
			setState((prev) => ({ ...prev, isOnline: false }));
		};

		if (typeof window !== "undefined") {
			window.addEventListener("online", handleOnline);
			window.addEventListener("offline", handleOffline);

			return () => {
				window.removeEventListener("online", handleOnline);
				window.removeEventListener("offline", handleOffline);
			};
		}
	}, []);

	/**
	 * Update sync statistics
	 */
	const updateStats = useCallback(async () => {
		if (!state.storageSupported) return;

		try {
			const stats = await getPhotoSyncStats();
			setState((prev) => ({ ...prev, stats }));
		} catch (error) {
			console.error("Failed to get photo sync stats:", error);
		}
	}, [state.storageSupported]);

	/**
	 * Upload photo directly or store offline
	 */
	const uploadPhoto = useCallback(
		async (file: File): Promise<string> => {
			setState((prev) => ({
				...prev,
				isUploading: true,
				uploadProgress: 0,
				error: null,
			}));

			try {
				if (state.isOnline) {
					// Try direct upload
					const formData = new FormData();
					formData.append("file", file);

					const response = await fetch("/api/upload", {
						method: "POST",
						body: formData,
					});

					if (!response.ok) {
						const errorData = await response.json();
						throw new Error(errorData.error || "Upload failed");
					}

					const result = await response.json();
					const url = result.url;

					setState((prev) => ({
						...prev,
						isUploading: false,
						uploadProgress: 100,
					}));

					onUploadSuccess?.(url, "");

					toast({
						title: "Photo uploaded successfully",
						description: "Your photo has been uploaded and is ready to use.",
					});

					return url;
				} else {
					// Store offline for later sync
					if (!state.storageSupported) {
						throw new Error("Offline storage not supported");
					}

					const photoId = await storePhotoOffline(
						file,
						userId,
						householdId,
						animalId,
					);

					setState((prev) => ({
						...prev,
						isUploading: false,
						uploadProgress: 100,
					}));

					// Update stats after storing
					await updateStats();

					toast({
						title: "Photo saved for upload",
						description: "Your photo will be uploaded when you're back online.",
					});

					return photoId; // Return photo ID as temporary URL
				}
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : "Upload failed";

				setState((prev) => ({
					...prev,
					isUploading: false,
					uploadProgress: 0,
					error: errorMessage,
				}));

				onUploadError?.(errorMessage);

				toast({
					title: "Upload failed",
					description: errorMessage,
					variant: "destructive",
				});

				throw error;
			}
		},
		[
			state.isOnline,
			state.storageSupported,
			userId,
			householdId,
			animalId,
			onUploadSuccess,
			onUploadError,
			toast,
			updateStats,
		],
	);

	/**
	 * Sync pending photos
	 */
	const syncPhotos = useCallback(async () => {
		if (!state.isOnline || !state.storageSupported) return;

		try {
			const result = await syncPendingPhotos();

			if (result.success > 0) {
				toast({
					title: "Photos synced",
					description: `Successfully uploaded ${result.success} photo(s).`,
				});
			}

			if (result.failed > 0) {
				toast({
					title: "Some uploads failed",
					description: `${result.failed} photo(s) failed to upload and will be retried later.`,
					variant: "destructive",
				});
			}

			// Update stats after sync
			await updateStats();
		} catch (error) {
			console.error("Photo sync failed:", error);
			toast({
				title: "Sync failed",
				description: "Failed to sync photos. Will retry automatically.",
				variant: "destructive",
			});
		}
	}, [state.isOnline, state.storageSupported, toast, updateStats]);

	/**
	 * Track upload progress (for XMLHttpRequest usage)
	 */
	const setUploadProgress = useCallback((progress: number) => {
		setState((prev) => ({ ...prev, uploadProgress: progress }));
	}, []);

	/**
	 * Clear upload error
	 */
	const clearError = useCallback(() => {
		setState((prev) => ({ ...prev, error: null }));
	}, []);

	return {
		...state,
		uploadPhoto,
		syncPhotos,
		setUploadProgress,
		clearError,
		updateStats,
	};
}
