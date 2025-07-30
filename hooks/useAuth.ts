"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AUTH_RETRY } from "@/server/auth/constants";

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
	retryCount: number;
	lastFetchTime: number;
}

export function useAuth() {
	const router = useRouter();
	const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const [authState, setAuthState] = useState<AuthState>({
		user: null,
		households: [],
		isLoading: true,
		error: null,
		retryCount: 0,
		lastFetchTime: 0,
	});

	const fetchUser = useCallback(async () => {
		// Prevent rapid retries
		const now = Date.now();
		const timeSinceLastFetch = now - authState.lastFetchTime;

		if (timeSinceLastFetch < AUTH_RETRY.INITIAL_DELAY) {
			return;
		}

		// Check if we've exceeded max retries
		if (authState.retryCount >= AUTH_RETRY.MAX_ATTEMPTS) {
			setAuthState((prev) => ({
				...prev,
				isLoading: false,
				error: "Maximum authentication attempts exceeded",
			}));
			return;
		}

		try {
			const response = await fetch("/api/auth/me", {
				credentials: "same-origin",
			});

			if (response.ok) {
				const data = await response.json();
				setAuthState({
					user: data.user,
					households: data.households,
					isLoading: false,
					error: null,
					retryCount: 0,
					lastFetchTime: now,
				});
			} else if (response.status === 401) {
				// Not authenticated - this is expected, not an error
				setAuthState({
					user: null,
					households: [],
					isLoading: false,
					error: null,
					retryCount: 0,
					lastFetchTime: now,
				});
			} else {
				throw new Error(`Authentication check failed: ${response.status}`);
			}
		} catch (error) {
			console.error("Error fetching user:", error);

			const nextRetryCount = authState.retryCount + 1;
			const delay = Math.min(
				AUTH_RETRY.INITIAL_DELAY *
					AUTH_RETRY.BACKOFF_FACTOR ** authState.retryCount,
				AUTH_RETRY.MAX_DELAY,
			);

			setAuthState((prev) => ({
				...prev,
				isLoading: nextRetryCount < AUTH_RETRY.MAX_ATTEMPTS,
				error: error instanceof Error ? error.message : "Unknown error",
				retryCount: nextRetryCount,
				lastFetchTime: now,
			}));

			// Schedule retry if we haven't exceeded max attempts
			if (nextRetryCount < AUTH_RETRY.MAX_ATTEMPTS) {
				if (fetchTimeoutRef.current) {
					clearTimeout(fetchTimeoutRef.current);
				}
				fetchTimeoutRef.current = setTimeout(() => {
					fetchUser();
				}, delay);
			}
		}
	}, [authState.lastFetchTime, authState.retryCount]);

	// Fetch current user on mount
	useEffect(() => {
		fetchUser();

		// Cleanup on unmount
		return () => {
			if (fetchTimeoutRef.current) {
				clearTimeout(fetchTimeoutRef.current);
			}
		};
	}, [fetchUser]);

	const login = useCallback(() => {
		// Redirect to login endpoint
		window.location.href = "/api/auth/login";
	}, []);

	const logout = useCallback(async () => {
		try {
			// Clear any pending retries
			if (fetchTimeoutRef.current) {
				clearTimeout(fetchTimeoutRef.current);
			}

			const response = await fetch("/api/auth/logout", {
				method: "POST",
				credentials: "same-origin",
			});

			if (response.ok) {
				// Clear auth state
				setAuthState({
					user: null,
					households: [],
					isLoading: false,
					error: null,
					retryCount: 0,
					lastFetchTime: 0,
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
