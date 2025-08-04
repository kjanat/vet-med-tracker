"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Loading indicator that shows during navigation transitions
 * Note: useLinkStatus is not yet available in Next.js 15.4.5,
 * so we use pathname changes to detect navigation
 */
export function LoadingIndicator() {
	const [isNavigating, setIsNavigating] = useState(false);
	const pathname = usePathname();

	// biome-ignore lint/correctness/useExhaustiveDependencies: pathname triggers the effect intentionally (see Next.js docs)
	useEffect(() => {
		// Show loading indicator on route change
		setIsNavigating(true);

		// Hide after a short delay
		const timer = setTimeout(() => {
			setIsNavigating(false);
		}, 300);

		return () => clearTimeout(timer);
	}, [pathname]);

	return isNavigating ? (
		// biome-ignore lint/a11y/useSemanticElements: role="status" is correct for loading indicators per ARIA spec
		<div
			role="status"
			aria-label="Loading"
			className="ml-auto inline-block h-3 w-3 animate-fade-in animate-spin rounded-full border-2 border-current border-r-transparent border-solid opacity-0 motion-reduce:animate-[spin_1.5s_linear_infinite]"
		>
			<span className="sr-only">Loading...</span>
		</div>
	) : null;
}

// Add these styles to your global CSS or Tailwind config
// @keyframes fade-in {
//   from { opacity: 0; }
//   to { opacity: 1; }
// }
// .animate-fade-in {
//   animation: fade-in 500ms 100ms forwards;
// }
