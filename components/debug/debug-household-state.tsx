"use client";

import { useUser } from "@stackframe/stack";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/providers/app-provider-consolidated";
import { trpc } from "@/server/trpc/client";

export function DebugHouseholdState() {
	const { selectedHousehold, households } = useApp();
	const stackUser = useUser();
	const {
		data: householdData,
		isLoading,
		error,
	} = trpc.household.list.useQuery(undefined, {
		enabled: !!stackUser,
	});

	const isAuthenticated = !!stackUser;
	const user = useMemo(
		() =>
			stackUser
				? {
						id: stackUser.id,
						email: stackUser.primaryEmail || "",
						name: stackUser.displayName || stackUser.primaryEmail || "Unknown",
					}
				: null,
		[stackUser],
	);
	const [localStorageValue, setLocalStorageValue] = useState<string>("SSR");

	// Only access localStorage after mounting to avoid hydration issues
	useEffect(() => {
		if (typeof window !== "undefined") {
			setLocalStorageValue(
				localStorage.getItem("selectedHouseholdId") || "none",
			);
		}
	}, []);

	useEffect(() => {
		console.log("=== DEBUG HOUSEHOLD STATE ===");
		console.log("isAuthenticated:", isAuthenticated);
		console.log("user:", user);
		console.log("households from app:", households);
		console.log("selectedHousehold:", selectedHousehold);
		console.log("householdData from API:", householdData);
		if (householdData && householdData.length > 0) {
			console.log(
				"API household IDs:",
				householdData.map((h) => h.id),
			);
		}
		console.log("API loading:", isLoading);
		console.log("API error:", error);
		console.log("localStorage selectedHouseholdId:", localStorageValue);
		console.log("============================");
	}, [
		isAuthenticated,
		user,
		households,
		selectedHousehold,
		householdData,
		isLoading,
		error,
		localStorageValue,
	]);

	return (
		<div className="fixed right-4 bottom-4 max-w-md rounded-lg bg-black/80 p-4 text-white text-xs">
			<h3 className="mb-2 font-bold">Debug Household State</h3>
			<div>Auth: {isAuthenticated ? "✓" : "✗"}</div>
			<div>User: {user?.email || "none"}</div>
			<div>API Loading: {isLoading ? "⏳" : "✓"}</div>
			<div>API Error: {error?.message || "none"}</div>
			<div>Households: {households.length}</div>
			<div>Selected: {selectedHousehold?.id || "none"}</div>
			<div>Selected Name: {selectedHousehold?.name || "none"}</div>
			<div>LocalStorage: {localStorageValue}</div>
			{householdData && householdData.length > 0 && (
				<div className="mt-2 border-white/20 border-t pt-2">
					<div className="font-bold">API Households:</div>
					{householdData.map((h) => (
						<div key={h.id} className="text-xs">
							{h.name}: {h.id}
						</div>
					))}
				</div>
			)}
		</div>
	);
}
