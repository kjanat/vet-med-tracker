"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { AUTH_RETRY } from "@/server/auth/constants";
import type { Membership, User } from "@/server/db/schema";

// Type alias for clarity
type Household = Pick<Membership, "householdId" | "role">;

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

	// Note: Authentication checks are not suitable for offline queueing
	// as they need immediate feedback to determine UI state and access control.
	// The app needs to know synchronously if a user is authenticated or not.
	// Helper to check if we should retry
	const shouldRetryFetch = useCallback(() => {
		const now = Date.now();
		const timeSinceLastFetch = now - authState.lastFetchTime;

		if (timeSinceLastFetch < AUTH_RETRY.INITIAL_DELAY) {
			return false;
		}

		if (authState.retryCount >= AUTH_RETRY.MAX_ATTEMPTS) {
			setAuthState((prev) => ({
				...prev,
				isLoading: false,
				error: "Maximum authentication attempts exceeded",
			}));
			return false;
		}

		return true;
	}, [authState.lastFetchTime, authState.retryCount]);

	// Helper to handle successful response
	const handleAuthSuccess = useCallback(
		(data: { user: User; households: Household[] }, now: number) => {
			setAuthState({
				user: data.user,
				households: data.households,
				isLoading: false,
				error: null,
				retryCount: 0,
				lastFetchTime: now,
			});
		},
		[],
	);

	// Helper to handle unauthenticated response
	const handleUnauthenticated = useCallback((now: number) => {
		setAuthState({
			user: null,
			households: [],
			isLoading: false,
			error: null,
			retryCount: 0,
			lastFetchTime: now,
		});
	}, []);

	// Helper to handle server errors
	const handleServerError = useCallback(
		async (response: Response, now: number) => {
			const errorMessage = `Server error: ${response.status}`;
			const shouldRetry = response.status === 503 || response.status === 502;

			// Helper to check if error is permanent
			const isPermanentError = async (): Promise<boolean> => {
				try {
					const errorData = await response.json();
					return (
						errorData.error?.includes("relation") ||
						errorData.error?.includes("does not exist") ||
						errorData.error?.includes("configuration")
					);
				} catch {
					return false;
				}
			};

			// Check if it's a permanent error
			if (!shouldRetry || (await isPermanentError())) {
				setAuthState({
					user: null,
					households: [],
					isLoading: false,
					error: errorMessage,
					retryCount: AUTH_RETRY.MAX_ATTEMPTS,
					lastFetchTime: now,
				});
				return false;
			}

			throw new Error(errorMessage);
		},
		[],
	);

	// Helper to schedule retry
	const scheduleRetry = useCallback(
		(nextRetryCount: number, retryCount: number, callback: () => void) => {
			if (nextRetryCount >= AUTH_RETRY.MAX_ATTEMPTS) {
				return;
			}

			const delay = Math.min(
				AUTH_RETRY.INITIAL_DELAY * AUTH_RETRY.BACKOFF_FACTOR ** retryCount,
				AUTH_RETRY.MAX_DELAY,
			);

			if (fetchTimeoutRef.current) {
				clearTimeout(fetchTimeoutRef.current);
			}
			fetchTimeoutRef.current = setTimeout(callback, delay);
		},
		[],
	);

	const fetchUser = useCallback(async () => {
		if (!shouldRetryFetch()) {
			return;
		}

		const now = Date.now();

		try {
			const response = await fetch("/api/auth/me", {
				credentials: "same-origin",
			});

			if (response.ok) {
				const data = await response.json();
				handleAuthSuccess(data, now);
			} else if (response.status === 401) {
				handleUnauthenticated(now);
			} else if (response.status >= 500) {
				await handleServerError(response, now);
			} else {
				throw new Error(`Authentication check failed: ${response.status}`);
			}
		} catch (error) {
			console.error("Error fetching user:", error);

			const nextRetryCount = authState.retryCount + 1;

			setAuthState((prev) => ({
				...prev,
				isLoading: nextRetryCount < AUTH_RETRY.MAX_ATTEMPTS,
				error: error instanceof Error ? error.message : "Unknown error",
				retryCount: nextRetryCount,
				lastFetchTime: now,
			}));

			scheduleRetry(nextRetryCount, authState.retryCount, () => fetchUser());
		}
	}, [
		shouldRetryFetch,
		handleAuthSuccess,
		handleUnauthenticated,
		handleServerError,
		scheduleRetry,
		authState.retryCount,
	]);

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
		// OAuth flows require full page navigation for security
		// Using window.location.href is intentional here as the OAuth provider
		// needs to redirect back to our callback URL with authentication codes
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
			// OAuth flows require full page navigation for security
			// Using window.location.href is intentional here as the OAuth provider
			// needs to redirect back to our callback URL with authentication codes
			window.location.href = "/api/auth/login";
		}
	}, [user, isLoading]);

	return { user, isLoading };
}

// Export the base hook for the AuthProvider to use
export { useAuth as useAuthBase };
