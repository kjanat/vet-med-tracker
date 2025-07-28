"use client";

import { useState, useEffect } from "react";

interface QueuedRecord {
	id: string;
	payload: any;
	timestamp: Date;
	retries: number;
}

export function useOfflineQueue() {
	const [isOnline, setIsOnline] = useState(true);
	const [queueSize, setQueueSize] = useState(0);
	const [isProcessing, setIsProcessing] = useState(false);

	useEffect(() => {
		const handleOnline = () => setIsOnline(true);
		const handleOffline = () => setIsOnline(false);

		window.addEventListener("online", handleOnline);
		window.addEventListener("offline", handleOffline);

		setIsOnline(navigator.onLine);

		return () => {
			window.removeEventListener("online", handleOnline);
			window.removeEventListener("offline", handleOffline);
		};
	}, []);

	const enqueue = async (payload: any, idempotencyKey: string) => {
		// In real app, this would use IndexedDB
		const record: QueuedRecord = {
			id: idempotencyKey,
			payload,
			timestamp: new Date(),
			retries: 0,
		};

		console.log("Enqueued for offline sync:", record);
		setQueueSize((prev) => prev + 1);

		return record.id;
	};

	const flush = async () => {
		if (!isOnline) return;

		setIsProcessing(true);
		// Simulate processing queue
		await new Promise((resolve) => setTimeout(resolve, 1000));
		setQueueSize(0);
		setIsProcessing(false);
	};

	useEffect(() => {
		if (isOnline && queueSize > 0) {
			flush();
		}
	}, [isOnline, queueSize]);

	return {
		isOnline,
		queueSize,
		isProcessing,
		enqueue,
		flush,
	};
}
