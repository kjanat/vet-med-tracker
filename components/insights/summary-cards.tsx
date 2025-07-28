"use client";

import { useState, useEffect } from "react";
import { TrendingUp, Target, Award, AlertTriangle } from "lucide-react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AnimalAvatar } from "@/components/ui/animal-avatar";
import { useApp } from "@/components/providers/app-provider";
import { useRouter } from "next/navigation";

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

// Mock data - replace with tRPC
const mockComplianceData: ComplianceData[] = [
	{
		animalId: "1",
		animalName: "Buddy",
		adherencePct: 92,
		scheduled: 60,
		completed: 55,
		missed: 3,
		late: 2,
		veryLate: 0,
	},
	{
		animalId: "2",
		animalName: "Whiskers",
		adherencePct: 87,
		scheduled: 56,
		completed: 49,
		missed: 4,
		late: 3,
		veryLate: 0,
	},
	{
		animalId: "3",
		animalName: "Charlie",
		adherencePct: 95,
		scheduled: 28,
		completed: 27,
		missed: 1,
		late: 0,
		veryLate: 0,
	},
];

export function SummaryCards({ range }: SummaryCardsProps) {
	const [complianceData, setComplianceData] = useState<ComplianceData[]>([]);
	const [householdStreak, setHouseholdStreak] = useState(0);
	const { animals } = useApp();
	const router = useRouter();

	useEffect(() => {
		// TODO: Replace with tRPC query
		// const data = await insights.compliance.query({
		//   householdId,
		//   range: { from: range.from, to: range.to }
		// })

		setComplianceData(mockComplianceData);
		setHouseholdStreak(7); // Mock streak

		// Fire instrumentation event
		window.dispatchEvent(
			new CustomEvent("insights_view", {
				detail: { range },
			}),
		);
	}, [range]);

	const handleCardClick = (filter: string) => {
		// Deep-link to History with filters
		const params = new URLSearchParams({
			from: range.from.toISOString().split("T")[0],
			to: range.to.toISOString().split("T")[0],
			...filter.split("&").reduce(
				(acc, param) => {
					const [key, value] = param.split("=");
					acc[key] = value;
					return acc;
				},
				{} as Record<string, string>,
			),
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
					<div className="text-2xl font-bold">{householdStreak} days</div>
					<p className="text-xs text-muted-foreground">
						No missed scheduled doses
					</p>
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
					<div className="text-2xl font-bold">{householdAdherence}%</div>
					<p className="text-xs text-muted-foreground">
						{householdTotals.completed} of {householdTotals.scheduled} doses
					</p>
				</CardContent>
			</Card>

			{/* Best Performer */}
			<Card
				className="cursor-pointer hover:shadow-md transition-shadow"
				onClick={() =>
					handleCardClick(`animalId=${sortedAnimals[0]?.animalId}`)
				}
			>
				<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
					<CardTitle className="text-sm font-medium">Top Performer</CardTitle>
					<Award className="h-4 w-4 text-muted-foreground" />
				</CardHeader>
				<CardContent>
					{sortedAnimals[0] && (
						<div className="flex items-center gap-2">
							<AnimalAvatar
								animal={
									animals.find((a) => a.id === sortedAnimals[0].animalId)!
								}
								size="sm"
							/>
							<div>
								<div className="font-bold">{sortedAnimals[0].animalName}</div>
								<div className="text-sm text-muted-foreground">
									{sortedAnimals[0].adherencePct}% adherence
								</div>
							</div>
						</div>
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
					<div className="text-2xl font-bold">{householdTotals.missed}</div>
					<p className="text-xs text-muted-foreground">
						Missed doses this period
					</p>
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
					<div className="space-y-3">
						{sortedAnimals.map((animal, index) => {
							const animalData = animals.find((a) => a.id === animal.animalId);
							if (!animalData) return null;

							return (
								<div
									key={animal.animalId}
									className="flex items-center justify-between p-3 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
									onClick={() => handleCardClick(`animalId=${animal.animalId}`)}
								>
									<div className="flex items-center gap-3">
										<div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
											{index + 1}
										</div>
										<AnimalAvatar animal={animalData} size="sm" />
										<div>
											<div className="font-medium">{animal.animalName}</div>
											<div className="text-sm text-muted-foreground">
												{animal.completed} of {animal.scheduled} doses
											</div>
										</div>
									</div>

									<div className="flex items-center gap-2">
										<Badge
											variant={
												animal.adherencePct >= 90
													? "default"
													: animal.adherencePct >= 80
														? "secondary"
														: "destructive"
											}
										>
											{animal.adherencePct}%
										</Badge>
										{animal.missed > 0 && (
											<Badge variant="outline" className="text-orange-600">
												{animal.missed} missed
											</Badge>
										)}
									</div>
								</div>
							);
						})}
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
