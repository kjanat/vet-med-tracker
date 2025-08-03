"use client";

import { format } from "date-fns";
import { AlertTriangle, Archive, Clock, Loader2, Plus } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/providers/app-provider";
import { AnimalAvatar } from "@/components/ui/animal-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";
import { RegimenForm } from "./regimen-form";

// Type for regimen data from tRPC - matches actual schema
type RegimenWithDetails = {
	regimen: {
		id: string;
		animalId: string;
		medicationId: string;
		name: string | null;
		instructions: string | null;
		scheduleType: "FIXED" | "PRN" | "INTERVAL" | "TAPER";
		timesLocal: string[] | null;
		intervalHours: number | null;
		startDate: string;
		endDate: string | null;
		prnReason: string | null;
		maxDailyDoses: number | null;
		cutoffMinutes: number;
		highRisk: boolean;
		requiresCoSign: boolean;
		active: boolean;
		pausedAt: string | null;
		pauseReason: string | null;
		dose: string | null;
		route: string | null;
		createdAt: string;
		updatedAt: string;
		deletedAt: string | null;
	};
	animal: {
		id: string;
		householdId: string;
		name: string;
		species: string;
		breed: string | null;
		sex: string | null;
		neutered: boolean;
		dob: string | null;
		weightKg: string | null;
		microchipId: string | null;
		color: string | null;
		photoUrl: string | null;
		timezone: string;
		vetName: string | null;
		vetPhone: string | null;
		vetEmail: string | null;
		clinicName: string | null;
		allergies: string[] | null;
		conditions: string[] | null;
		notes: string | null;
		createdAt: string;
		updatedAt: string;
		deletedAt: string | null;
	};
	medication: {
		id: string;
		genericName: string;
		brandName: string | null;
		strength: string | null;
		route:
			| "ORAL"
			| "SC"
			| "IM"
			| "IV"
			| "TOPICAL"
			| "OTIC"
			| "OPHTHALMIC"
			| "INHALED"
			| "RECTAL"
			| "OTHER";
		form:
			| "TABLET"
			| "CAPSULE"
			| "LIQUID"
			| "INJECTION"
			| "CREAM"
			| "OINTMENT"
			| "DROPS"
			| "SPRAY"
			| "POWDER"
			| "PATCH"
			| "OTHER";
		controlledSubstance: boolean;
		commonDosing: string | null;
		warnings: string | null;
		createdAt: string;
		updatedAt: string;
	};
};

// Interface for display
export interface Regimen {
	id: string;
	animalId: string;
	animalName: string;
	medicationName: string;
	medicationId: string;
	route: string;
	form: string;
	strength?: string;
	scheduleType: "FIXED" | "PRN";
	timesLocal?: string[];
	startDate?: Date;
	endDate?: Date;
	cutoffMins: number;
	highRisk: boolean;
	isActive: boolean;
	createdAt: Date;
	status: "active" | "ended" | "paused";
}

// Helper function to transform tRPC data to display format
function transformRegimenData(data: RegimenWithDetails[]): Regimen[] {
	const now = new Date();

	return data.map((item) => {
		const { regimen, animal, medication } = item;

		// Calculate status based on dates and pause state
		let status: "active" | "ended" | "paused" = "active";
		if (!regimen.active || regimen.pausedAt) {
			status = "paused";
		} else if (regimen.endDate && new Date(regimen.endDate) < now) {
			status = "ended";
		}

		return {
			id: regimen.id,
			animalId: animal.id,
			animalName: animal.name,
			medicationName:
				medication.genericName ||
				medication.brandName ||
				regimen.name ||
				"Unknown Medication",
			medicationId: medication.id,
			route: regimen.route || medication.route,
			form: medication.form,
			strength: medication.strength || undefined,
			scheduleType: regimen.scheduleType as "FIXED" | "PRN",
			timesLocal: regimen.timesLocal || undefined,
			startDate: new Date(regimen.startDate),
			endDate: regimen.endDate ? new Date(regimen.endDate) : undefined,
			cutoffMins: regimen.cutoffMinutes,
			highRisk: regimen.highRisk,
			isActive: regimen.active,
			createdAt: new Date(regimen.createdAt),
			status,
		};
	});
}

export function RegimenList() {
	const [selectedAnimalId, setSelectedAnimalId] = useState<string>("all");
	const [editingRegimen, setEditingRegimen] = useState<Regimen | null>(null);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const { animals, selectedHousehold } = useApp();

	// Fetch regimens using tRPC
	const {
		data: regimenData,
		isLoading,
		error,
		refetch,
	} = trpc.regimen.list.useQuery(
		{
			householdId: selectedHousehold?.id || "",
			animalId: selectedAnimalId === "all" ? undefined : selectedAnimalId,
			activeOnly: true,
		},
		{
			enabled: !!selectedHousehold?.id,
		},
	);

	// Transform and filter regimens
	const regimens = regimenData ? transformRegimenData(regimenData) : [];
	const filteredRegimens = regimens.filter((regimen) => {
		if (selectedAnimalId === "all")
			return regimen.isActive && regimen.status !== "ended";
		return (
			regimen.animalId === selectedAnimalId &&
			regimen.isActive &&
			regimen.status !== "ended"
		);
	});

	// Group by animal
	const groupedRegimens = filteredRegimens.reduce(
		(groups, regimen) => {
			const key = regimen.animalId;
			if (!groups[key]) {
				groups[key] = [];
			}
			groups[key].push(regimen);
			return groups;
		},
		{} as Record<string, Regimen[]>,
	);

	const handleEdit = (regimen: Regimen) => {
		setEditingRegimen(regimen);
		setIsFormOpen(true);
	};

	const handleCreate = () => {
		setEditingRegimen(null);
		setIsFormOpen(true);
	};

	const handleSave = async (data: Partial<Regimen>) => {
		console.log("Saving regimen:", data);
		console.log(
			"NOTE: Create/Update mutations not yet implemented in regimen router",
		);

		// Fire instrumentation event
		window.dispatchEvent(
			new CustomEvent(
				editingRegimen
					? "settings_regimens_update"
					: "settings_regimens_create",
				{
					detail: {
						regimenId: editingRegimen?.id,
						animalId: data.animalId,
						medicationName: data.medicationName,
						scheduleType: data.scheduleType,
					},
				},
			),
		);

		// TODO: Implement tRPC mutations in regimen router
		// if (editingRegimen) {
		//   await updateRegimen.mutateAsync({ id: editingRegimen.id, ...data })
		// } else {
		//   await createRegimen.mutateAsync(data)
		// }

		setIsFormOpen(false);
		setEditingRegimen(null);

		// Show success toast
		console.log(
			`${editingRegimen ? "Updated" : "Created"} regimen for ${data.medicationName}`,
		);
	};

	const handleArchive = async (regimenId: string) => {
		console.log("Archiving regimen:", regimenId);
		console.log("NOTE: Archive mutation not yet implemented in regimen router");

		// Fire instrumentation event
		window.dispatchEvent(
			new CustomEvent("settings_regimens_archive", {
				detail: { regimenId },
			}),
		);

		// TODO: Implement archive mutation in regimen router
		// await archiveRegimen.mutateAsync({ id: regimenId })

		console.log("Regimen would be archived");
	};

	// Handle pause/resume regimen
	const handleTogglePause = async (
		regimenId: string,
		currentlyActive: boolean,
	) => {
		console.log(
			`${currentlyActive ? "Pausing" : "Resuming"} regimen:`,
			regimenId,
		);
		console.log(
			"NOTE: Pause/Resume mutations not yet implemented in regimen router",
		);

		// Fire instrumentation event
		window.dispatchEvent(
			new CustomEvent(
				currentlyActive
					? "settings_regimens_pause"
					: "settings_regimens_resume",
				{
					detail: { regimenId },
				},
			),
		);

		// TODO: Implement pause/resume mutations in regimen router
		// await (currentlyActive ? pauseRegimen : resumeRegimen).mutateAsync({ id: regimenId })

		console.log(`Regimen would be ${currentlyActive ? "paused" : "resumed"}`);
	};

	// Show loading state if no household selected
	if (!selectedHousehold) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="text-center">
					<Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-50" />
					<h3 className="mb-2 font-medium text-lg">No Household Selected</h3>
					<p className="text-muted-foreground">
						Please select a household to view regimens
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="font-bold text-3xl">Regimens</h1>
					<p className="text-muted-foreground">
						Manage medication schedules and treatment plans
					</p>
				</div>
				<Button onClick={handleCreate} className="gap-2" disabled={isLoading}>
					<Plus className="h-4 w-4" />
					Add Regimen
				</Button>
			</div>

			{/* Animal Filter and Status */}
			<div className="flex items-center justify-between gap-4">
				<Select
					value={selectedAnimalId}
					onValueChange={setSelectedAnimalId}
					disabled={isLoading}
				>
					<SelectTrigger className="w-[200px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="all">All Animals</SelectItem>
						{animals.map((animal) => (
							<SelectItem key={animal.id} value={animal.id}>
								{animal.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>

				{error && (
					<div className="flex items-center gap-2 text-destructive text-sm">
						<AlertTriangle className="h-4 w-4" />
						Failed to load regimens
						<Button
							variant="outline"
							size="sm"
							onClick={() => refetch()}
							disabled={isLoading}
						>
							Retry
						</Button>
					</div>
				)}
			</div>

			{/* Loading State */}
			{isLoading && (
				<div className="flex items-center justify-center py-12">
					<Loader2 className="h-6 w-6 animate-spin" />
					<span className="ml-2">Loading regimens...</span>
				</div>
			)}

			{/* Regimens by Animal */}
			{!isLoading && (
				<div className="space-y-6">
					{Object.entries(groupedRegimens).map(([animalId, regimens]) => {
						const animal = animals.find((a) => a.id === animalId);
						if (!animal) return null;

						return (
							<div key={animalId} className="space-y-3">
								<div className="flex items-center gap-3">
									<AnimalAvatar animal={animal} size="md" />
									<div>
										<h3 className="font-semibold text-lg">{animal.name}</h3>
										<p className="text-muted-foreground text-sm">
											{regimens.length} active regimen
											{regimens.length !== 1 ? "s" : ""}
										</p>
									</div>
								</div>

								<div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
									{regimens.map((regimen) => (
										<RegimenCard
											key={regimen.id}
											regimen={regimen}
											onEdit={() => handleEdit(regimen)}
											onArchive={() => handleArchive(regimen.id)}
											onTogglePause={() =>
												handleTogglePause(regimen.id, regimen.isActive)
											}
										/>
									))}
								</div>
							</div>
						);
					})}

					{Object.keys(groupedRegimens).length === 0 && !error && (
						<div className="py-12 text-center">
							<Clock className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-50" />
							<h3 className="mb-2 font-medium text-lg">No regimens found</h3>
							<p className="text-muted-foreground">
								{selectedAnimalId === "all"
									? "Create your first medication regimen to get started"
									: `No regimens for ${animals.find((a) => a.id === selectedAnimalId)?.name}`}
							</p>
						</div>
					)}
				</div>
			)}

			{/* Regimen Form */}
			<RegimenForm
				regimen={editingRegimen}
				open={isFormOpen}
				onOpenChange={setIsFormOpen}
				onSave={handleSave}
			/>
		</div>
	);
}

function RegimenCard({
	regimen,
	onEdit,
	onArchive,
	onTogglePause,
}: {
	regimen: Regimen;
	onEdit: () => void;
	onArchive: () => void;
	onTogglePause: () => void;
}) {
	return (
		<Card className="transition-shadow hover:shadow-md">
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<div>
						<CardTitle className="text-base">
							{regimen.medicationName}
						</CardTitle>
						<p className="text-muted-foreground text-sm">
							{regimen.strength} • {regimen.route}
						</p>
					</div>
					<div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center">
						{regimen.highRisk && (
							<Badge
								variant="destructive"
								className="whitespace-nowrap text-xs"
							>
								<AlertTriangle className="mr-1 h-3 w-3" />
								High-risk
							</Badge>
						)}
						<Badge
							variant={
								regimen.scheduleType === "FIXED" ? "default" : "secondary"
							}
							className="whitespace-nowrap text-xs"
						>
							{regimen.scheduleType}
						</Badge>
						{regimen.status === "paused" && (
							<Badge variant="outline" className="whitespace-nowrap text-xs">
								Paused
							</Badge>
						)}
						{regimen.status === "ended" && (
							<Badge variant="secondary" className="whitespace-nowrap text-xs">
								Ended
							</Badge>
						)}
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-3">
				{regimen.scheduleType === "FIXED" && regimen.timesLocal && (
					<div>
						<p className="mb-1 font-medium text-sm">Schedule:</p>
						<div className="flex flex-wrap gap-1">
							{regimen.timesLocal.map((time) => (
								<Badge key={time} variant="outline" className="text-xs">
									{format(new Date(`2000-01-01T${time}`), "h:mm a")}
								</Badge>
							))}
						</div>
					</div>
				)}

				<div className="text-muted-foreground text-sm">
					<div>Cutoff: {regimen.cutoffMins} minutes</div>
					{regimen.startDate && (
						<div>
							Started: {format(regimen.startDate, "MMM d, yyyy")}
							{regimen.endDate &&
								` - ${format(regimen.endDate, "MMM d, yyyy")}`}
						</div>
					)}
				</div>

				<div className="flex gap-2 pt-2">
					<Button
						variant="outline"
						size="sm"
						onClick={onEdit}
						className="flex-1 bg-transparent"
					>
						Edit
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={onTogglePause}
						className="gap-1 bg-transparent"
						title={regimen.isActive ? "Pause regimen" : "Resume regimen"}
					>
						{regimen.isActive ? "Pause" : "Resume"}
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={onArchive}
						className="gap-1 bg-transparent"
						title="Archive regimen"
					>
						<Archive className="h-3 w-3" />
						Archive
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
