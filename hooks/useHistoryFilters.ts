"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";

export interface HistoryFilters {
	animalId?: string;
	regimenId?: string;
	caregiverId?: string;
	type: "all" | "scheduled" | "prn";
	view: "list" | "calendar";
	from: string; // ISO date
	to: string; // ISO date
}

export function useHistoryFilters() {
	const router = useRouter();
	const searchParams = useSearchParams();

	const filters = useMemo((): HistoryFilters => {
		// Use a stable date calculation to avoid hydration mismatch
		const fromParam = searchParams.get("from");
		const toParam = searchParams.get("to");

		// Default values will be calculated on client only
		const defaultFrom = fromParam || "";
		const defaultTo = toParam || "";

		return {
			animalId: searchParams.get("animalId") || undefined,
			regimenId: searchParams.get("regimenId") || undefined,
			caregiverId: searchParams.get("caregiverId") || undefined,
			type: (searchParams.get("type") as "all" | "scheduled" | "prn") || "all",
			view: (searchParams.get("view") as "list" | "calendar") || "list",
			from: defaultFrom,
			to: defaultTo,
		};
	}, [searchParams]);

	const setFilter = useCallback(
		(key: keyof HistoryFilters, value: string | undefined) => {
			const params = new URLSearchParams(searchParams.toString());

			if (value === undefined || value === "") {
				params.delete(key);
			} else {
				params.set(key, value);
			}

			// Use shallow routing to avoid full reload
			router.push(`/history?${params.toString()}`, { scroll: false });

			// Fire instrumentation event
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("history_filter_change", {
						detail: { key, value, filters: { ...filters, [key]: value } },
					}),
				);
			}
		},
		[router, searchParams, filters],
	);

	const setFilters = useCallback(
		(newFilters: Partial<HistoryFilters>) => {
			const params = new URLSearchParams(searchParams.toString());

			Object.entries(newFilters).forEach(([key, value]) => {
				if (value === undefined || value === "") {
					params.delete(key);
				} else {
					params.set(key, value.toString());
				}
			});

			router.push(`/history?${params.toString()}`, { scroll: false });
		},
		[router, searchParams],
	);

	// Set default dates after mount if not provided in URL
	useEffect(() => {
		if (!searchParams.get("from") || !searchParams.get("to")) {
			const now = new Date();
			const thirtyDaysAgo = new Date(now);
			thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

			const params = new URLSearchParams(searchParams.toString());
			if (!searchParams.get("from")) {
				params.set("from", thirtyDaysAgo.toISOString().split("T")[0] || "");
			}
			if (!searchParams.get("to")) {
				params.set("to", now.toISOString().split("T")[0] || "");
			}
			router.replace(`/history?${params.toString()}`, { scroll: false });
		}
	}, [router, searchParams]);

	return { filters, setFilter, setFilters };
}
