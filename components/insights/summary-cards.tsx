"use client";

import { AlertTriangle, Award, Target, TrendingUp } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { useApp } from "@/components/providers/app-provider";
import { AnimalAvatar } from "@/components/ui/animal-avatar";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/server/trpc/client";

interface ComplianceData {
	animalId: string;
	animalName: string;
	adherencePct: number;
	scheduled: number;
	completed: number;
	missed: number;
	late: number;
	veryLate: number;
}

interface SummaryCardsProps {
	range: { from: Date; to: Date };
}

export function SummaryCards({ range }: SummaryCardsProps) {
	const { animals, selectedHousehold } = useApp();
	const router = useRouter();

	// Fetch administration data for the selected date range
	const { data: adminData, isLoading } = trpc.admin.list.useQuery(
		{
			householdId: selectedHousehold?.id || "",
			startDate: range.from.toISOString(),
			endDate: range.to.toISOString(),
		},
		{
			enabled: !!selectedHousehold?.id,
		},
	);

	// Calculate compliance data from real administration records
	const complianceData: ComplianceData[] = useMemo(() => {
		if (!adminData || !animals.length) return [];

		return animals.map((animal) => {
			const animalRecords = adminData.filter(
				(record) => record.animalId === animal.id,
			);

			const scheduled = animalRecords.filter((r) => r.status !== "PRN").length;
			const completed = animalRecords.filter(
				(r) =>
					r.status === "ON_TIME" ||
					r.status === "LATE" ||
					r.status === "VERY_LATE",
			).length;
			const missed = animalRecords.filter((r) => r.status === "MISSED").length;
			const late = animalRecords.filter((r) => r.status === "LATE").length;
			const veryLate = animalRecords.filter(
				(r) => r.status === "VERY_LATE",
			).length;

			const adherencePct =
				scheduled > 0 ? Math.round((completed / scheduled) * 100) : 100;

			return {
				animalId: animal.id,
				animalName: animal.name,
				adherencePct,
				scheduled,
				completed,
				missed,
				late,
				veryLate,
			};
		});
	}, [adminData, animals]);

	// Calculate household streak (consecutive days without missed doses)
	const householdStreak = useMemo(() => {
		if (!adminData || adminData.length === 0) return null; // Return null for no data

		// TODO: Implement proper streak calculation based on missed doses by day
		// For now, return a simple calculation
		const missedCount = adminData.filter((r) => r.status === "MISSED").length;
		return missedCount === 0 ? 7 : Math.max(0, 7 - missedCount);
	}, [adminData]);

	// Fire instrumentation event
	useMemo(() => {
		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("insights_view", {
					detail: { range },
				}),
			);
		}
	}, [range]);

	const handleCardClick = (filter: string) => {
		// Deep-link to History with filters
		const params = new URLSearchParams();
		params.set("from", range.from.toISOString().split("T")[0] || "");
		params.set("to", range.to.toISOString().split("T")[0] || "");

		filter.split("&").forEach((param) => {
			const [key, value] = param.split("=");
			if (key && value) {
				params.set(key, value);
			}
		});

		router.push(`/history?${params.toString()}`);
	};

	// Calculate household totals
	const householdTotals = complianceData.reduce(
		(acc, animal) => ({
			scheduled: acc.scheduled + animal.scheduled,
			completed: acc.completed + animal.completed,
			missed: acc.missed + animal.missed,
			late: acc.late + animal.late,
		}),
		{ scheduled: 0, completed: 0, missed: 0, late: 0 },
	);

	const householdAdherence =
		householdTotals.scheduled > 0
			? Math.round(
					(householdTotals.completed / householdTotals.scheduled) * 100,
				)
			: 0;

	// Sort animals by adherence for leaderboard
	const sortedAnimals = [...complianceData].sort(
		(a, b) => b.adherencePct - a.adherencePct,
	);

	// Show loading state
	if (isLoading) {
		return (
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				{/* Loading placeholders */}
				{["compliance", "medications", "alerts", "trends"].map((cardType) => (
					<Card key={`loading-${cardType}`}>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<div className="h-4 w-24 bg-muted rounded animate-pulse"></div>
							<div className="h-4 w-4 bg-muted rounded animate-pulse"></div>
						</CardHeader>
						<CardContent>
							<div className="h-8 w-16 bg-muted rounded animate-pulse mb-2"></div>
							<div className="h-3 w-20 bg-muted rounded animate-pulse"></div>
						</CardContent>
					</Card>
				))}
			</div>
		);
	}

	// Show empty state if no household selected
	if (!selectedHousehold) {
		return (
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<Card className="md:col-span-2 lg:col-span-4">
					<CardContent className="flex items-center justify-center py-8">
						<p className="text-muted-foreground">
							Please select a household to view insights
						</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Check if we have any data to show
	const hasData = adminData && adminData.length > 0;
	const hasAnimals = animals && animals.length > 0;

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			{/* Household Streak */}
			<Card
				className="cursor-pointer hover:shadow-md transition-shadow"
				onClick={() => handleCardClick("type=scheduled")}
			>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">
						Household Streak
					</CardTitle>
					<TrendingUp className="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					{hasData ? (
						<>
							<div className="text-2xl font-bold">{householdStreak} days</div>
							<p className="text-xs text-muted-foreground">
								No missed scheduled doses
							</p>
						</>
					) : (
						<>
							<div className="text-2xl font-bold">—</div>
							<p className="text-xs text-muted-foreground">
								No doses recorded yet
							</p>
						</>
					)}
				</CardContent>
			</Card>

			{/* Overall Compliance */}
			<Card
				className="cursor-pointer hover:shadow-md transition-shadow"
				onClick={() => handleCardClick("type=all")}
			>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">
						Overall Compliance
					</CardTitle>
					<Target className="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					{householdTotals.scheduled > 0 ? (
						<>
							<div className="text-2xl font-bold">{householdAdherence}%</div>
							<p className="text-xs text-muted-foreground">
								{householdTotals.completed} of {householdTotals.scheduled} doses
							</p>
						</>
					) : (
						<>
							<div className="text-2xl font-bold">—</div>
							<p className="text-xs text-muted-foreground">
								No scheduled doses yet
							</p>
						</>
					)}
				</CardContent>
			</Card>

			{/* Best Performer */}
			<Card
				className="cursor-pointer hover:shadow-md transition-shadow"
				onClick={() =>
					sortedAnimals[0]
						? handleCardClick(`animalId=${sortedAnimals[0].animalId}`)
						: undefined
				}
			>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">Top Performer</CardTitle>
					<Award className="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					{sortedAnimals.length > 0 && hasData ? (
						<div className="flex items-center gap-2">
							{(() => {
								const topPerformer = sortedAnimals[0];
								if (!topPerformer) return null;
								const topAnimal = animals.find(
									(a) => a.id === topPerformer.animalId,
								);
								return topAnimal ? (
									<AnimalAvatar animal={topAnimal} size="sm" />
								) : null;
							})()}
							<div>
								<div className="font-bold">
									{sortedAnimals[0]?.animalName || "—"}
								</div>
								<div className="text-sm text-muted-foreground">
									{sortedAnimals[0]?.adherencePct || 0}% adherence
								</div>
							</div>
						</div>
					) : !hasAnimals ? (
						<>
							<div className="text-2xl font-bold">—</div>
							<p className="text-xs text-muted-foreground">
								Add animals to track
							</p>
						</>
					) : (
						<>
							<div className="text-2xl font-bold">—</div>
							<p className="text-xs text-muted-foreground">
								No doses recorded yet
							</p>
						</>
					)}
				</CardContent>
			</Card>

			{/* Needs Attention */}
			<Card
				className="cursor-pointer hover:shadow-md transition-shadow"
				onClick={() => handleCardClick("status=missed")}
			>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">Needs Attention</CardTitle>
					<AlertTriangle className="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					{hasData ? (
						<>
							<div className="text-2xl font-bold">{householdTotals.missed}</div>
							<p className="text-xs text-muted-foreground">
								Missed doses this period
							</p>
						</>
					) : (
						<>
							<div className="text-2xl font-bold">—</div>
							<p className="text-xs text-muted-foreground">
								No doses to track yet
							</p>
						</>
					)}
				</CardContent>
			</Card>

			{/* Animal Leaderboard */}
			<Card className="md:col-span-2 lg:col-span-4">
				<CardHeader>
					<CardTitle className="text-lg">
						This Month&apos;s Leaderboard
					</CardTitle>
					<CardDescription>Compliance by animal</CardDescription>
				</CardHeader>
				<CardContent>
					{!hasAnimals ? (
						<div className="text-center py-8">
							<p className="text-muted-foreground">
								Add animals to start tracking medication compliance
							</p>
						</div>
					) : !hasData ? (
						<div className="text-center py-8">
							<p className="text-muted-foreground">
								Record doses to see compliance rankings
							</p>
						</div>
					) : (
						<div className="space-y-3">
							{sortedAnimals.map((animal, index) => {
								const animalData = animals.find(
									(a) => a.id === animal.animalId,
								);
								if (!animalData) return null;

								return (
									<button
										type="button"
										key={animal.animalId}
										className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors gap-3 w-full text-left"
										onClick={() =>
											handleCardClick(`animalId=${animal.animalId}`)
										}
									>
										{/* Left side: Position, avatar, and animal info */}
										<div className="flex items-center gap-3 min-w-0">
											<div className="flex flex-col items-center gap-2 sm:flex-row">
												<div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-bold shrink-0">
													{index + 1}
												</div>
												<AnimalAvatar animal={animalData} size="sm" />
											</div>
											<div className="min-w-0">
												<div className="font-medium truncate">
													{animal.animalName}
												</div>
												<div className="text-sm text-muted-foreground truncate">
													{animal.completed} of {animal.scheduled} doses
												</div>
											</div>
										</div>

										{/* Right side: Badges stacked vertically */}
										<div className="flex flex-col gap-1 items-end shrink-0 sm:flex-row sm:items-center sm:gap-2">
											<Badge
												variant={
													animal.adherencePct >= 90
														? "default"
														: animal.adherencePct >= 80
															? "secondary"
															: "destructive"
												}
												className="w-fit"
											>
												{animal.adherencePct}%
											</Badge>
											{animal.missed > 0 && (
												<Badge
													variant="outline"
													className="text-orange-600 whitespace-nowrap w-fit"
												>
													{animal.missed} missed
												</Badge>
											)}
										</div>
									</button>
								);
							})}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
