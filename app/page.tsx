"use client";

import { AlertTriangle, Calendar, CheckCircle, Clock } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { AnimalAvatar } from "@/components/ui/animal-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { RecordButton } from "@/components/ui/record-button";
// import { trpc } from '@/trpc/server';
// import { ClientGreeting } from './client-greeting';

export default function HomePage() {
	const { selectedAnimal, animals } = useApp();

	const nextActions = [
		{
			id: "1",
			animal: "Buddy",
			medication: "Rimadyl 75mg",
			dueTime: "2:00 PM",
			status: "due",
			route: "Oral",
		},
		{
			id: "2",
			animal: "Whiskers",
			medication: "Insulin 2 units",
			dueTime: "1:30 PM",
			status: "overdue",
			route: "Subcutaneous",
		},
		{
			id: "3",
			animal: "Luna",
			medication: "Thyroid medication",
			dueTime: "6:00 PM",
			status: "upcoming",
			route: "Oral",
		},
	];

	const todayStats = {
		completed: 5,
		total: 8,
		compliance: 85,
	};

	if (selectedAnimal) {
		return <SingleAnimalView animal={selectedAnimal} />;
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 className="text-3xl font-bold">Dashboard</h1>
					<p className="text-muted-foreground">
						Managing {animals.length} animals across all households
					</p>
				</div>
				<RecordButton prefilled className="w-full sm:w-auto" />
			</div>

			{/* Main content with flexible ordering */}
			<div className="flex flex-col gap-6 md:flex-col">
				{/* Next Actions - shows first on mobile, second on desktop */}
				<Card className="order-1 md:order-2">
					<CardHeader>
						<CardTitle>Next Actions</CardTitle>
						<CardDescription>
							Medications due soon, sorted by priority
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{nextActions.map((action) => (
							<div
								key={action.id}
								className="flex items-center gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
							>
								{/* Avatar */}
								<AnimalAvatar
									animal={animals.find((a) => a.name === action.animal)!}
									size="md"
								/>

								{/* Main content - grows to fill space */}
								<div className="flex-1 min-w-0">
									<div className="flex items-start justify-between gap-2 mb-1">
										<div className="font-medium truncate">
											{action.animal} - {action.medication}
										</div>
										<Badge
											variant={
												action.status === "overdue"
													? "destructive"
													: action.status === "due"
														? "default"
														: "secondary"
											}
											className="shrink-0"
										>
											{action.status}
										</Badge>
									</div>
									<div className="text-sm text-muted-foreground">
										{action.route} &bull; Due {action.dueTime}
									</div>
								</div>

								{/* Action button - fixed width on desktop */}
								<Button size="sm" className="shrink-0 w-20">
									Record
								</Button>
							</div>
						))}
					</CardContent>
				</Card>

				{/* Today's Summary - shows second on mobile, first on desktop */}
				<div className="grid gap-4 md:grid-cols-3 order-2 md:order-1">
					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								Today&apos;s Progress
							</CardTitle>
							<CheckCircle className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{todayStats.completed}/{todayStats.total}
							</div>
							<p className="text-xs text-muted-foreground">
								medications completed
							</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								Compliance Rate
							</CardTitle>
							<Calendar className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">{todayStats.compliance}%</div>
							<p className="text-xs text-muted-foreground">this week</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
							<CardTitle className="text-sm font-medium">
								Pending Actions
							</CardTitle>
							<AlertTriangle className="h-4 w-4 text-muted-foreground" />
						</CardHeader>
						<CardContent>
							<div className="text-2xl font-bold">
								{animals.reduce((sum, animal) => sum + animal.pendingMeds, 0)}
							</div>
							<p className="text-xs text-muted-foreground">medications due</p>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}

interface Animal {
	id: string;
	name: string;
	species: string;
	breed?: string;
	pendingMeds: number;
	avatar?: string;
}

function SingleAnimalView({ animal }: { animal: Animal }) {
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<AnimalAvatar animal={animal} size="lg" showBadge />
				<div>
					<h1 className="text-3xl font-bold">{animal.name}</h1>
					<p className="text-muted-foreground">{animal.species}</p>
				</div>
			</div>

			<div className="grid gap-6 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Next Due</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<div className="font-medium">Rimadyl 75mg</div>
							<div className="text-sm text-muted-foreground">
								Due in 2 hours (2:00 PM)
							</div>
							<RecordButton className="w-full mt-4" />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Active Regimens</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="space-y-2">
							<div className="flex justify-between">
								<span>Pain Management</span>
								<CheckCircle className="h-4 w-4 text-green-500" />
							</div>
							<div className="flex justify-between">
								<span>Antibiotics</span>
								<Clock className="h-4 w-4 text-yellow-500" />
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
