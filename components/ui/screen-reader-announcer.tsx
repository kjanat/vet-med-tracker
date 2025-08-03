"use client";

import { useEffect, useRef } from "react";

interface ScreenReaderAnnouncerProps {
	/** The message to announce */
	message: string;
	/** Priority level - 'polite' waits for user to finish, 'assertive' interrupts */
	priority?: "polite" | "assertive";
	/** Whether to clear the message after announcing */
	clearAfterAnnounce?: boolean;
	/** Delay before clearing (in ms) */
	clearDelay?: number;
}

/**
 * Screen Reader Announcer Component
 *
 * Provides accessible announcements for dynamic content changes.
 * Uses ARIA live regions to communicate updates to screen readers.
 *
 * @example
 * ```tsx
 * // Announce successful medication recording
 * <ScreenReaderAnnouncer
 *   message="Medication recorded successfully for Buddy"
 *   priority="polite"
 * />
 *
 * // Announce urgent error
 * <ScreenReaderAnnouncer
 *   message="Error: Unable to record medication. Please try again."
 *   priority="assertive"
 * />
 * ```
 */
export function ScreenReaderAnnouncer({
	message,
	priority = "polite",
	clearAfterAnnounce = true,
	clearDelay = 1000,
}: ScreenReaderAnnouncerProps) {
	const timeoutRef = useRef<number | undefined>(undefined);

	useEffect(() => {
		if (clearAfterAnnounce && message) {
			timeoutRef.current = window.setTimeout(() => {
				// Clear timeout is handled by parent component re-render
			}, clearDelay);
		}

		return () => {
			if (timeoutRef.current) {
				window.clearTimeout(timeoutRef.current);
			}
		};
	}, [message, clearAfterAnnounce, clearDelay]);

	if (!message) return null;

	return (
		<output
			aria-live={priority}
			aria-atomic="true"
			className="sr-only"
			data-testid="screen-reader-announcer"
		>
			{message}
		</output>
	);
}

/**
 * Global Screen Reader Context Provider
 *
 * Provides a centralized way to manage screen reader announcements
 * across the entire application.
 */
export function GlobalScreenReaderProvider({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<>
			{children}
			{/* Persistent live regions for global announcements */}
			<output
				id="global-announcer-polite"
				aria-live="polite"
				aria-atomic="true"
				className="sr-only"
			/>
			<div
				id="global-announcer-assertive"
				role="alert"
				aria-live="assertive"
				aria-atomic="true"
				className="sr-only"
			/>
		</>
	);
}

/**
 * Utility function to announce messages programmatically
 *
 * @param message - The message to announce
 * @param priority - Priority level ('polite' | 'assertive')
 *
 * @example
 * ```ts
 * // In a form submission handler
 * announceToScreenReader("Form submitted successfully", "polite");
 *
 * // For error messages
 * announceToScreenReader("Validation error: Email is required", "assertive");
 * ```
 */
export function announceToScreenReader(
	message: string,
	priority: "polite" | "assertive" = "polite",
) {
	const announcerId = `global-announcer-${priority}`;
	const announcer = document.getElementById(announcerId);

	if (announcer) {
		// Clear any existing message first
		announcer.textContent = "";

		// Use setTimeout to ensure the clear is processed before the new message
		setTimeout(() => {
			announcer.textContent = message;

			// Clear the message after a delay to prevent accumulation
			setTimeout(() => {
				announcer.textContent = "";
			}, 1000);
		}, 100);
	}
}

/**
 * Hook for managing screen reader announcements
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { announce } = useScreenReaderAnnouncements();
 *
 *   const handleSave = () => {
 *     // ... save logic
 *     announce("Changes saved successfully");
 *   };
 *
 *   return <button onClick={handleSave}>Save</button>;
 * }
 * ```
 */
export function useScreenReaderAnnouncements() {
	const announce = (
		message: string,
		priority: "polite" | "assertive" = "polite",
	) => {
		announceToScreenReader(message, priority);
	};

	return { announce };
}

/**
 * Screen Reader Only Text Component
 *
 * Renders text that is only visible to screen readers.
 * Useful for providing additional context or instructions.
 *
 * @example
 * ```tsx
 * <button>
 *   Delete
 *   <ScreenReaderOnly text="medication record for Buddy" />
 * </button>
 * ```
 */
export function ScreenReaderOnly({ text }: { text: string }) {
	return <span className="sr-only">{text}</span>;
}

/**
 * Skip Navigation Links Component
 *
 * Provides keyboard navigation shortcuts for screen reader users.
 * Should be placed at the very beginning of the page.
 *
 * @example
 * ```tsx
 * <SkipNavigation
 *   links={[
 *     { href: "#main-content", label: "Skip to main content" },
 *     { href: "#main-navigation", label: "Skip to navigation" },
 *     { href: "#search", label: "Skip to search" }
 *   ]}
 * />
 * ```
 */
export function SkipNavigation({
	links,
}: {
	links: Array<{ href: string; label: string }>;
}) {
	return (
		<nav
			aria-label="Skip navigation"
			className="sr-only focus-within:not-sr-only"
		>
			<ul className="flex gap-2 bg-primary p-2 text-primary-foreground">
				{links.map((link) => (
					<li key={link.href}>
						<a
							href={link.href}
							className="inline-block rounded bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
						>
							{link.label}
						</a>
					</li>
				))}
			</ul>
		</nav>
	);
}
