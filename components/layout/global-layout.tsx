"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { useApp } from "../providers/app-provider";
import { OfflineBanner } from "../ui/offline-banner";
import { SidebarInset, SidebarProvider } from "../ui/sidebar";
import { AppSidebar } from "./app-sidebar";
import { BottomNav } from "./bottom-nav";
import { Header } from "./header";

export function GlobalLayout({ children }: { children: ReactNode }) {
	const { isOffline } = useApp();
	const pathname = usePathname();

	// Check if we're on a /dev route
	const isDevRoute = pathname?.startsWith("/dev");

	// For dev routes, use simple layout without sidebar
	if (isDevRoute) {
		return (
			<div className="min-h-screen bg-background">
				{isOffline && <OfflineBanner />}
				<main className="min-h-screen">{children}</main>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background">
			{isOffline && <OfflineBanner />}

			<SidebarProvider>
				{/* Desktop Layout with Sidebar */}
				<AppSidebar />
				<SidebarInset>
					{/* Desktop Header with Sidebar Trigger */}
					<Header />

					{/* Main Content */}
					<main className="flex-1 p-6 hidden md:block">{children}</main>
				</SidebarInset>

				{/* Mobile Layout */}
				<div className="md:hidden">
					<Header />
					<main className="pb-20 p-4">{children}</main>
					<BottomNav />
				</div>
			</SidebarProvider>
		</div>
	);
}
