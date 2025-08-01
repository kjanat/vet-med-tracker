"use client";

import { Suspense, lazy, useEffect, useState } from "react";
import { SummaryCards } from "@/components/insights/summary-cards";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AnimalBreadcrumb } from "@/components/ui/animal-breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";
import { ChartSkeleton, ListSkeleton } from "@/components/ui/skeleton-variants";

// Lazy load heavy components
const ComplianceHeatmap = lazy(() => import("@/components/insights/compliance-heatmap").then(m => ({ default: m.ComplianceHeatmap })));
const ActionableSuggestions = lazy(() => import("@/components/insights/actionable-suggestions").then(m => ({ default: m.ActionableSuggestions })));
const ExportPanel = lazy(() => import("@/components/insights/export-panel").then(m => ({ default: m.ExportPanel })));

export default function InsightsPage() {
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
					<InsightsContent />
				</div>
			</SidebarInset>
		</SidebarProvider>
	);
}

function InsightsContent() {
	// Initialize with null to avoid hydration mismatch
	const [selectedRange, setSelectedRange] = useState<{
		from: Date;
		to: Date;
	} | null>(null);

	// Set dates after mount to ensure consistency
	useEffect(() => {
		const to = new Date();
		const from = new Date(to);
		from.setDate(from.getDate() - 30);
		setSelectedRange({ from, to });
	}, []);

	// Show loading state while dates initialize
	if (!selectedRange) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl md:text-3xl font-bold">Insights</h1>
					<p className="text-sm md:text-base text-muted-foreground">
						Loading compliance analytics...
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl md:text-3xl font-bold">Insights</h1>
				<p className="text-sm md:text-base text-muted-foreground">
					Compliance analytics and actionable recommendations
				</p>
			</div>

			{/* Above the fold - Summary Cards */}
			<SummaryCards range={selectedRange} />

			<div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
				{/* Main content - Heatmap */}
				<div className="space-y-6 lg:col-span-2">
					<Suspense fallback={<ChartSkeleton />}>
						<ComplianceHeatmap
							range={selectedRange}
							onRangeChange={setSelectedRange}
						/>
					</Suspense>
					<Suspense fallback={<div className="h-20" />}>
						<ExportPanel />
					</Suspense>
				</div>

				{/* Right rail - Actionable Suggestions */}
				<div className="space-y-6">
					<Suspense fallback={<ListSkeleton count={3} />}>
						<ActionableSuggestions />
					</Suspense>
				</div>
			</div>
		</div>
	);
}
