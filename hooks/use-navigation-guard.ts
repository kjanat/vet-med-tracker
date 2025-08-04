"use client";

import { useEffect } from "react";

interface UseNavigationGuardOptions {
	/**
	 * Whether to block navigation
	 */
	enabled: boolean;
	/**
	 * Message to show when blocking navigation
	 */
	message?: string;
}

/**
 * Hook to prevent navigation when there are unsaved changes
 * Works with browser back/forward buttons and page refresh
 */
export function useNavigationGuard({
	enabled,
	message = "You have unsaved changes. Are you sure you want to leave?",
}: UseNavigationGuardOptions) {
	useEffect(() => {
		if (!enabled) return;

		// Handle browser navigation (back/forward buttons)
		const handleBeforeUnload = (e: BeforeUnloadEvent) => {
			e.preventDefault();
			// Chrome requires returnValue to be set
			e.returnValue = message;
			return message;
		};

		window.addEventListener("beforeunload", handleBeforeUnload);

		return () => {
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, [enabled, message]);

	// For programmatic navigation, you would use NavigationGuardLink
	// or implement custom logic in your navigation handlers
}
