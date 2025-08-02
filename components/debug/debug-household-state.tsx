"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
import { useApp } from "@/components/providers/app-provider";
import { trpc } from "@/server/trpc/client";

export function DebugHouseholdState() {
	const { selectedHousehold, households } = useApp();
	const { user: clerkUser, isLoaded } = useUser();
	const {
		data: householdData,
		isLoading,
		error,
	} = trpc.household.list.useQuery(undefined, {
		enabled: isLoaded && !!clerkUser,
	});

	const isAuthenticated = isLoaded && !!clerkUser;
	const user = useMemo(
		() =>
			clerkUser
				? {
						id: clerkUser.id,
						email: clerkUser.emailAddresses[0]?.emailAddress || "",
						name:
							clerkUser.firstName ||
							clerkUser.emailAddresses[0]?.emailAddress ||
							"Unknown",
					}
				: null,
		[clerkUser],
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
		<div className="fixed bottom-4 right-4 bg-black/80 text-white p-4 rounded-lg text-xs max-w-md">
			<h3 className="font-bold mb-2">Debug Household State</h3>
			<div>Auth: {isAuthenticated ? "✓" : "✗"}</div>
			<div>User: {user?.email || "none"}</div>
			<div>API Loading: {isLoading ? "⏳" : "✓"}</div>
			<div>API Error: {error?.message || "none"}</div>
			<div>Households: {households.length}</div>
			<div>Selected: {selectedHousehold?.id || "none"}</div>
			<div>Selected Name: {selectedHousehold?.name || "none"}</div>
			<div>LocalStorage: {localStorageValue}</div>
			{householdData && householdData.length > 0 && (
				<div className="mt-2 pt-2 border-t border-white/20">
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
