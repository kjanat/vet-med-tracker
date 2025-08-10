"use client";

import { format } from "date-fns";
import { useMemo } from "react";
import {
	Bar,
	BarChart,
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
	useAdministrationStats,
	type Period,
} from "@/hooks/dashboard/useDashboardData";
import { WidgetErrorBoundary } from "./WidgetErrorBoundary";
import { WidgetSkeletons } from "./WidgetSkeletons";

interface AdministrationTimelineWidgetProps {
	period: Period;
	isFullscreen?: boolean;
	className?: string;
}

const chartConfig = {
	onTime: {
		label: "On Time",
		color: "hsl(var(--chart-1))",
	},
	late: {
		label: "Late",
		color: "hsl(var(--chart-2))",
	},
	missed: {
		label: "Missed",
		color: "hsl(var(--chart-3))",
	},
} satisfies ChartConfig;

function AdministrationTimelineWidgetContent({
	period,
	isFullscreen = false,
}: AdministrationTimelineWidgetProps) {
	const {
		data: timelineData,
		isLoading,
		error,
	} = useAdministrationStats(period);

	// Process data for better visualization
	const chartData = useMemo(() => {
		if (!timelineData) return [];

		return timelineData.map((day) => ({
			...day,
			dateFormatted: format(new Date(day.date), "MMM d"),
		}));
	}, [timelineData]);

	// Calculate summary stats
	const summaryStats = useMemo(() => {
		if (!timelineData) return null;

		return timelineData.reduce(
			(acc, day) => ({
				totalOnTime: acc.totalOnTime + day.onTime,
				totalLate: acc.totalLate + day.late,
				totalMissed: acc.totalMissed + day.missed,
				totalDoses: acc.totalDoses + day.total,
				activeDays: acc.activeDays + (day.total > 0 ? 1 : 0),
			}),
			{
				totalOnTime: 0,
				totalLate: 0,
				totalMissed: 0,
				totalDoses: 0,
				activeDays: 0,
			},
		);
	}, [timelineData]);

	if (isLoading) {
		return <WidgetSkeletons.Chart title="Administration Timeline" />;
	}

	if (error || !timelineData) {
		throw new Error(error?.message || "Failed to load administration timeline");
	}

	return (
		<div className="space-y-4">
			{/* Summary Stats */}
			{summaryStats && (
				<div className="grid grid-cols-3 gap-4 text-center">
					<div className="rounded-lg bg-green-50 p-3 dark:bg-green-950/20">
						<div className="font-bold text-green-600 text-xl">
							{summaryStats.totalOnTime}
						</div>
						<p className="text-muted-foreground text-sm">On Time</p>
					</div>
					<div className="rounded-lg bg-orange-50 p-3 dark:bg-orange-950/20">
						<div className="font-bold text-orange-600 text-xl">
							{summaryStats.totalLate}
						</div>
						<p className="text-muted-foreground text-sm">Late</p>
					</div>
					<div className="rounded-lg bg-red-50 p-3 dark:bg-red-950/20">
						<div className="font-bold text-red-600 text-xl">
							{summaryStats.totalMissed}
						</div>
						<p className="text-muted-foreground text-sm">Missed</p>
					</div>
				</div>
			)}

			{/* Timeline Chart */}
			<div className={isFullscreen ? "h-96" : "h-64"}>
				<ChartContainer config={chartConfig}>
					<ResponsiveContainer width="100%" height="100%">
						<BarChart
							data={chartData}
							margin={{ top: 5, right: 5, left: 5, bottom: 5 }}
						>
							<XAxis
								dataKey="dateFormatted"
								fontSize={12}
								tickLine={false}
								axisLine={false}
							/>
							<YAxis fontSize={12} tickLine={false} axisLine={false} />
							<Tooltip content={<ChartTooltipContent />} />
							<Bar
								dataKey="onTime"
								stackId="doses"
								fill="var(--color-onTime)"
								radius={[0, 0, 0, 0]}
							/>
							<Bar
								dataKey="late"
								stackId="doses"
								fill="var(--color-late)"
								radius={[0, 0, 0, 0]}
							/>
							<Bar
								dataKey="missed"
								stackId="doses"
								fill="var(--color-missed)"
								radius={[2, 2, 0, 0]}
							/>
						</BarChart>
					</ResponsiveContainer>
				</ChartContainer>
			</div>

			{/* Period Summary */}
			{summaryStats && (
				<div className="rounded-lg bg-muted/30 p-3">
					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground">
							{period.label} • {summaryStats.activeDays} active days
						</span>
						<span className="font-medium">
							{summaryStats.totalDoses > 0
								? `${Math.round((summaryStats.totalOnTime / summaryStats.totalDoses) * 100)}% on time`
								: "No doses recorded"}
						</span>
					</div>
					{summaryStats.totalDoses > 0 && (
						<div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-muted">
							<div
								className="bg-green-500"
								style={{
									width: `${(summaryStats.totalOnTime / summaryStats.totalDoses) * 100}%`,
								}}
							/>
							<div
								className="bg-orange-500"
								style={{
									width: `${(summaryStats.totalLate / summaryStats.totalDoses) * 100}%`,
								}}
							/>
							<div
								className="bg-red-500"
								style={{
									width: `${(summaryStats.totalMissed / summaryStats.totalDoses) * 100}%`,
								}}
							/>
						</div>
					)}
				</div>
			)}
		</div>
	);
}

export function AdministrationTimelineWidget(
	props: AdministrationTimelineWidgetProps,
) {
	return (
		<WidgetErrorBoundary widgetName="Administration Timeline">
			<AdministrationTimelineWidgetContent {...props} />
		</WidgetErrorBoundary>
	);
}
