"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { useState } from "react";

interface HoverPrefetchLinkProps
	extends Omit<ComponentProps<typeof Link>, "prefetch"> {
	/**
	 * Children to render inside the link
	 */
	children: React.ReactNode;
}

/**
 * Link component that only prefetches on hover to reduce resource usage.
 * Useful for large lists of links like tables or infinite scroll.
 *
 * @example
 * ```tsx
 * <HoverPrefetchLink href="/dashboard/history">
 *   View History
 * </HoverPrefetchLink>
 * ```
 */
export function HoverPrefetchLink({
	children,
	...props
}: HoverPrefetchLinkProps) {
	const [shouldPrefetch, setShouldPrefetch] = useState(false);

	return (
		<Link
			{...props}
			prefetch={shouldPrefetch}
			onMouseEnter={() => setShouldPrefetch(true)}
			onFocus={() => setShouldPrefetch(true)}
		>
			{children}
		</Link>
	);
}
