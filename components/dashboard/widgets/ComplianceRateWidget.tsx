"use client";

import { TrendingUp, TrendingDown } from "lucide-react";
import { useMemo } from "react";
import {
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import {
	ChartContainer,
	ChartTooltipContent,
	type ChartConfig,
} from "@/components/ui/chart";
import {
	useComplianceData,
	type DateRange,
	getDateRangeFromPeriod,
	PERIOD_OPTIONS,
} from "@/hooks/dashboard/useDashboardData";
import { WidgetErrorBoundary } from "./WidgetErrorBoundary";
import { WidgetSkeletons } from "./WidgetSkeletons";

interface ComplianceRateWidgetProps {
	dateRange: DateRange;
	isFullscreen?: boolean;
	className?: string;
}

const chartConfig = {
	complianceRate: {
		label: "Compliance Rate",
		color: "hsl(var(--chart-1))",
	},
	onTimeRate: {
		label: "On-Time Rate",
		color: "hsl(var(--chart-2))",
	},
} satisfies ChartConfig;

function ComplianceRateWidgetContent({
	dateRange,
	isFullscreen = false,
}: ComplianceRateWidgetProps) {
	// Get data for the specified date range
	const {
		data: complianceData,
		isLoading,
		error,
	} = useComplianceData(dateRange);

	// Generate trend data by comparing different periods
	const trendData = useMemo(() => {
		if (!complianceData) return [];

		// For demonstration, we'll create sample trend data
		// In a real app, you'd compare multiple time periods
		const days = Math.ceil(
			(dateRange.to.getTime() - dateRange.from.getTime()) /
				(1000 * 60 * 60 * 24),
		);
		const sampleData = [];

		for (let i = 0; i < Math.min(days, 14); i++) {
			const date = new Date(dateRange.from);
			date.setDate(date.getDate() + i);

			// Mock trend data based on actual compliance rate with some variation
			const baseRate = complianceData.complianceRate;
			const variation = (Math.random() - 0.5) * 20;
			const complianceRate = Math.max(0, Math.min(100, baseRate + variation));
			const onTimeRate = Math.max(
				0,
				Math.min(complianceRate, complianceData.onTimeRate + variation),
			);

			sampleData.push({
				date: date.toISOString().split("T")[0],
				complianceRate: Math.round(complianceRate),
				onTimeRate: Math.round(onTimeRate),
			});
		}

		return sampleData;
	}, [complianceData, dateRange]);

	// Calculate trend direction
	const trend = useMemo(() => {
		if (trendData.length < 2) return null;

		const recent = trendData.slice(-3);
		const earlier = trendData.slice(0, 3);

		const recentAvg =
			recent.reduce((sum, d) => sum + d.complianceRate, 0) / recent.length;
		const earlierAvg =
			earlier.reduce((sum, d) => sum + d.complianceRate, 0) / earlier.length;

		return recentAvg > earlierAvg ? "up" : "down";
	}, [trendData]);

	if (isLoading) {
		return <WidgetSkeletons.Chart title="Compliance Rate" />;
	}

	if (error || !complianceData) {
		throw new Error(error?.message || "Failed to load compliance data");
	}

	return (
		<div className="space-y-4">
			{/* Summary Stats */}
			<div className="grid grid-cols-2 gap-4">
				<div className="rounded-lg bg-muted/30 p-3 text-center">
					<div className="flex items-center justify-center gap-1">
						<span className="font-bold text-2xl">
							{complianceData.complianceRate}%
						</span>
						{trend && (
							<span
								className={trend === "up" ? "text-green-600" : "text-red-600"}
							>
								{trend === "up" ? (
									<TrendingUp className="h-4 w-4" />
								) : (
									<TrendingDown className="h-4 w-4" />
								)}
							</span>
						)}
					</div>
					<p className="text-muted-foreground text-sm">Overall Compliance</p>
				</div>
				<div className="rounded-lg bg-muted/30 p-3 text-center">
					<div className="font-bold text-2xl">{complianceData.onTimeRate}%</div>
					<p className="text-muted-foreground text-sm">On-Time Rate</p>
				</div>
			</div>

			{/* Trend Chart */}
			<div className={isFullscreen ? "h-96" : "h-64"}>
				<ChartContainer config={chartConfig}>
					<ResponsiveContainer width="100%" height="100%">
						<LineChart
							data={trendData}
							margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
						>
							<XAxis
								dataKey="date"
								tickFormatter={(value) => {
									const date = new Date(value);
									return date.toLocaleDateString("en-US", {
										month: "short",
										day: "numeric",
									});
								}}
								fontSize={12}
								tickLine={false}
								axisLine={false}
							/>
							<YAxis
								domain={[0, 100]}
								fontSize={12}
								tickLine={false}
								axisLine={false}
								tickFormatter={(value) => `${value}%`}
							/>
							<Tooltip content={<ChartTooltipContent />} />
							<Line
								type="monotone"
								dataKey="complianceRate"
								stroke="var(--color-complianceRate)"
								strokeWidth={2}
								dot={{ r: 3 }}
								connectNulls
							/>
							<Line
								type="monotone"
								dataKey="onTimeRate"
								stroke="var(--color-onTimeRate)"
								strokeWidth={2}
								dot={{ r: 3 }}
								connectNulls
								strokeDasharray="5 5"
							/>
						</LineChart>
					</ResponsiveContainer>
				</ChartContainer>
			</div>

			{/* Detailed Stats */}
			<div className="grid grid-cols-2 gap-4 text-sm lg:grid-cols-4">
				<div className="text-center">
					<div className="font-semibold text-green-600">
						{complianceData.completed}
					</div>
					<div className="text-muted-foreground">Completed</div>
				</div>
				<div className="text-center">
					<div className="font-semibold text-orange-600">
						{complianceData.late + complianceData.veryLate}
					</div>
					<div className="text-muted-foreground">Late</div>
				</div>
				<div className="text-center">
					<div className="font-semibold text-red-600">
						{complianceData.missed}
					</div>
					<div className="text-muted-foreground">Missed</div>
				</div>
				<div className="text-center">
					<div className="font-semibold">{complianceData.scheduled}</div>
					<div className="text-muted-foreground">Total</div>
				</div>
			</div>
		</div>
	);
}

export function ComplianceRateWidget(props: ComplianceRateWidgetProps) {
	return (
		<WidgetErrorBoundary widgetName="Compliance Rate">
			<ComplianceRateWidgetContent {...props} />
		</WidgetErrorBoundary>
	);
}
