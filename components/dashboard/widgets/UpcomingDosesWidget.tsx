"use client";

import { Calendar, Clock, Pill } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useUpcomingDoses } from "@/hooks/dashboard/useDashboardData";
import { WidgetErrorBoundary } from "./WidgetErrorBoundary";
import { WidgetSkeletons } from "./WidgetSkeletons";

interface UpcomingDosesWidgetProps {
	isFullscreen?: boolean;
	className?: string;
}

function UpcomingDosesWidgetContent({
	isFullscreen = false,
}: UpcomingDosesWidgetProps) {
	const { data: upcomingData, isLoading, error } = useUpcomingDoses();

	// Process data for better visualization
	const processedData = useMemo(() => {
		if (!upcomingData) return null;

		// Group by animal for better organization
		const animalGroups = upcomingData.upcomingDoses.reduce(
			(acc, dose) => {
				if (!acc[dose.animalName]) {
					acc[dose.animalName] = [];
				}
				acc[dose.animalName]?.push(dose);
				return acc;
			},
			{} as Record<string, typeof upcomingData.upcomingDoses>,
		);

		// Calculate daily dose distribution (mock data for visualization)
		const dailyDoses = Array.from({ length: 7 }).map((_, index) => {
			const date = new Date();
			date.setDate(date.getDate() + index);

			// Simulate dose distribution throughout the week
			const baseDoses = Math.floor(upcomingData.totalUpcomingDoses / 7);
			const variation = Math.floor(Math.random() * baseDoses * 0.3);
			const dailyCount = baseDoses + (index % 2 === 0 ? variation : -variation);

			return {
				date: date.toISOString().split("T")[0],
				dayName: date.toLocaleDateString("en-US", { weekday: "short" }),
				fullDate: date.toLocaleDateString("en-US", {
					month: "short",
					day: "numeric",
				}),
				count: Math.max(0, dailyCount),
				isToday: index === 0,
			};
		});

		const maxDailyDoses = Math.max(...dailyDoses.map((d) => d.count));

		return {
			animalGroups,
			dailyDoses,
			maxDailyDoses,
			...upcomingData,
		};
	}, [upcomingData]);

	// Calculate schedule types distribution
	const scheduleTypesStats = useMemo(() => {
		if (!upcomingData) return null;

		const types = upcomingData.upcomingDoses.reduce(
			(acc, dose) => {
				acc[dose.scheduleType] =
					(acc[dose.scheduleType] || 0) + dose.dosesThisWeek;
				return acc;
			},
			{} as Record<string, number>,
		);

		return Object.entries(types)
			.map(([type, count]) => ({ type, count }))
			.sort((a, b) => b.count - a.count);
	}, [upcomingData]);

	if (isLoading) {
		return <WidgetSkeletons.Calendar title="Upcoming Doses" />;
	}

	if (error || !processedData) {
		throw new Error(error?.message || "Failed to load upcoming doses");
	}

	if (processedData.totalUpcomingDoses === 0) {
		return (
			<div className="flex h-64 items-center justify-center text-center">
				<div>
					<Calendar className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
					<p className="text-muted-foreground">No upcoming doses</p>
					<p className="text-muted-foreground text-sm">
						All regimens are up to date
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Summary Stats */}
			<div className="grid grid-cols-3 gap-3 text-center">
				<div className="rounded-lg bg-blue-50 p-3 dark:bg-blue-950/20">
					<div className="font-bold text-blue-600 text-xl">
						{processedData.totalUpcomingDoses}
					</div>
					<p className="text-muted-foreground text-sm">This Week</p>
				</div>
				<div className="rounded-lg bg-green-50 p-3 dark:bg-green-950/20">
					<div className="font-bold text-green-600 text-xl">
						{processedData.activeRegimens}
					</div>
					<p className="text-muted-foreground text-sm">Active Regimens</p>
				</div>
				<div className="rounded-lg bg-purple-50 p-3 dark:bg-purple-950/20">
					<div className="font-bold text-purple-600 text-xl">
						{Object.keys(processedData.animalGroups).length}
					</div>
					<p className="text-muted-foreground text-sm">Animals</p>
				</div>
			</div>

			{/* Daily Distribution */}
			<div className="space-y-2">
				<h4 className="flex items-center gap-2 font-medium text-sm">
					<Clock className="h-4 w-4" />
					This Week&apos;s Schedule
				</h4>

				<div className="space-y-2">
					{processedData.dailyDoses.map((day) => (
						<div
							key={day.date}
							className={`flex items-center justify-between rounded-lg border p-2 ${
								day.isToday
									? "border-blue-200 bg-blue-50 dark:bg-blue-950/20"
									: ""
							}`}
						>
							<div className="flex items-center gap-3">
								<div className="text-center">
									<div
										className={`font-medium text-sm ${day.isToday ? "text-blue-600" : ""}`}
									>
										{day.dayName}
									</div>
									<div className="text-muted-foreground text-xs">
										{day.fullDate}
									</div>
								</div>

								<div className="flex-1">
									<Progress
										value={
											processedData.maxDailyDoses > 0
												? (day.count / processedData.maxDailyDoses) * 100
												: 0
										}
										className="h-2"
									/>
								</div>
							</div>

							<Badge
								variant={day.isToday ? "default" : "secondary"}
								className="text-xs"
							>
								{day.count}
							</Badge>
						</div>
					))}
				</div>
			</div>

			{/* Animal Groups */}
			{isFullscreen && (
				<div className="space-y-2">
					<h4 className="flex items-center gap-2 font-medium text-sm">
						<Pill className="h-4 w-4" />
						By Animal
					</h4>

					<div className="max-h-48 space-y-2 overflow-y-auto">
						{Object.entries(processedData.animalGroups).map(
							([animalName, doses]) => (
								<div key={animalName} className="rounded-lg border p-3">
									<div className="mb-2 flex items-center justify-between">
										<h5 className="font-medium">{animalName}</h5>
										<Badge variant="outline">
											{doses.reduce((sum, dose) => sum + dose.dosesThisWeek, 0)}{" "}
											doses
										</Badge>
									</div>

									<div className="space-y-1">
										{doses.map((dose) => (
											<div
												key={dose.regimenId}
												className="flex items-center justify-between text-sm"
											>
												<span className="text-muted-foreground">
													{dose.medicationName}
												</span>
												<span>{dose.dosesThisWeek}x this week</span>
											</div>
										))}
									</div>
								</div>
							),
						)}
					</div>
				</div>
			)}

			{/* Schedule Types */}
			{scheduleTypesStats && scheduleTypesStats.length > 0 && (
				<div className="rounded-lg bg-muted/30 p-3">
					<div className="flex items-center justify-between text-sm">
						<span className="text-muted-foreground">Schedule Types</span>
						<div className="flex gap-2">
							{scheduleTypesStats.map((stat) => (
								<Badge key={stat.type} variant="secondary" className="text-xs">
									{stat.type}: {stat.count}
								</Badge>
							))}
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

export function UpcomingDosesWidget(props: UpcomingDosesWidgetProps) {
	return (
		<WidgetErrorBoundary widgetName="Upcoming Doses">
			<UpcomingDosesWidgetContent {...props} />
		</WidgetErrorBoundary>
	);
}
