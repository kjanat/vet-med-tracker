"use client";

import { useRouter } from "next/navigation";
import { useScreenReaderAnnouncements } from "@/components/ui/screen-reader-announcer";
import { useKeyboardShortcuts } from "@/lib/keyboard-shortcuts";

/**
 * Global Keyboard Shortcuts Provider
 *
 * Provides application-wide keyboard shortcuts for navigation and actions.
 * This component should be placed high in the component tree to ensure
 * shortcuts work throughout the application.
 */
export function KeyboardShortcutsProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	const router = useRouter();
	const { announce } = useScreenReaderAnnouncements();

	// Register global keyboard shortcuts
	useKeyboardShortcuts({
		// Navigation shortcuts
		"Ctrl+R": () => {
			router.push("/admin/record");
			announce("Navigating to record medication page", "polite");
		},
		"Ctrl+I": () => {
			router.push("/inventory");
			announce("Navigating to inventory page", "polite");
		},
		"Ctrl+H": () => {
			router.push("/history");
			announce("Navigating to history page", "polite");
		},
		"Ctrl+N": () => {
			router.push("/animals/new");
			announce("Navigating to add new animal page", "polite");
		},
		"Ctrl+S": () => {
			router.push("/settings");
			announce("Navigating to settings page", "polite");
		},

		// Search shortcut - will be handled by search modal when implemented
		"Ctrl+K": () => {
			// Dispatch a custom event that search components can listen to
			window.dispatchEvent(new CustomEvent("open-global-search"));
			announce("Opening global search", "polite");
		},

		// Quick actions
		"Ctrl+Shift+A": () => {
			router.push("/admin/record");
			announce("Quick action: record medication", "polite");
		},
		"Ctrl+Shift+I": () => {
			router.push("/inventory/add");
			announce("Quick action: add inventory item", "polite");
		},
		"Ctrl+Shift+R": () => {
			router.push("/regimens/new");
			announce("Quick action: create new regimen", "polite");
		},

		// Menu toggle - will be handled by navigation components
		"Alt+M": () => {
			window.dispatchEvent(new CustomEvent("toggle-main-menu"));
			announce("Toggling main menu", "polite");
		},
	});

	return <>{children}</>;
}

/**
 * Hook to provide contextual keyboard shortcuts information
 * for specific pages or components
 */
export function useContextualKeyboardShortcuts() {
	const pathname =
		typeof window !== "undefined" ? window.location.pathname : "";

	const getContextualShortcuts = () => {
		if (pathname.includes("/admin/record")) {
			return [
				{ key: "Escape", description: "Cancel recording" },
				{ key: "Enter", description: "Confirm selection" },
				{ key: "Space", description: "Hold to confirm medication" },
			];
		}

		if (pathname.includes("/inventory")) {
			return [
				{ key: "Ctrl+Shift+I", description: "Add new inventory item" },
				{ key: "Ctrl+K", description: "Search inventory" },
			];
		}

		if (pathname.includes("/history")) {
			return [
				{ key: "Ctrl+K", description: "Search history" },
				{ key: "Enter", description: "Expand record details" },
				{ key: "Space", description: "Expand record details" },
			];
		}

		return [];
	};

	return {
		shortcuts: getContextualShortcuts(),
		pathname,
	};
}
