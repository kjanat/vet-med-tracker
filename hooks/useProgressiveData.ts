import { useCallback, useEffect, useRef, useState } from "react";

interface UseProgressiveDataOptions {
	initialLoadSize?: number;
	incrementSize?: number;
	loadDelay?: number;
}

interface UseProgressiveDataReturn<T> {
	visibleData: T[];
	isLoadingMore: boolean;
	hasMore: boolean;
	loadMore: () => void;
	reset: () => void;
	progress: number;
}

/**
 * Hook for progressively loading data to improve initial render performance
 */
export function useProgressiveData<T>(
	data: T[],
	options: UseProgressiveDataOptions = {},
): UseProgressiveDataReturn<T> {
	const { initialLoadSize = 20, incrementSize = 20, loadDelay = 200 } = options;

	const [loadedCount, setLoadedCount] = useState(initialLoadSize);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const loadingRef = useRef(false);

	// Reset when data changes significantly
	useEffect(() => {
		setLoadedCount(initialLoadSize);
		setIsLoadingMore(false);
		loadingRef.current = false;
	}, [initialLoadSize]);

	const visibleData = data.slice(0, loadedCount);
	const hasMore = loadedCount < data.length;
	const progress = data.length > 0 ? (loadedCount / data.length) * 100 : 100;

	const loadMore = useCallback(() => {
		if (loadingRef.current || !hasMore) return;

		loadingRef.current = true;
		setIsLoadingMore(true);

		// Simulate async loading for smoother UX
		setTimeout(() => {
			setLoadedCount((prev) => Math.min(prev + incrementSize, data.length));
			setIsLoadingMore(false);
			loadingRef.current = false;
		}, loadDelay);
	}, [hasMore, incrementSize, data.length, loadDelay]);

	const reset = useCallback(() => {
		setLoadedCount(initialLoadSize);
		setIsLoadingMore(false);
		loadingRef.current = false;
	}, [initialLoadSize]);

	return {
		visibleData,
		isLoadingMore,
		hasMore,
		loadMore,
		reset,
		progress,
	};
}

/**
 * Hook for loading data in batches with priority
 */
export function useBatchedData<T>(data: T[], priorityFn?: (item: T) => number) {
	const [processedData, setProcessedData] = useState<T[]>([]);
	const [isProcessing, setIsProcessing] = useState(false);

	useEffect(() => {
		if (data.length === 0) {
			setProcessedData([]);
			return;
		}

		setIsProcessing(true);

		// Sort by priority if provided
		const sortedData = priorityFn
			? [...data].sort((a, b) => priorityFn(b) - priorityFn(a))
			: data;

		// Process in batches
		const batchSize = 10;
		let currentIndex = 0;

		const processBatch = () => {
			const batch = sortedData.slice(currentIndex, currentIndex + batchSize);
			setProcessedData((prev) => [...prev, ...batch]);
			currentIndex += batchSize;

			if (currentIndex < sortedData.length) {
				requestAnimationFrame(processBatch);
			} else {
				setIsProcessing(false);
			}
		};

		// Start processing
		setProcessedData([]);
		requestAnimationFrame(processBatch);
	}, [data, priorityFn]);

	return { processedData, isProcessing };
}

/**
 * Hook for intersection observer based loading
 */
export function useInfiniteScroll(
	callback: () => void,
	options?: IntersectionObserverInit,
) {
	const observerRef = useRef<IntersectionObserver | null>(null);
	const targetRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
		if (observerRef.current) observerRef.current.disconnect();

		observerRef.current = new IntersectionObserver((entries) => {
			if (entries[0]?.isIntersecting) {
				callback();
			}
		}, options);

		if (targetRef.current) {
			observerRef.current.observe(targetRef.current);
		}

		return () => {
			if (observerRef.current) {
				observerRef.current.disconnect();
			}
		};
	}, [callback, options]);

	return targetRef;
}
