"use client";

import { useUser } from "@stackframe/stack";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useApp } from "@/components/providers/app-provider-consolidated";
import {
	addToQueue,
	clearQueue,
	getQueuedMutations,
	getQueueSize,
	type QueuedMutation,
	removeFromQueue,
	updateQueuedMutation,
} from "@/lib/offline/db";
import { trpc } from "@/server/trpc/client";

interface OfflineQueueOptions {
	maxRetries?: number;
	retryDelay?: number;
	onSyncStart?: () => void;
	onSyncComplete?: (successful: number, failed: number) => void;
	onSyncError?: (error: Error) => void;
}

export function useOfflineQueue(options: OfflineQueueOptions = {}) {
	const { maxRetries = 3, retryDelay = 1000 } = options;
	const [isOnline, setIsOnline] = useState(true);
	const [queueSize, setQueueSize] = useState(0);
	const [isProcessing, setIsProcessing] = useState(false);
	const [syncProgress, setSyncProgress] = useState({ current: 0, total: 0 });
	const processingRef = useRef(false);
	const processQueueRef = useRef<(() => Promise<void>) | null>(null);
	const stackUser = useUser();
	const { selectedHousehold } = useApp();
	const utils = trpc.useUtils();

	// Get tRPC mutations
	const adminCreateMutation = trpc.admin.create.useMutation();
	const inventoryUpdateMutation = trpc.inventory.updateQuantity.useMutation();
	const inventoryMarkAsInUseMutation = trpc.inventory.markAsInUse.useMutation();

	// Monitor online/offline status
	useEffect(() => {
		const handleOnline = () => {
			setIsOnline(true);
			toast.success("Back online! Syncing data...");
		};

		const handleOffline = () => {
			setIsOnline(false);
			toast.warning("You're offline. Changes will sync when reconnected.");
		};

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		setIsOnline(navigator.onLine);

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, []);

	// Update queue size
	const updateQueueSize = useCallback(async () => {
		try {
			const size = await getQueueSize(selectedHousehold?.id);
			setQueueSize(size);
		} catch (error) {
			console.warn("Failed to update queue size:", error);
			// Set to 0 as fallback - this prevents the UI from showing incorrect counts
			setQueueSize(0);
		}
	}, [selectedHousehold?.id]);

	useEffect(() => {
		updateQueueSize();
	}, [updateQueueSize]);

	// Enqueue a mutation for offline sync
	const enqueue = useCallback(
		async <T extends QueuedMutation["type"]>(
			type: T,
			payload: unknown,
			idempotencyKey: string,
		) => {
			if (!stackUser?.id || !selectedHousehold?.id) {
				throw new Error("No user or household context");
			}

			const mutation: QueuedMutation = {
				id: idempotencyKey,
				type,
				payload,
				timestamp: Date.now(),
				retries: 0,
				maxRetries,
				householdId: selectedHousehold.id,
				userId: stackUser.id,
			};

			try {
				await addToQueue(mutation);
				await updateQueueSize();

				// If online, process immediately
				if (isOnline && !processingRef.current && processQueueRef.current) {
					void processQueueRef.current();
				}

				return mutation.id;
			} catch (error) {
				console.error("Failed to enqueue mutation:", error);
				toast.error(
					"Offline storage unavailable. Changes may not be saved if you go offline.",
				);

				// If we can't store offline, still return the mutation ID
				// The calling code might want to proceed with online-only operation
				throw error;
			}
		},
		[
			isOnline,
			maxRetries,
			selectedHousehold?.id,
			stackUser?.id,
			updateQueueSize,
		],
	);

	// Process a single mutation
	const processMutation = useCallback(
		async (mutation: QueuedMutation): Promise<boolean> => {
			try {
				switch (mutation.type) {
					case "admin.create":
						await adminCreateMutation.mutateAsync(
							mutation.payload as Parameters<
								typeof adminCreateMutation.mutateAsync
							>[0],
						);
						break;

					case "inventory.update":
						await inventoryUpdateMutation.mutateAsync(
							mutation.payload as Parameters<
								typeof inventoryUpdateMutation.mutateAsync
							>[0],
						);
						break;

					case "inventory.markAsInUse":
						await inventoryMarkAsInUseMutation.mutateAsync(
							mutation.payload as Parameters<
								typeof inventoryMarkAsInUseMutation.mutateAsync
							>[0],
						);
						break;

					default:
						throw new Error(`Unknown mutation type: ${mutation.type}`);
				}

				// Success - remove from queue
				await removeFromQueue(mutation.id);

				// Invalidate relevant queries
				switch (mutation.type) {
					case "admin.create":
						await utils.admin.list.invalidate();
						await utils.regimen.listDue.invalidate();
						break;
					case "inventory.update":
					case "inventory.markAsInUse":
						await utils.inventory.getSources.invalidate();
						await utils.inventory.getHouseholdInventory.invalidate();
						break;
				}

				return true;
			} catch (error) {
				console.error(`Failed to process mutation ${mutation.id}:`, error);

				// Update retry count
				const updatedMutation: QueuedMutation = {
					...mutation,
					retries: mutation.retries + 1,
					lastError: error instanceof Error ? error.message : "Unknown error",
				};

				if (updatedMutation.retries < updatedMutation.maxRetries) {
					// Update in queue for retry
					await updateQueuedMutation(updatedMutation);
					return false;
				} else {
					// Max retries reached - remove from queue
					await removeFromQueue(mutation.id);
					toast.error(
						`Failed to sync ${mutation.type} after ${updatedMutation.maxRetries} attempts`,
					);
					return false;
				}
			}
		},
		[
			adminCreateMutation,
			inventoryUpdateMutation,
			inventoryMarkAsInUseMutation,
			utils,
		],
	);

	// Helper function to process multiple mutations
	const processMutations = useCallback(
		async (mutations: QueuedMutation[]) => {
			const total = mutations.length;
			let successful = 0;
			let failed = 0;

			setSyncProgress({ current: 0, total });

			for (let i = 0; i < mutations.length; i++) {
				const mutation = mutations[i];
				if (!mutation) continue;

				setSyncProgress({ current: i + 1, total });

				// Add delay between retries
				if (mutation.retries > 0) {
					await new Promise((resolve) =>
						setTimeout(resolve, retryDelay * mutation.retries),
					);
				}

				const success = await processMutation(mutation);
				if (success) {
					successful++;
				} else {
					failed++;
				}
			}

			return { successful, failed };
		},
		[processMutation, retryDelay],
	);

	// Helper function to show sync results
	const showSyncResults = useCallback(
		(results: { successful: number; failed: number }) => {
			if (results.successful > 0) {
				toast.success(
					`Synced ${results.successful} change${results.successful > 1 ? "s" : ""} successfully`,
				);
			}

			if (results.failed > 0) {
				toast.error(
					`Failed to sync ${results.failed} change${results.failed > 1 ? "s" : ""}`,
				);
			}
		},
		[],
	);

	// Process the entire queue
	const processQueue = useCallback(async () => {
		if (!isOnline || processingRef.current) return;

		processingRef.current = true;
		setIsProcessing(true);
		options.onSyncStart?.();

		try {
			const mutations = await getQueuedMutations(selectedHousehold?.id);
			const results = await processMutations(mutations);

			options.onSyncComplete?.(results.successful, results.failed);
			showSyncResults(results);
		} catch (error) {
			console.error("Queue processing error:", error);
			options.onSyncError?.(error as Error);

			// Check if it's an IndexedDB error
			if (error instanceof Error && error.message.includes("IndexedDB")) {
				toast.error(
					"Offline storage unavailable. Please refresh the page or check browser settings.",
				);
			} else {
				toast.error("Failed to sync offline changes");
			}
		} finally {
			processingRef.current = false;
			setIsProcessing(false);
			setSyncProgress({ current: 0, total: 0 });
			await updateQueueSize();
		}
	}, [
		isOnline,
		selectedHousehold?.id,
		updateQueueSize,
		options,
		processMutations,
		showSyncResults,
	]);

	// Update the ref when processQueue changes
	processQueueRef.current = processQueue;

	// Process queue when coming back online
	useEffect(() => {
		if (isOnline && queueSize > 0 && !processingRef.current) {
			void processQueue();
		}
	}, [isOnline, queueSize, processQueue]);

	// Manual sync trigger
	const sync = useCallback(async () => {
		if (!isOnline) {
			toast.error("Cannot sync while offline");
			return;
		}
		await processQueue();
	}, [isOnline, processQueue]);

	// Clear queue (with confirmation)
	const clearQueueWithConfirmation = useCallback(
		async (confirm = true) => {
			if (confirm && queueSize > 0) {
				const confirmed = window.confirm(
					`Are you sure you want to clear ${queueSize} pending change${
						queueSize > 1 ? "s" : ""
					}? This cannot be undone.`,
				);
				if (!confirmed) return;
			}

			try {
				await clearQueue(selectedHousehold?.id);
				await updateQueueSize();
				toast.success("Offline queue cleared");
			} catch (error) {
				console.error("Failed to clear queue:", error);
				toast.error(
					"Failed to clear offline queue. Please try refreshing the page.",
				);
			}
		},
		[queueSize, selectedHousehold?.id, updateQueueSize],
	);

	// Get queue details for debugging
	const getQueueDetails = useCallback(async () => {
		try {
			return getQueuedMutations(selectedHousehold?.id);
		} catch (error) {
			console.error("Failed to get queue details:", error);
			return [];
		}
	}, [selectedHousehold?.id]);

	return {
		// State
		isOnline,
		queueSize,
		isProcessing,
		syncProgress,

		// Actions
		enqueue,
		sync,
		clearQueue: clearQueueWithConfirmation,
		getQueueDetails,

		// Utilities
		canSync: isOnline && queueSize > 0 && !isProcessing,
	};
}
