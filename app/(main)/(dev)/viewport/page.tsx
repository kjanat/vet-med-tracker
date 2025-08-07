"use client";

import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

// Lazy load the viewport tester for better performance
const MobileResponsiveTester = dynamic(
	() => import("@/components/dev/viewport-tester"),
	{
		loading: () => (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin" />
					<p className="text-muted-foreground">Loading viewport tester...</p>
				</div>
			</div>
		),
		ssr: false, // Disable SSR since this uses window dimensions
	},
);

export default function ViewportPage() {
	return <MobileResponsiveTester />;
}
