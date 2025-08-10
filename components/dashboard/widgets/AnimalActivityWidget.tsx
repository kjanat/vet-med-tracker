"use client";

import { useMemo } from "react";
import { AnimalAvatar } from "@/components/ui/animal-avatar";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
	type DateRange,
	useAnimalActivityData,
} from "@/hooks/dashboard/useDashboardData";
import { WidgetErrorBoundary } from "./WidgetErrorBoundary";
import { WidgetSkeletons } from "./WidgetSkeletons";

interface AnimalActivityWidgetProps {
	dateRange: DateRange;
	isFullscreen?: boolean;
	className?: string;
}

function AnimalActivityWidgetContent({
	dateRange,
	isFullscreen = false,
}: AnimalActivityWidgetProps) {
	const {
		data: animalData,
		isLoading,
		error,
	} = useAnimalActivityData(dateRange);

	// Sort animals by compliance rate and add rankings
	const rankedAnimals = useMemo(() => {
		if (!animalData) return [];

		return animalData.map((animal, index) => ({
			...animal,
			rank: index + 1,
			complianceColor:
				animal.complianceRate >= 90
					? "text-green-600"
					: animal.complianceRate >= 80
						? "text-orange-600"
						: "text-red-600",
			complianceBadgeVariant:
				animal.complianceRate >= 90
					? ("default" as const)
					: animal.complianceRate >= 80
						? ("secondary" as const)
						: ("destructive" as const),
		}));
	}, [animalData]);

	// Calculate summary stats
	const summaryStats = useMemo(() => {
		if (!animalData) return null;

		const totalScheduled = animalData.reduce(
			(sum, animal) => sum + animal.scheduled,
			0,
		);
		const totalCompleted = animalData.reduce(
			(sum, animal) => sum + animal.completed,
			0,
		);
		const averageCompliance =
			animalData.length > 0
				? Math.round(
						animalData.reduce((sum, animal) => sum + animal.complianceRate, 0) /
							animalData.length,
					)
				: 0;

		const highPerformers = animalData.filter(
			(animal) => animal.complianceRate >= 90,
		).length;
		const needsAttention = animalData.filter(
			(animal) => animal.complianceRate < 80,
		).length;

		return {
			totalScheduled,
			totalCompleted,
			averageCompliance,
			highPerformers,
			needsAttention,
		};
	}, [animalData]);

	if (isLoading) {
		return <WidgetSkeletons.List title="Animal Activity" />;
	}

	if (error || !animalData) {
		throw new Error(error?.message || "Failed to load animal activity data");
	}

	if (rankedAnimals.length === 0) {
		return (
			<div className="flex h-64 items-center justify-center text-center">
				<div>
					<p className="text-muted-foreground">No animals found</p>
					<p className="text-muted-foreground text-sm">
						Add animals to track their activity
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Summary Stats */}
			{summaryStats && (
				<div className="grid grid-cols-3 gap-3 text-center">
					<div className="rounded-lg bg-muted/30 p-2">
						<div className="font-bold text-lg">
							{summaryStats.averageCompliance}%
						</div>
						<p className="text-muted-foreground text-xs">Avg Compliance</p>
					</div>
					<div className="rounded-lg bg-green-50 p-2 dark:bg-green-950/20">
						<div className="font-bold text-green-600 text-lg">
							{summaryStats.highPerformers}
						</div>
						<p className="text-muted-foreground text-xs">High Performers</p>
					</div>
					<div className="rounded-lg bg-red-50 p-2 dark:bg-red-950/20">
						<div className="font-bold text-lg text-red-600">
							{summaryStats.needsAttention}
						</div>
						<p className="text-muted-foreground text-xs">Need Attention</p>
					</div>
				</div>
			)}

			{/* Animal List */}
			<div
				className={`space-y-3 ${isFullscreen ? "max-h-96 overflow-y-auto" : "max-h-64 overflow-y-auto"}`}
			>
				{rankedAnimals.map((animal) => (
					<div
						key={animal.id}
						className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-accent"
					>
						{/* Ranking */}
						<div className="flex flex-col items-center gap-1">
							<div
								className={`flex h-6 w-6 items-center justify-center rounded-full font-bold text-xs ${
									animal.rank === 1
										? "bg-yellow-500 text-white"
										: animal.rank === 2
											? "bg-gray-400 text-white"
											: animal.rank === 3
												? "bg-orange-500 text-white"
												: "bg-muted text-muted-foreground"
								}`}
							>
								{animal.rank}
							</div>
						</div>

						{/* Avatar */}
						<AnimalAvatar
							animal={{
								id: animal.id,
								name: animal.name,
								species: animal.species,
								avatar: animal.avatar,
								pendingMeds: 0, // Not used in this context
							}}
							size="sm"
						/>

						{/* Animal Info */}
						<div className="flex-1 space-y-1">
							<div className="flex items-center justify-between">
								<h4 className="font-medium">{animal.name}</h4>
								<Badge variant={animal.complianceBadgeVariant}>
									{animal.complianceRate}%
								</Badge>
							</div>

							<div className="flex items-center gap-2">
								<p className="text-muted-foreground text-sm">
									{animal.completed} of {animal.scheduled} doses
								</p>
								{animal.scheduled > 0 && (
									<Progress
										value={animal.complianceRate}
										className="h-2 flex-1"
									/>
								)}
							</div>
						</div>
					</div>
				))}
			</div>

			{/* Period Summary */}
			{summaryStats && (
				<div className="rounded-lg bg-muted/30 p-3">
					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground">Total Activity</span>
						<span className="font-medium">
							{summaryStats.totalCompleted} / {summaryStats.totalScheduled}{" "}
							doses
						</span>
					</div>
					{summaryStats.totalScheduled > 0 && (
						<Progress
							value={
								(summaryStats.totalCompleted / summaryStats.totalScheduled) *
								100
							}
							className="mt-2 h-2"
						/>
					)}
				</div>
			)}
		</div>
	);
}

export function AnimalActivityWidget(props: AnimalActivityWidgetProps) {
	return (
		<WidgetErrorBoundary widgetName="Animal Activity">
			<AnimalActivityWidgetContent {...props} />
		</WidgetErrorBoundary>
	);
}
