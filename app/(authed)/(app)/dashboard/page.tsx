"use client";

import { AlertTriangle, Calendar, CheckCircle, Clock } from "lucide-react";
import { useMemo } from "react";
import { useAnimalForm } from "@/components/providers/animal-form-provider";
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
import type { Animal } from "@/lib/types";
import { trpc } from "@/server/trpc/client";
import { formatTimeLocal } from "@/utils/tz";

export default function DashboardPage() {
	const { selectedAnimal, animals, selectedHousehold, households } = useApp();
	const { openForm } = useAnimalForm();

	// Fetch due regimens
	const { data: dueRegimens, isLoading } = trpc.regimen.listDue.useQuery(
		{
			householdId: selectedHousehold?.id,
			includeUpcoming: true,
		},
		{
			enabled: !!selectedHousehold?.id,
			refetchInterval: 60000,
		},
	);

	// Fetch today's administrations
	const today = new Date().toISOString().split("T")[0];
	const { data: todayAdmins } = trpc.admin.list.useQuery(
		{
			householdId: selectedHousehold?.id || "",
			startDate: `${today}T00:00:00.000Z`,
			endDate: `${today}T23:59:59.999Z`,
		},
		{
			enabled: !!selectedHousehold?.id,
		},
	);

	// Calculate next actions
	const nextActions = useMemo(() => {
		if (!dueRegimens) return [];
		return dueRegimens
			.filter((r) => r.section === "due" || r.section === "later")
			.slice(0, 3)
			.map((regimen) => ({
				id: regimen.id,
				animal: regimen.animalName,
				medication: `${regimen.medicationName} ${regimen.strength}`,
				dueTime: regimen.targetTime
					? formatTimeLocal(new Date(regimen.targetTime), "America/New_York")
					: "As needed",
				status: regimen.isOverdue
					? ("overdue" as const)
					: regimen.section === "due"
						? ("due" as const)
						: ("upcoming" as const),
				route: regimen.route,
			}));
	}, [dueRegimens]);

	// Calculate stats
	const todayStats = useMemo(() => {
		if (!todayAdmins || !dueRegimens) {
			return { completed: 0, total: 0, compliance: 0 };
		}
		const completed = todayAdmins.length;
		const totalScheduled = dueRegimens.filter((r) => !r.isPRN).length;
		const total = Math.max(completed, totalScheduled);
		const compliance = total > 0 ? Math.round((completed / total) * 100) : 100;
		return { completed, total, compliance };
	}, [todayAdmins, dueRegimens]);

	// Check if households are still being loaded
	const householdsLoading = households.length === 0 && !selectedHousehold;

	// Loading state
	if ((isLoading && !dueRegimens) || householdsLoading) {
		return (
			<div className="space-y-6">
				<p className="text-muted-foreground">Loading...</p>
			</div>
		);
	}

	// No household (only show after households have loaded)
	if (!selectedHousehold && households.length > 0) {
		return (
			<div className="space-y-6">
				<p className="text-muted-foreground">
					Please select a household to view your dashboard
				</p>
			</div>
		);
	}

	// No animals
	if (animals.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center px-4 py-16 text-center">
				<div className="max-w-md">
					<h1 className="mb-4 font-bold text-3xl">Welcome to VetMed Tracker</h1>
					<p className="mb-8 text-lg text-muted-foreground">
						{
							"Taking care of your pets' health starts here. Add your first pet to begin tracking their medications and health regimens."
						}
					</p>
					<Button
						size="lg"
						className="w-full sm:w-auto"
						onClick={() => openForm()}
					>
						Add Your First Pet
					</Button>
				</div>
			</div>
		);
	}

	// Single animal view
	if (selectedAnimal) {
		// Convert minimal animal to full Animal type for SingleAnimalView
		const fullAnimal = {
			...selectedAnimal,
			timezone: "America/New_York", // Default timezone
			allergies: [],
			conditions: [],
		};
		return <SingleAnimalView animal={fullAnimal} />;
	}

	// All animals dashboard
	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<p className="text-muted-foreground">
					Managing {animals.length} animals across all households
				</p>
				<RecordButton prefilled className="w-full sm:w-auto" />
			</div>

			{/* Stats Cards */}
			<div className="grid gap-4 md:grid-cols-3">
				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">
							{"Today's Progress"}
						</CardTitle>
						<CheckCircle className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">
							{todayStats.completed}/{todayStats.total}
						</div>
						<p className="text-muted-foreground text-xs">
							medications completed
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">
							Compliance Rate
						</CardTitle>
						<Calendar className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">{todayStats.compliance}%</div>
						<p className="text-muted-foreground text-xs">this week</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
						<CardTitle className="font-medium text-sm">
							Pending Actions
						</CardTitle>
						<AlertTriangle className="h-4 w-4 text-muted-foreground" />
					</CardHeader>
					<CardContent>
						<div className="font-bold text-2xl">
							{animals.reduce((sum, animal) => sum + animal.pendingMeds, 0)}
						</div>
						<p className="text-muted-foreground text-xs">medications due</p>
					</CardContent>
				</Card>
			</div>

			{/* Next Actions */}
			<Card>
				<CardHeader>
					<CardTitle>Next Actions</CardTitle>
					<CardDescription>
						Medications due soon, sorted by priority
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					{nextActions.length === 0 ? (
						<div className="py-8 text-center text-muted-foreground">
							<CheckCircle className="mx-auto mb-4 h-12 w-12 opacity-50" />
							<p>{"No medications due right now!"}</p>
							<p className="text-sm">
								Check back later or record PRN medications
							</p>
						</div>
					) : (
						nextActions.map((action) => {
							const foundAnimal = animals.find((a) => a.name === action.animal);
							return (
								<div
									key={action.id}
									className="flex items-center gap-3 rounded-lg border p-4 transition-colors hover:bg-muted/50"
								>
									{foundAnimal && (
										<AnimalAvatar animal={foundAnimal} size="md" />
									)}
									<div className="min-w-0 flex-1">
										<div className="mb-1 flex items-start justify-between gap-2">
											<div className="truncate font-medium">
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
										<div className="text-muted-foreground text-sm">
											{action.route} • Due {action.dueTime}
										</div>
									</div>
									<Button
										size="sm"
										className="w-20 shrink-0"
										onClick={() => {
											window.location.href = `/admin/record?regimenId=${action.id}&from=home`;
										}}
									>
										Record
									</Button>
								</div>
							);
						})
					)}
				</CardContent>
			</Card>
		</div>
	);
}

function SingleAnimalView({ animal }: { animal: Animal }) {
	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<AnimalAvatar animal={animal} size="lg" showBadge />
				<div>
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
							<div className="text-muted-foreground text-sm">
								Due in 2 hours (2:00 PM)
							</div>
							<RecordButton className="mt-4 w-full" />
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
