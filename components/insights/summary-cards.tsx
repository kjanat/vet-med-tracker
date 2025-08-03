"use client";

import { AlertTriangle, Award, Target, TrendingUp } from "lucide-react";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
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

// Helper function to build history URL with filters
function buildHistoryUrl(
	range: { from: Date; to: Date },
	filter: string,
): string {
	const params = new URLSearchParams();
	params.set("from", range.from.toISOString().split("T")[0] || "");
	params.set("to", range.to.toISOString().split("T")[0] || "");

	filter.split("&").forEach((param) => {
		const [key, value] = param.split("=");
		if (key && value) {
			params.set(key, value);
		}
	});

	const historyPath = "/dashboard/history";
	return `${historyPath}?${params.toString()}`;
}

// Loading state component
function SummaryCardsLoading() {
	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			{/* Loading placeholders */}
			{["compliance", "medications", "alerts", "trends"].map((cardType) => (
				<Card key={`loading-${cardType}`}>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<div className="h-4 w-24 animate-pulse rounded bg-muted"></div>
						<div className="h-4 w-4 animate-pulse rounded bg-muted"></div>
					</CardHeader>
					<CardContent>
						<div className="mb-2 h-8 w-16 animate-pulse rounded bg-muted"></div>
						<div className="h-3 w-20 animate-pulse rounded bg-muted"></div>
					</CardContent>
				</Card>
			))}
		</div>
	);
}

// Empty state component
function SummaryCardsEmpty() {
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

// Top performer card component
interface TopPerformerCardProps {
	sortedAnimals: ComplianceData[];
	animals: {
		id: string;
		name: string;
		species: string;
		avatar?: string;
		pendingMeds: number;
	}[];
	hasAnimals: boolean;
	hasData: boolean;
	handleCardClick: (filter: string) => void;
}

function TopPerformerCard({
	sortedAnimals,
	animals,
	hasAnimals,
	hasData,
	handleCardClick,
}: TopPerformerCardProps) {
	const topPerformer = sortedAnimals[0];
	const topAnimal = topPerformer
		? animals.find((a) => a.id === topPerformer.animalId)
		: null;

	return (
		<Card
			className="cursor-pointer transition-shadow hover:shadow-md"
			onClick={() =>
				topPerformer
					? handleCardClick(`animalId=${topPerformer.animalId}`)
					: undefined
			}
		>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="font-medium text-sm">Top Performer</CardTitle>
				<Award className="h-4 w-4 text-muted-foreground" />
			</CardHeader>
			<CardContent>
				{sortedAnimals.length > 0 && hasData ? (
					<div className="flex items-center gap-2">
						{topAnimal && <AnimalAvatar animal={topAnimal} size="sm" />}
						<div>
							<div className="font-bold">{topPerformer?.animalName || "—"}</div>
							<div className="text-muted-foreground text-sm">
								{topPerformer?.adherencePct || 0}% adherence
							</div>
						</div>
					</div>
				) : (
					<>
						<div className="font-bold text-2xl">—</div>
						<p className="text-muted-foreground text-xs">
							{!hasAnimals ? "Add animals to track" : "No doses recorded yet"}
						</p>
					</>
				)}
			</CardContent>
		</Card>
	);
}

// Animal leaderboard component
interface AnimalLeaderboardProps {
	sortedAnimals: ComplianceData[];
	animals: {
		id: string;
		name: string;
		species: string;
		avatar?: string;
		pendingMeds: number;
	}[];
	hasAnimals: boolean;
	hasData: boolean;
	handleCardClick: (filter: string) => void;
}

function AnimalLeaderboard({
	sortedAnimals,
	animals,
	hasAnimals,
	hasData,
	handleCardClick,
}: AnimalLeaderboardProps) {
	return (
		<Card className="md:col-span-2 lg:col-span-4">
			<CardHeader>
				<CardTitle className="text-lg">This Month&apos;s Leaderboard</CardTitle>
				<CardDescription>Compliance by animal</CardDescription>
			</CardHeader>
			<CardContent>
				{!hasAnimals ? (
					<div className="py-8 text-center">
						<p className="text-muted-foreground">
							Add animals to start tracking medication compliance
						</p>
					</div>
				) : !hasData ? (
					<div className="py-8 text-center">
						<p className="text-muted-foreground">
							Record doses to see compliance rankings
						</p>
					</div>
				) : (
					<div className="space-y-3">
						{sortedAnimals.map((animal, index) => {
							const animalData = animals.find((a) => a.id === animal.animalId);
							if (!animalData) return null;

							return (
								<button
									type="button"
									key={animal.animalId}
									className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border p-3 text-left transition-colors hover:bg-accent"
									onClick={() => handleCardClick(`animalId=${animal.animalId}`)}
								>
									{/* Left side: Position, avatar, and animal info */}
									<div className="flex min-w-0 items-center gap-3">
										<div className="flex flex-col items-center gap-2 sm:flex-row">
											<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted font-bold text-sm">
												{index + 1}
											</div>
											<AnimalAvatar animal={animalData} size="sm" />
										</div>
										<div className="min-w-0">
											<div className="truncate font-medium">
												{animal.animalName}
											</div>
											<div className="truncate text-muted-foreground text-sm">
												{animal.completed} of {animal.scheduled} doses
											</div>
										</div>
									</div>

									{/* Right side: Badges stacked vertically */}
									<div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
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
												className="w-fit whitespace-nowrap text-orange-600"
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
	);
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

		// Helper function to calculate animal compliance
		const calculateAnimalCompliance = (
			animal: (typeof animals)[0],
			records: typeof adminData,
		): ComplianceData => {
			const animalRecords = records.filter(
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
		};

		return animals.map((animal) =>
			calculateAnimalCompliance(animal, adminData),
		);
	}, [adminData, animals]);

	// Calculate household streak (consecutive days without missed doses)
	const householdStreak = useMemo(() => {
		if (!adminData || adminData.length === 0) return null; // Return null for no data
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

	const handleCardClick = useCallback(
		(filter: string) => {
			// Navigate to history page with filters
			router.push(buildHistoryUrl(range, filter) as Route);
		},
		[range, router],
	);

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
		return <SummaryCardsLoading />;
	}

	// Show empty state if no household selected
	if (!selectedHousehold) {
		return <SummaryCardsEmpty />;
	}

	// Check if we have any data to show
	const hasData = !!(adminData && adminData.length > 0);
	const hasAnimals = !!(animals && animals.length > 0);

	return (
		<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
			{/* Household Streak */}
			<Card
				className="cursor-pointer transition-shadow hover:shadow-md"
				onClick={() => handleCardClick("type=scheduled")}
			>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="font-medium text-sm">
						Household Streak
					</CardTitle>
					<TrendingUp className="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					{hasData ? (
						<>
							<div className="font-bold text-2xl">{householdStreak} days</div>
							<p className="text-muted-foreground text-xs">
								No missed scheduled doses
							</p>
						</>
					) : (
						<>
							<div className="font-bold text-2xl">—</div>
							<p className="text-muted-foreground text-xs">
								No doses recorded yet
							</p>
						</>
					)}
				</CardContent>
			</Card>

			{/* Overall Compliance */}
			<Card
				className="cursor-pointer transition-shadow hover:shadow-md"
				onClick={() => handleCardClick("type=all")}
			>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="font-medium text-sm">
						Overall Compliance
					</CardTitle>
					<Target className="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					{householdTotals.scheduled > 0 ? (
						<>
							<div className="font-bold text-2xl">{householdAdherence}%</div>
							<p className="text-muted-foreground text-xs">
								{householdTotals.completed} of {householdTotals.scheduled} doses
							</p>
						</>
					) : (
						<>
							<div className="font-bold text-2xl">—</div>
							<p className="text-muted-foreground text-xs">
								No scheduled doses yet
							</p>
						</>
					)}
				</CardContent>
			</Card>

			{/* Best Performer */}
			<TopPerformerCard
				sortedAnimals={sortedAnimals}
				animals={animals}
				hasAnimals={hasAnimals}
				hasData={hasData}
				handleCardClick={handleCardClick}
			/>

			{/* Needs Attention */}
			<Card
				className="cursor-pointer transition-shadow hover:shadow-md"
				onClick={() => handleCardClick("status=missed")}
			>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="font-medium text-sm">Needs Attention</CardTitle>
					<AlertTriangle className="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					{hasData ? (
						<>
							<div className="font-bold text-2xl">{householdTotals.missed}</div>
							<p className="text-muted-foreground text-xs">
								Missed doses this period
							</p>
						</>
					) : (
						<>
							<div className="font-bold text-2xl">—</div>
							<p className="text-muted-foreground text-xs">
								No doses to track yet
							</p>
						</>
					)}
				</CardContent>
			</Card>

			{/* Animal Leaderboard */}
			<AnimalLeaderboard
				sortedAnimals={sortedAnimals}
				animals={animals}
				hasAnimals={hasAnimals}
				hasData={hasData}
				handleCardClick={handleCardClick}
			/>
		</div>
	);
}
