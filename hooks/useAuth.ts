"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

interface User {
	id: string;
	email: string;
	name?: string;
	image?: string | null;
}

interface Household {
	householdId: string;
	role: "OWNER" | "CAREGIVER" | "VETREADONLY";
}

interface AuthState {
	user: User | null;
	households: Household[];
	isLoading: boolean;
	error: string | null;
}

export function useAuth() {
	const router = useRouter();
	const [authState, setAuthState] = useState<AuthState>({
		user: null,
		households: [],
		isLoading: true,
		error: null,
	});

	const fetchUser = useCallback(async () => {
		try {
			const response = await fetch("/api/auth/me");
			if (response.ok) {
				const data = await response.json();
				setAuthState({
					user: data.user,
					households: data.households,
					isLoading: false,
					error: null,
				});
			} else if (response.status === 401) {
				// Not authenticated
				setAuthState({
					user: null,
					households: [],
					isLoading: false,
					error: null,
				});
			} else {
				throw new Error("Failed to fetch user");
			}
		} catch (error) {
			console.error("Error fetching user:", error);
			setAuthState({
				user: null,
				households: [],
				isLoading: false,
				error: error instanceof Error ? error.message : "Unknown error",
			});
		}
	}, []);

	// Fetch current user on mount
	useEffect(() => {
		fetchUser();
	}, [fetchUser]);

	const login = useCallback(() => {
		// Redirect to login endpoint
		window.location.href = "/api/auth/login";
	}, []);

	const logout = useCallback(async () => {
		try {
			const response = await fetch("/api/auth/logout", {
				method: "POST",
			});

			if (response.ok) {
				// Clear auth state
				setAuthState({
					user: null,
					households: [],
					isLoading: false,
					error: null,
				});

				// Redirect to home
				router.push("/");
			} else {
				throw new Error("Logout failed");
			}
		} catch (error) {
			console.error("Logout error:", error);
			setAuthState((prev) => ({
				...prev,
				error: error instanceof Error ? error.message : "Logout failed",
			}));
		}
	}, [router]);

	const refreshAuth = useCallback(async () => {
		await fetchUser();
	}, [fetchUser]);

	return {
		user: authState.user,
		households: authState.households,
		isAuthenticated: !!authState.user,
		isLoading: authState.isLoading,
		error: authState.error,
		login,
		logout,
		refreshAuth,
	};
}

// Hook to require authentication
export function useRequireAuth() {
	const { user, isLoading } = useAuth();

	useEffect(() => {
		if (!isLoading && !user) {
			// Redirect to login
			window.location.href = "/api/auth/login";
		}
	}, [user, isLoading]);

	return { user, isLoading };
}
