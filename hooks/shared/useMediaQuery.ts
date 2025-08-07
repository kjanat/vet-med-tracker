"use client";

import { useEffect, useState } from "react";

export function useMediaQuery(query: string): boolean {
	const [matches, setMatches] = useState(false);

	useEffect(() => {
		// Check if we're in the browser environment
		if (typeof window === "undefined") return;

		const media = window.matchMedia(query);

		// Set initial value
		setMatches(media.matches);

		// Create event listener
		const listener = (event: MediaQueryListEvent) => {
			setMatches(event.matches);
		};

		// Add event listener
		if (media.addEventListener) {
			media.addEventListener("change", listener);
		} else {
			// Fallback for older browsers
			media.addListener(listener);
		}

		// Clean up
		return () => {
			if (media.removeEventListener) {
				media.removeEventListener("change", listener);
			} else {
				// Fallback for older browsers
				media.removeListener(listener);
			}
		};
	}, [query]);

	return matches;
}
