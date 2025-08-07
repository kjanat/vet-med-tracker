"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import {
	getTypedSearchParams,
	type InsightsSearchParams,
	updateSearchParams,
} from "@/lib/utils/search-params";

export interface InsightsFilters {
	/** Start date for insights data (ISO date string) */
	from: string;
	/** End date for insights data (ISO date string) */
	to: string;
	/** Animal ID to filter insights by */
	animalId?: string;
	/** View mode for insights */
	view: "summary" | "detailed" | "charts";
	/** Metric focus for insights */
	metric: "compliance" | "timing" | "inventory" | "all";
}

/**
 * Custom hook for managing insights page filters with type safety
 *
 * @returns Object containing current filters and setters
 */
export function useInsightsFilters() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	// Memoize search params string for stable dependency tracking
	const searchParamsString = useMemo(
		() => searchParams.toString(),
		[searchParams],
	);

	// Memoize parsed parameters to prevent re-parsing
	const typedParams = useMemo(() => {
		return getTypedSearchParams<InsightsSearchParams>(
			new URLSearchParams(searchParamsString),
			"insights",
			{
				view: "summary",
				metric: "all",
			},
		);
	}, [searchParamsString]);

	// Memoize default date calculation to prevent recreation on every render
	const defaultDates = useMemo(() => {
		const now = new Date();
		const thirtyDaysAgo = new Date(now);
		thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

		return {
			from: thirtyDaysAgo.toISOString().split("T")[0] || "",
			to: now.toISOString().split("T")[0] || "",
		};
	}, []); // Empty dependency array since dates should be stable per session

	// Memoize the filters object to prevent unnecessary re-renders
	const filters = useMemo((): InsightsFilters => {
		return {
			from: typedParams.from || defaultDates.from,
			to: typedParams.to || defaultDates.to,
			animalId: typedParams.animalId,
			view: typedParams.view || "summary",
			metric: typedParams.metric || "all",
		};
	}, [typedParams, defaultDates]);

	/**
	 * Updates a single filter parameter
	 */
	const setFilter = useCallback(
		(key: keyof InsightsFilters, value: string | undefined) => {
			const queryString = updateSearchParams(
				new URLSearchParams(searchParamsString),
				{ [key]: value },
			);

			router.push(`${pathname}?${queryString}` as Route, {
				scroll: false,
			});
		},
		[router, pathname, searchParamsString],
	);

	/**
	 * Updates multiple filter parameters at once
	 */
	const setFilters = useCallback(
		(newFilters: Partial<InsightsFilters>) => {
			const queryString = updateSearchParams(
				new URLSearchParams(searchParamsString),
				newFilters,
			);

			router.push(`${pathname}?${queryString}` as Route, {
				scroll: false,
			});
		},
		[router, pathname, searchParamsString],
	);

	/**
	 * Resets all filters to default values
	 * Memoize the defaults object to prevent recreation
	 */
	const resetDefaults = useMemo(
		() => ({
			animalId: undefined,
			view: "summary" as const,
			metric: "all" as const,
		}),
		[],
	); // Stable defaults that never change

	const resetFilters = useCallback(() => {
		const defaults = {
			...defaultDates,
			...resetDefaults,
		};

		const queryString = updateSearchParams(
			new URLSearchParams(searchParamsString),
			defaults,
		);

		router.push(`${pathname}?${queryString}` as Route, {
			scroll: false,
		});
	}, [router, pathname, searchParamsString, defaultDates, resetDefaults]);

	// Set default dates after mount if not provided in URL
	// Memoize the search params access to prevent unnecessary effect runs
	const hasFromParam = useMemo(() => searchParams.has("from"), [searchParams]);
	const hasToParam = useMemo(() => searchParams.has("to"), [searchParams]);

	useEffect(() => {
		if (!hasFromParam || !hasToParam) {
			const updates: Record<string, string> = {};

			if (!hasFromParam) {
				updates.from = defaultDates.from;
			}
			if (!hasToParam) {
				updates.to = defaultDates.to;
			}

			const queryString = updateSearchParams(
				new URLSearchParams(searchParamsString),
				updates,
			);
			router.replace(`${pathname}?${queryString}` as Route, {
				scroll: false,
			});
		}
	}, [
		router,
		pathname,
		searchParamsString,
		defaultDates,
		hasFromParam,
		hasToParam,
	]);

	return {
		filters,
		setFilter,
		setFilters,
		resetFilters,
	};
}
