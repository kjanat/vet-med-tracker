"use client";

import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Badge } from "@/components/ui/badge";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";
import { useMedicationDistribution } from "@/hooks/dashboard/useDashboardData";
import { WidgetErrorBoundary } from "./WidgetErrorBoundary";
import { WidgetSkeletons } from "./WidgetSkeletons";

interface MedicationDistributionWidgetProps {
	isFullscreen?: boolean;
	className?: string;
}

// Predefined colors for consistency
const COLORS = [
	"hsl(var(--chart-1))",
	"hsl(var(--chart-2))",
	"hsl(var(--chart-3))",
	"hsl(var(--chart-4))",
	"hsl(var(--chart-5))",
	"#8884d8",
	"#82ca9d",
	"#ffc658",
	"#ff7300",
	"#a4de6c",
];

function MedicationDistributionWidgetContent({
	isFullscreen = false,
}: MedicationDistributionWidgetProps) {
	const {
		data: medicationData,
		isLoading,
		error,
	} = useMedicationDistribution();

	// Process data for chart
	const chartData = useMemo(() => {
		if (!medicationData) return [];

		// Take top 8 medications and group the rest as "Others"
		const topMedications = medicationData.slice(0, 8);
		const otherMedications = medicationData.slice(8);

		const processedData = topMedications.map((med, index) => ({
			name: med.name,
			count: med.count,
			color: COLORS[index % COLORS.length],
			percentage: 0, // Will be calculated below
		}));

		if (otherMedications.length > 0) {
			const otherCount = otherMedications.reduce(
				(sum, med) => sum + med.count,
				0,
			);
			processedData.push({
				name: `Others (${otherMedications.length})`,
				count: otherCount,
				color: COLORS[8 % COLORS.length],
				percentage: 0,
			});
		}

		// Calculate percentages
		const total = processedData.reduce((sum, item) => sum + item.count, 0);
		return processedData.map((item) => ({
			...item,
			percentage: total > 0 ? Math.round((item.count / total) * 100) : 0,
		}));
	}, [medicationData]);

	// Create chart config dynamically
	const chartConfig = useMemo(() => {
		const config: ChartConfig = {};
		chartData.forEach((item, _index) => {
			config[item.name] = {
				label: item.name,
				color: item.color,
			};
		});
		return config;
	}, [chartData]);

	// Custom tooltip content
	const customTooltip = ({ active, payload }: any) => {
		if (active && payload && payload.length) {
			const data = payload[0];
			return (
				<div className="rounded-lg border bg-background px-3 py-2 shadow-md">
					<p className="font-medium">{data.name}</p>
					<p className="text-muted-foreground text-sm">
						{data.value} regimens ({data.payload.percentage}%)
					</p>
				</div>
			);
		}
		return null;
	};

	if (isLoading) {
		return <WidgetSkeletons.Chart title="Medication Distribution" />;
	}

	if (error || !medicationData) {
		throw new Error(error?.message || "Failed to load medication distribution");
	}

	if (chartData.length === 0) {
		return (
			<div className="flex h-64 items-center justify-center text-center">
				<div>
					<p className="text-muted-foreground">No medications found</p>
					<p className="text-muted-foreground text-sm">
						Add regimens to see distribution
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Pie Chart */}
			<div className={isFullscreen ? "h-80" : "h-64"}>
				<ChartContainer config={chartConfig}>
					<ResponsiveContainer width="100%" height="100%">
						<PieChart>
							<Pie
								data={chartData}
								cx="50%"
								cy="50%"
								innerRadius={isFullscreen ? 60 : 40}
								outerRadius={isFullscreen ? 120 : 80}
								paddingAngle={2}
								dataKey="count"
								label={({ percent }) => `${((percent ?? 0) * 100).toFixed(0)}%`}
								labelLine={false}
							>
								{chartData.map((entry) => (
									<Cell key={`cell-${entry.name}`} fill={entry.color} />
								))}
							</Pie>
							<Tooltip content={customTooltip} />
						</PieChart>
					</ResponsiveContainer>
				</ChartContainer>
			</div>

			{/* Legend with detailed info */}
			<div className="space-y-2">
				{chartData.map((item, _index) => (
					<div
						key={item.name}
						className="flex items-center justify-between gap-2"
					>
						<div className="flex items-center gap-2">
							<div
								className="h-3 w-3 rounded-full"
								style={{ backgroundColor: item.color }}
							/>
							<span className="truncate text-sm">{item.name}</span>
						</div>
						<div className="flex items-center gap-2">
							<Badge variant="secondary" className="text-xs">
								{item.count}
							</Badge>
							<span className="text-muted-foreground text-sm">
								{item.percentage}%
							</span>
						</div>
					</div>
				))}
			</div>

			{/* Summary */}
			<div className="rounded-lg bg-muted/30 p-3 text-center">
				<div className="font-semibold">
					{medicationData.reduce((sum, med) => sum + med.count, 0)} Active
					Regimens
				</div>
				<p className="text-muted-foreground text-sm">
					Across {medicationData.length} different medications
				</p>
			</div>
		</div>
	);
}

export function MedicationDistributionWidget(
	props: MedicationDistributionWidgetProps,
) {
	return (
		<WidgetErrorBoundary widgetName="Medication Distribution">
			<MedicationDistributionWidgetContent {...props} />
		</WidgetErrorBoundary>
	);
}
