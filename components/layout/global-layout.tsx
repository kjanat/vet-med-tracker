"use client";

import type { ReactNode } from "react";
import { Header } from "./header";
import { BottomNav } from "./bottom-nav";
import { LeftRail } from "./left-rail";
import { OfflineBanner } from "../ui/offline-banner";
import { useApp } from "../providers/app-provider";

export function GlobalLayout({ children }: { children: ReactNode }) {
	const { isOffline } = useApp();

	return (
		<div className="min-h-screen bg-background">
			{isOffline && <OfflineBanner />}

			{/* Desktop Layout */}
			<div className="hidden md:flex">
				<LeftRail />
				<div className="flex-1 flex flex-col">
					<Header />
					<main className="flex-1 p-6">{children}</main>
				</div>
			</div>

			{/* Mobile Layout */}
			<div className="md:hidden">
				<Header />
				<main className="pb-16 p-4">{children}</main>
				<BottomNav />
			</div>
		</div>
	);
}
