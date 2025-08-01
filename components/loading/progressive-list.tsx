"use client";

import { useEffect, useRef, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface ProgressiveListProps<T> {
	items: T[];
	renderItem: (item: T, index: number) => React.ReactNode;
	initialCount?: number;
	increment?: number;
	loadingComponent?: React.ReactNode;
	emptyComponent?: React.ReactNode;
	className?: string;
}

/**
 * Progressively loads and renders list items for better performance
 */
export function ProgressiveList<T>({
	items,
	renderItem,
	initialCount = 10,
	increment = 10,
	loadingComponent,
	emptyComponent,
	className = "",
}: ProgressiveListProps<T>) {
	const [displayCount, setDisplayCount] = useState(initialCount);
	const [isLoading, setIsLoading] = useState(false);
	const loaderRef = useRef<HTMLDivElement>(null);

	// Reset display count when items change
	useEffect(() => {
		setDisplayCount(initialCount);
	}, [items, initialCount]);

	// Intersection observer for infinite scroll
	useEffect(() => {
		if (!loaderRef.current) return;

		const observer = new IntersectionObserver(
			(entries) => {
				const target = entries[0];
				if (target?.isIntersecting && displayCount < items.length && !isLoading) {
					setIsLoading(true);
					// Simulate loading delay for smoother UX
					setTimeout(() => {
						setDisplayCount((prev) => Math.min(prev + increment, items.length));
						setIsLoading(false);
					}, 300);
				}
			},
			{ threshold: 0.1 },
		);

		observer.observe(loaderRef.current);

		return () => observer.disconnect();
	}, [displayCount, items.length, increment, isLoading]);

	if (items.length === 0 && emptyComponent) {
		return <>{emptyComponent}</>;
	}

	const visibleItems = items.slice(0, displayCount);

	return (
		<div className={className}>
			{visibleItems.map((item, index) => (
				<div key={index}>{renderItem(item, index)}</div>
			))}

			{/* Load more trigger */}
			{displayCount < items.length && (
				<div ref={loaderRef} className="py-4 flex justify-center">
					{isLoading ? (
						loadingComponent || (
							<div className="space-y-2 w-full">
								<Skeleton className="h-16 w-full" />
								<Skeleton className="h-16 w-full" />
							</div>
						)
					) : (
						<div className="text-sm text-muted-foreground">
							Showing {displayCount} of {items.length}
						</div>
					)}
				</div>
			)}
		</div>
	);
}

/**
 * Virtual scroll list for very large datasets
 */
export function VirtualList<T>({
	items,
	renderItem,
	itemHeight,
	containerHeight,
	className = "",
}: {
	items: T[];
	renderItem: (item: T, index: number) => React.ReactNode;
	itemHeight: number;
	containerHeight: number;
	className?: string;
}) {
	const [scrollTop, setScrollTop] = useState(0);
	const scrollElementRef = useRef<HTMLDivElement>(null);

	const startIndex = Math.floor(scrollTop / itemHeight);
	const endIndex = Math.min(
		startIndex + Math.ceil(containerHeight / itemHeight) + 1,
		items.length,
	);

	const visibleItems = items.slice(startIndex, endIndex);
	const totalHeight = items.length * itemHeight;
	const offsetY = startIndex * itemHeight;

	const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
		setScrollTop(e.currentTarget.scrollTop);
	};

	return (
		<div
			ref={scrollElementRef}
			className={`overflow-auto ${className}`}
			style={{ height: containerHeight }}
			onScroll={handleScroll}
		>
			<div style={{ height: totalHeight, position: "relative" }}>
				<div
					style={{
						transform: `translateY(${offsetY}px)`,
						position: "absolute",
						top: 0,
						left: 0,
						right: 0,
					}}
				>
					{visibleItems.map((item, index) => (
						<div
							key={startIndex + index}
							style={{ height: itemHeight }}
						>
							{renderItem(item, startIndex + index)}
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

/**
 * Staggered loading animation for lists
 */
export function StaggeredList<T>({
	items,
	renderItem,
	className = "",
	staggerDelay = 50,
}: {
	items: T[];
	renderItem: (item: T, index: number) => React.ReactNode;
	className?: string;
	staggerDelay?: number;
}) {
	const [visibleIndexes, setVisibleIndexes] = useState<Set<number>>(new Set());

	useEffect(() => {
		const timeouts: NodeJS.Timeout[] = [];
		items.forEach((_, index) => {
			const timeout = setTimeout(() => {
				setVisibleIndexes((prev) => new Set(prev).add(index));
			}, index * staggerDelay);
			timeouts.push(timeout);
		});

		return () => timeouts.forEach(clearTimeout);
	}, [items, staggerDelay]);

	return (
		<div className={className}>
			{items.map((item, index) => (
				<div
					key={index}
					className={`transition-all duration-300 ${
						visibleIndexes.has(index)
							? "opacity-100 translate-y-0"
							: "opacity-0 translate-y-2"
					}`}
				>
					{renderItem(item, index)}
				</div>
			))}
		</div>
	);
}