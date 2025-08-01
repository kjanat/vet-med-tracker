"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export type SettingsTab =
	| "regimens"
	| "household"
	| "notifications"
	| "data"
	| "preferences";

export function useSettingsTabs() {
	const router = useRouter();
	const searchParams = useSearchParams();

	const activeTab = (searchParams.get("tab") as SettingsTab) || "regimens";

	const setActiveTab = useCallback(
		(tab: SettingsTab) => {
			const params = new URLSearchParams(searchParams.toString());
			params.set("tab", tab);
			router.push(`/settings?${params.toString()}`, { scroll: false });
		},
		[router, searchParams],
	);

	return { activeTab, setActiveTab };
}
