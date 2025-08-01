"use client";

import { Suspense } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { RegimenList } from "@/components/regimens/regimen-list";
import { AnimalBreadcrumb } from "@/components/ui/animal-breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";

function RegimensContent() {
	return (
		<div className="space-y-6">
			{/* Main content */}
			<RegimenList />
		</div>
	);
}

export default function RegimensPage() {
	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
					<SidebarTrigger className="-ml-1" />
					<Separator orientation="vertical" className="mr-2 h-4" />
					<AnimalBreadcrumb />
				</header>
				<div className="flex flex-1 flex-col gap-4 p-4 pt-6">
					<Suspense
						fallback={
							<div className="min-h-screen bg-background animate-pulse" />
						}
					>
						<RegimensContent />
					</Suspense>
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
