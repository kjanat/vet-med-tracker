"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useApp } from "../providers/app-provider";
import { OfflineBanner } from "../ui/offline-banner";
import { BottomNav } from "./bottom-nav";
import { Header } from "./header";
import { LeftRail } from "./left-rail";

export function GlobalLayout({ children }: { children: ReactNode }) {
	const { isOffline } = useApp();
	const pathname = usePathname();

	// Check if we're on a /dev route
	const isDevRoute = pathname?.startsWith("/dev");

	return (
		<div className="min-h-screen bg-background">
			{isOffline && <OfflineBanner />}

			{/* Desktop Layout */}
			<div className="hidden md:flex">
				{!isDevRoute && <LeftRail />}
				<div className="flex-1 flex flex-col">
					{!isDevRoute && <Header />}
					<main className={isDevRoute ? "flex-1" : "flex-1 p-6"}>
						{children}
					</main>
				</div>
			</div>

			{/* Mobile Layout */}
			<div className="md:hidden">
				{!isDevRoute && <Header />}
				<main className={isDevRoute ? "min-h-screen" : "pb-20 p-4"}>
					{children}
				</main>
				{!isDevRoute && <BottomNav />}
			</div>
		</div>
	);
}
