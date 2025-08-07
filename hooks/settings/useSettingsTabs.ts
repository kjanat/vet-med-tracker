"use client";

import type { Route } from "next";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import {
	getTypedSearchParams,
	isValidSettingsTab,
	type SettingsSearchParams,
	updateSearchParams,
} from "@/lib/utils/search-params";

export type SettingsTab =
	| "data"
	| "preferences"
	| "notifications"
	| "household";

export function useSettingsTabs() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();

	// Memoize the search params string for stable dependency tracking
	const searchParamsString = useMemo(
		() => searchParams.toString(),
		[searchParams],
	);

	// Memoize the parsed parameters to prevent re-parsing
	const typedParams = useMemo(() => {
		return getTypedSearchParams<SettingsSearchParams>(
			new URLSearchParams(searchParamsString),
			"settings",
			{ tab: "data" },
		);
	}, [searchParamsString]);

	// Memoize the active tab to prevent unnecessary re-renders
	const activeTab = useMemo(() => typedParams.tab || "data", [typedParams.tab]);

	// Optimize setActiveTab with more granular dependency
	const setActiveTab = useCallback(
		(tab: SettingsTab) => {
			// Validate the tab value before setting
			if (!isValidSettingsTab(tab)) {
				console.warn(`Invalid settings tab: ${tab}, falling back to 'data'`);
				tab = "data";
			}

			const queryString = updateSearchParams(
				new URLSearchParams(searchParamsString),
				{ tab },
			);
			router.push(`${pathname}?${queryString}` as Route, { scroll: false });
		},
		[router, pathname, searchParamsString],
	);

	return { activeTab, setActiveTab };
}
