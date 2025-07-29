"use client";

import { useEffect, useState } from "react";
import { ActionableSuggestions } from "@/components/insights/actionable-suggestions";
import { ComplianceHeatmap } from "@/components/insights/compliance-heatmap";
import { ExportPanel } from "@/components/insights/export-panel";
import { SummaryCards } from "@/components/insights/summary-cards";

export default function InsightsPage() {
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
			<div className="min-h-screen bg-background max-w-full overflow-x-hidden">
				<div className="p-4 md:p-6 space-y-6">
					<div>
						<h1 className="text-2xl md:text-3xl font-bold">Insights</h1>
						<p className="text-sm md:text-base text-muted-foreground">
							Loading compliance analytics...
						</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-background max-w-full overflow-x-hidden">
			<div className="p-4 md:p-6 space-y-6">
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
						<ComplianceHeatmap
							range={selectedRange}
							onRangeChange={setSelectedRange}
						/>
						<ExportPanel />
					</div>

					{/* Right rail - Actionable Suggestions */}
					<div className="space-y-6">
						<ActionableSuggestions range={selectedRange} />
					</div>
				</div>
			</div>
		</div>
	);
}
