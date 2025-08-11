"use client";

import { AlertTriangle, Package, TrendingDown } from "lucide-react";
import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Badge } from "@/components/ui/badge";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";
import { Progress } from "@/components/ui/progress";
import { useInventoryMetrics } from "@/hooks/dashboard/useDashboardData";
import { WidgetErrorBoundary } from "./WidgetErrorBoundary";
import { WidgetSkeletons } from "./WidgetSkeletons";

interface InventoryLevelsWidgetProps {
	isFullscreen?: boolean;
	className?: string;
}

const chartConfig = {
	normal: {
		label: "Normal Stock",
		color: "hsl(var(--chart-1))",
	},
	low: {
		label: "Low Stock",
		color: "hsl(var(--chart-3))",
	},
	empty: {
		label: "Out of Stock",
		color: "hsl(var(--destructive))",
	},
} satisfies ChartConfig;

function InventoryLevelsWidgetContent({
	isFullscreen = false,
}: InventoryLevelsWidgetProps) {
	const { data: inventoryData, isLoading, error } = useInventoryMetrics();

	// Process data for visualization
	const processedData = useMemo(() => {
		if (!inventoryData) return null;

		// Calculate stock levels distribution
		const normalStock = inventoryData.activeItems - inventoryData.lowStockItems;
		const stockDistribution = [
			{
				name: "Normal Stock",
				value: normalStock,
				color: chartConfig.normal.color,
			},
			{
				name: "Low Stock",
				value: inventoryData.lowStockItems,
				color: chartConfig.low.color,
			},
		];

		// Get items that need attention (low stock and expiring soon)
		const attentionItems = inventoryData.rawData
			.filter((item) => {
				if (!item.inUse) return false;

				const isLowStock =
					item.unitsRemaining && item.unitsTotal
						? item.unitsRemaining / item.unitsTotal <= 0.2
						: false;

				const isExpiringSoon = item.expiresOn
					? Math.ceil(
							(new Date(item.expiresOn).getTime() - Date.now()) /
								(1000 * 60 * 60 * 24),
						) <= 30
					: false;

				return isLowStock || isExpiringSoon;
			})
			.map((item) => {
				const percentRemaining =
					item.unitsRemaining && item.unitsTotal
						? Math.round((item.unitsRemaining / item.unitsTotal) * 100)
						: 0;

				const daysUntilExpiry = item.expiresOn
					? Math.ceil(
							(new Date(item.expiresOn).getTime() - Date.now()) /
								(1000 * 60 * 60 * 24),
						)
					: null;

				return {
					id: item.id,
					medicationName: item.genericName || "Unknown",
					animalName: item.assignedAnimalName,
					percentRemaining,
					unitsRemaining: item.unitsRemaining || 0,
					daysUntilExpiry,
					isLowStock: percentRemaining <= 20,
					isExpiringSoon: daysUntilExpiry !== null && daysUntilExpiry <= 30,
				};
			})
			.sort((a, b) => {
				// Sort by urgency: low stock + expiring soon first, then low stock, then expiring soon
				if (
					a.isLowStock &&
					a.isExpiringSoon &&
					!(b.isLowStock && b.isExpiringSoon)
				)
					return -1;
				if (
					!(a.isLowStock && a.isExpiringSoon) &&
					b.isLowStock &&
					b.isExpiringSoon
				)
					return 1;
				if (a.isLowStock && !b.isLowStock) return -1;
				if (!a.isLowStock && b.isLowStock) return 1;
				return a.percentRemaining - b.percentRemaining;
			});

		return {
			stockDistribution,
			attentionItems,
			metrics: inventoryData,
		};
	}, [inventoryData]);

	if (isLoading) {
		return <WidgetSkeletons.Gauge title="Inventory Levels" />;
	}

	if (error || !processedData) {
		throw new Error(error?.message || "Failed to load inventory data");
	}

	if (processedData.metrics.activeItems === 0) {
		return (
			<div className="flex h-64 items-center justify-center text-center">
				<div>
					<Package className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
					<p className="text-muted-foreground">No active inventory</p>
					<p className="text-muted-foreground text-sm">
						Add medications to track levels
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Overview Metrics */}
			<div className="grid grid-cols-3 gap-3 text-center">
				<div className="rounded-lg bg-muted/30 p-3">
					<div className="font-bold text-xl">
						{processedData.metrics.activeItems}
					</div>
					<p className="text-muted-foreground text-sm">Active Items</p>
				</div>
				<div className="rounded-lg bg-orange-50 p-3 dark:bg-orange-950/20">
					<div className="font-bold text-orange-600 text-xl">
						{processedData.metrics.lowStockItems}
					</div>
					<p className="text-muted-foreground text-sm">Low Stock</p>
				</div>
				<div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/20">
					<div className="font-bold text-blue-600 text-xl">
						{processedData.metrics.expiringSoonItems}
					</div>
					<p className="text-muted-foreground text-sm">Expiring Soon</p>
				</div>
			</div>

			{/* Stock Distribution Gauge */}
			<div className="relative">
				<div className="h-32">
					<ChartContainer config={chartConfig}>
						<ResponsiveContainer width="100%" height="100%">
							<PieChart>
								<Pie
									data={processedData.stockDistribution}
									cx="50%"
									cy="50%"
									startAngle={180}
									endAngle={0}
									innerRadius={40}
									outerRadius={60}
									paddingAngle={2}
									dataKey="value"
								>
									{processedData.stockDistribution.map((entry, index) => (
										<Cell key={`cell-${index}`} fill={entry.color} />
									))}
								</Pie>
							</PieChart>
						</ResponsiveContainer>
					</ChartContainer>
				</div>

				{/* Gauge center text */}
				<div className="absolute inset-0 flex items-center justify-center">
					<div className="text-center">
						<div className="font-bold text-2xl">
							{processedData.metrics.lowStockPercentage}%
						</div>
						<p className="text-muted-foreground text-xs">Need Attention</p>
					</div>
				</div>
			</div>

			{/* Items Needing Attention */}
			{processedData.attentionItems.length > 0 && (
				<div className="space-y-2">
					<h4 className="flex items-center gap-2 font-medium text-sm">
						<AlertTriangle className="h-4 w-4 text-orange-500" />
						Items Needing Attention
					</h4>

					<div
						className={`space-y-2 ${isFullscreen ? "max-h-64" : "max-h-32"} overflow-y-auto`}
					>
						{processedData.attentionItems.map((item) => (
							<div key={item.id} className="rounded-lg border p-2">
								<div className="flex items-center justify-between">
									<div>
										<p className="font-medium text-sm">{item.medicationName}</p>
										{item.animalName && (
											<p className="text-muted-foreground text-xs">
												for {item.animalName}
											</p>
										)}
									</div>
									<div className="flex items-center gap-2">
										{item.isLowStock && (
											<Badge variant="destructive" className="text-xs">
												{item.percentRemaining}%
											</Badge>
										)}
										{item.isExpiringSoon && item.daysUntilExpiry !== null && (
											<Badge variant="secondary" className="text-xs">
												{item.daysUntilExpiry}d
											</Badge>
										)}
									</div>
								</div>

								{item.isLowStock && (
									<div className="mt-2">
										<Progress value={item.percentRemaining} className="h-1" />
										<p className="mt-1 text-muted-foreground text-xs">
											{item.unitsRemaining} units remaining
										</p>
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			)}

			{/* Summary */}
			<div className="rounded-lg bg-muted/30 p-3">
				<div className="flex items-center justify-between text-sm">
					<span className="text-muted-foreground">Inventory Status</span>
					<span className="flex items-center gap-1 font-medium">
						{processedData.metrics.lowStockItems > 0 ? (
							<>
								<TrendingDown className="h-3 w-3 text-orange-500" />
								Action Required
							</>
						) : (
							"All Good"
						)}
					</span>
				</div>
			</div>
		</div>
	);
}

export function InventoryLevelsWidget(props: InventoryLevelsWidgetProps) {
	return (
		<WidgetErrorBoundary widgetName="Inventory Levels">
			<InventoryLevelsWidgetContent {...props} />
		</WidgetErrorBoundary>
	);
}
