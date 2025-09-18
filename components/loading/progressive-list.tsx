"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ProgressiveListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  initialCount?: number;
  increment?: number;
  loadingComponent?: React.ReactNode;
  emptyComponent?: React.ReactNode;
  className?: string;
  keyExtractor?: (item: T, index: number) => React.Key;
  rootMargin?: string;
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
  keyExtractor,
  rootMargin = "300px 0px",
}: ProgressiveListProps<T>) {
  const [displayCount, setDisplayCount] = useState(initialCount);
  const [isLoading, setIsLoading] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<number | null>(null);

  // Reset display count when items or initialCount change
  useEffect(() => {
    setDisplayCount(initialCount);
  }, [initialCount]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (!loaderRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (
          entry?.isIntersecting &&
          displayCount < items.length &&
          !isLoading
        ) {
          setIsLoading(true);
          timeoutRef.current = window.setTimeout(() => {
            setDisplayCount((prev) => Math.min(prev + increment, items.length));
            setIsLoading(false);
          }, 300);
        }
      },
      { rootMargin, threshold: 0.1 },
    );

    const el = loaderRef.current;
    observer.observe(el);

    return () => {
      observer.unobserve(el);
      observer.disconnect();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [displayCount, items.length, increment, isLoading, rootMargin]);

  if (items.length === 0) return <>{emptyComponent ?? null}</>;

  const visibleItems = items.slice(0, displayCount);

  const handleLoadMore = () => {
    if (!isLoading && displayCount < items.length) {
      setIsLoading(true);
      timeoutRef.current = window.setTimeout(() => {
        setDisplayCount((prev) => Math.min(prev + increment, items.length));
        setIsLoading(false);
      }, 300);
    }
  };

  return (
    <div className={className}>
      {visibleItems.map((item, index) => (
        <React.Fragment key={keyExtractor?.(item, index) ?? `item-${index}`}>
          {renderItem(item, index)}
        </React.Fragment>
      ))}

      {/* Load more trigger */}
      {displayCount < items.length && (
        <div className="flex justify-center py-4" ref={loaderRef}>
          {isLoading ? (
            (loadingComponent ?? (
              <div className="w-full space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ))
          ) : (
            <div className="space-y-2 text-center">
              <div className="text-muted-foreground text-sm">
                Showing {displayCount} of {items.length}
              </div>
              {/* Hidden button for keyboard/screen reader users */}
              <Button
                className="sr-only focus:not-sr-only"
                onClick={handleLoadMore}
                size="sm"
                variant="ghost"
              >
                Load more items
              </Button>
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
  renderItemAction,
  itemHeight,
  containerHeight,
  className = "",
  keyExtractorAction,
}: {
  items: T[];
  renderItemAction: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  containerHeight: number;
  className?: string;
  keyExtractorAction?: (item: T, index: number) => React.Key;
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
      className={`overflow-auto ${className}`}
      onScroll={handleScroll}
      ref={scrollElementRef}
      style={{ height: containerHeight }}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        <div
          style={{
            left: 0,
            position: "absolute",
            right: 0,
            top: 0,
            transform: `translateY(${offsetY}px)`,
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = startIndex + index;
            return (
              <div
                key={keyExtractorAction?.(item, actualIndex) ?? actualIndex}
                style={{ height: itemHeight }}
              >
                {renderItemAction(item, actualIndex)}
              </div>
            );
          })}
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
  renderItemAction,
  className = "",
  staggerDelay = 50,
  keyExtractorAction,
}: {
  items: T[];
  renderItemAction: (item: T, index: number) => React.ReactNode;
  className?: string;
  staggerDelay?: number;
  keyExtractorAction?: (item: T, index: number) => React.Key;
}) {
  const [visibleIndexes, setVisibleIndexes] = useState<Set<number>>(new Set());

  useEffect(() => {
    const timeouts: number[] = [];
    // Reset visible indexes when items change
    setVisibleIndexes(new Set());

    items.forEach((_, index) => {
      const timeout = window.setTimeout(() => {
        setVisibleIndexes((prev) => new Set(prev).add(index));
      }, index * staggerDelay);
      timeouts.push(timeout);
    });

    return () => {
      timeouts.forEach((id) => {
        clearTimeout(id);
      });
    };
  }, [items, staggerDelay]);

  return (
    <div className={className}>
      {items.map((item, index) => (
        <div
          className={`transition-all duration-300 ${
            visibleIndexes.has(index)
              ? "translate-y-0 opacity-100"
              : "translate-y-2 opacity-0"
          }`}
          key={keyExtractorAction?.(item, index) ?? index}
        >
          {renderItemAction(item, index)}
        </div>
      ))}
    </div>
  );
}
