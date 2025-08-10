"use client";

import { BarChart3, Download, RefreshCw, Settings } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
// Use lazy loading for heavy chart components
import {
	LazyAdministrationTimelineWidget,
	LazyAnimalActivityWidget,
	LazyComplianceHeatmap,
	LazyComplianceRateWidget,
	LazyInventoryLevelsWidget,
	LazyMedicationDistributionWidget,
} from "@/components/optimized/LazyComponents";
import { useApp } from "@/components/providers/app-provider-consolidated";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
	type DateRange,
	getDateRangeFromPeriod,
	PERIOD_OPTIONS,
	type Period,
	useDashboardRefresh,
} from "@/hooks/dashboard/useDashboardData";
import { DashboardLayout, type DashboardWidget } from "./DashboardLayout";
import { DateRangeSelector } from "./DateRangeSelector";
import { UpcomingDosesWidget } from "./widgets/UpcomingDosesWidget";

interface ReportingDashboardProps {
	className?: string;
}

export function ReportingDashboard({ className }: ReportingDashboardProps) {
	const { selectedHousehold } = useApp();
	const refreshDashboard = useDashboardRefresh();

	// State management
	const defaultPeriod = PERIOD_OPTIONS[1]; // Last 30 days
	const [selectedPeriod, setSelectedPeriod] = useState<Period>(defaultPeriod);
	const [dateRange, setDateRange] = useState<DateRange>(() =>
		getDateRangeFromPeriod(defaultPeriod),
	);

	// Handle date range changes
	const handleDateRangeChange = useCallback((newRange: DateRange) => {
		setDateRange(newRange);
	}, []);

	const handlePeriodChange = useCallback((period: Period) => {
		setSelectedPeriod(period);
	}, []);

	// Handle dashboard refresh
	const handleRefresh = useCallback(() => {
		refreshDashboard();

		// Fire analytics event
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("dashboard:refresh", {
					detail: { timestamp: Date.now() },
				}),
			);
		}
	}, [refreshDashboard]);

	// Handle export functionality
	const handleExport = useCallback(
		(format: "pdf" | "csv" | "excel") => {
			// Fire analytics event
			if (typeof window !== "undefined") {
				window.dispatchEvent(
					new CustomEvent("dashboard:export", {
						detail: { format, dateRange, timestamp: Date.now() },
					}),
				);
			}

			// In a real implementation, you would trigger the export here
			console.log(`Exporting dashboard as ${format}`, { dateRange });

			// For now, just show a notification
			alert(`Export as ${format.toUpperCase()} would start here`);
		},
		[dateRange],
	);

	// Define dashboard widgets
	const widgets = useMemo<DashboardWidget[]>(
		() => [
			{
				id: "compliance-rate",
				title: "Compliance Rate Trend",
				component: ({ isFullscreen }) => (
					<LazyComplianceRateWidget
						dateRange={dateRange}
						isFullscreen={isFullscreen}
					/>
				),
				minHeight: 320,
				defaultExpanded: true,
			},
			{
				id: "administration-timeline",
				title: "Administration Timeline",
				component: ({ isFullscreen }) => (
					<LazyAdministrationTimelineWidget
						period={selectedPeriod}
						isFullscreen={isFullscreen}
					/>
				),
				minHeight: 320,
				defaultExpanded: true,
			},
			{
				id: "medication-distribution",
				title: "Medication Distribution",
				component: ({ isFullscreen }) => (
					<LazyMedicationDistributionWidget isFullscreen={isFullscreen} />
				),
				minHeight: 300,
				defaultExpanded: true,
			},
			{
				id: "animal-activity",
				title: "Animal Activity Ranking",
				component: ({ isFullscreen }) => (
					<LazyAnimalActivityWidget
						dateRange={dateRange}
						isFullscreen={isFullscreen}
					/>
				),
				minHeight: 350,
				defaultExpanded: true,
			},
			{
				id: "inventory-levels",
				title: "Inventory Status",
				component: ({ isFullscreen }) => (
					<LazyInventoryLevelsWidget isFullscreen={isFullscreen} />
				),
				minHeight: 320,
				defaultExpanded: true,
			},
			{
				id: "upcoming-doses",
				title: "Upcoming Doses Calendar",
				component: ({ isFullscreen }) => (
					<UpcomingDosesWidget isFullscreen={isFullscreen} />
				),
				minHeight: 300,
				defaultExpanded: true,
			},
			{
				id: "compliance-heatmap",
				title: "Compliance Heatmap",
				component: ({ isFullscreen }) => (
					<div className={isFullscreen ? "h-full" : ""}>
						<LazyComplianceHeatmap
							range={dateRange}
							onRangeChange={handleDateRangeChange}
						/>
					</div>
				),
				minHeight: 400,
				defaultExpanded: false, // Collapsed by default due to complexity
			},
		],
		[dateRange, selectedPeriod, handleDateRangeChange],
	);

	// Show message if no household is selected
	if (!selectedHousehold) {
		return (
			<Card className="mx-auto max-w-md">
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<BarChart3 className="h-5 w-5" />
						Reporting Dashboard
					</CardTitle>
					<CardDescription>
						Advanced analytics and insights for your veterinary practice
					</CardDescription>
				</CardHeader>
				<CardContent>
					<p className="text-center text-muted-foreground">
						Please select a household to view reporting dashboard
					</p>
				</CardContent>
			</Card>
		);
	}

	return (
		<div className={className}>
			{/* Dashboard Header */}
			<div className="mb-6 space-y-4">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="flex items-center gap-2 font-bold text-2xl">
							<BarChart3 className="h-6 w-6" />
							Reporting Dashboard
						</h1>
						<p className="text-muted-foreground">
							Analytics and insights for {selectedHousehold.name}
						</p>
					</div>

					{/* Actions */}
					<div className="flex items-center gap-2">
						<Button
							variant="outline"
							size="sm"
							onClick={handleRefresh}
							className="gap-2"
						>
							<RefreshCw className="h-4 w-4" />
							Refresh
						</Button>

						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" size="sm" className="gap-2">
									<Download className="h-4 w-4" />
									Export
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent align="end">
								<DropdownMenuItem onClick={() => handleExport("pdf")}>
									Export as PDF
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => handleExport("excel")}>
									Export as Excel
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => handleExport("csv")}>
									Export as CSV
								</DropdownMenuItem>
								<DropdownMenuSeparator />
								<DropdownMenuItem disabled>
									<Settings className="mr-2 h-4 w-4" />
									Configure Export...
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
					</div>
				</div>

				{/* Filters */}
				<div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
					<DateRangeSelector
						dateRange={dateRange}
						onDateRangeChange={handleDateRangeChange}
						selectedPeriod={selectedPeriod}
						onPeriodChange={handlePeriodChange}
					/>

					<div className="text-muted-foreground text-sm">
						{widgets.length} widgets • Last updated:{" "}
						{new Date().toLocaleTimeString()}
					</div>
				</div>

				<Separator />
			</div>

			{/* Dashboard Grid */}
			<DashboardLayout widgets={widgets} columns={3} gap={4} />

			{/* Footer */}
			<div className="mt-8 text-center text-muted-foreground text-sm">
				<p>
					Dashboard automatically refreshes every 5 minutes. Data includes all
					households you have access to.
				</p>
			</div>
		</div>
	);
}
