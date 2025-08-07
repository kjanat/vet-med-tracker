import type React from "react";
import { AnimatedBackground } from "@/components/landing/primitives/animated-background";
import { PublicFooter } from "@/components/layout/public-footer";
import { PublicHeader } from "@/components/layout/public-header";

export default function PublicLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="flex min-h-screen flex-col">
			<PublicHeader />
			<main className="relative flex-1">
				{/* Unified animated background for all sections */}
				<AnimatedBackground variant="default" />
				<div className="relative z-10">{children}</div>
			</main>
			<PublicFooter />
		</div>
	);
}
