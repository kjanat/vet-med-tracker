"use client";

import { format } from "date-fns";
import { AlertTriangle, Archive, Clock, Plus } from "lucide-react";
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
import { RegimenForm } from "./regimen-form";

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
	timesLocal?: string[]; // ["08:00", "20:00"]
	startDate?: Date;
	endDate?: Date;
	cutoffMins: number;
	highRisk: boolean;
	isActive: boolean;
	createdAt: Date;
}

// Mock data - replace with tRPC
const mockRegimens: Regimen[] = [
	{
		id: "1",
		animalId: "1",
		animalName: "Buddy",
		medicationName: "Rimadyl",
		medicationId: "rimadyl-75mg",
		route: "Oral",
		form: "Tablet",
		strength: "75mg",
		scheduleType: "FIXED",
		timesLocal: ["08:00", "20:00"],
		startDate: new Date("2024-01-01"),
		endDate: new Date("2024-02-01"),
		cutoffMins: 60,
		highRisk: false,
		isActive: true,
		createdAt: new Date("2024-01-01"),
	},
	{
		id: "2",
		animalId: "2",
		animalName: "Whiskers",
		medicationName: "Insulin",
		medicationId: "insulin-40iu",
		route: "Subcutaneous",
		form: "Injection",
		strength: "2 units",
		scheduleType: "FIXED",
		timesLocal: ["07:00", "19:00"],
		cutoffMins: 30,
		highRisk: true,
		isActive: true,
		createdAt: new Date("2024-01-01"),
	},
	{
		id: "3",
		animalId: "1",
		animalName: "Buddy",
		medicationName: "Pain Relief",
		medicationId: "pain-relief-5ml",
		route: "Oral",
		form: "Liquid",
		strength: "5ml",
		scheduleType: "PRN",
		cutoffMins: 240,
		highRisk: false,
		isActive: true,
		createdAt: new Date("2024-01-01"),
	},
];

export function RegimenList() {
	const [selectedAnimalId, setSelectedAnimalId] = useState<string>("all");
	const [editingRegimen, setEditingRegimen] = useState<Regimen | null>(null);
	const [isFormOpen, setIsFormOpen] = useState(false);
	const { animals } = useApp();

	const filteredRegimens = mockRegimens.filter((regimen) => {
		if (selectedAnimalId === "all") return regimen.isActive;
		return regimen.animalId === selectedAnimalId && regimen.isActive;
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

		// TODO: tRPC mutation
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

		// Fire instrumentation event
		window.dispatchEvent(
			new CustomEvent("settings_regimens_archive", {
				detail: { regimenId },
			}),
		);

		// TODO: tRPC mutation
		// await archiveRegimen.mutateAsync({ id: regimenId })

		console.log("Regimen archived");
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Regimens</h1>
					<p className="text-muted-foreground">
						Manage medication schedules and treatment plans
					</p>
				</div>
				<Button onClick={handleCreate} className="gap-2">
					<Plus className="h-4 w-4" />
					Add Regimen
				</Button>
			</div>

			{/* Animal Filter */}
			<div className="flex items-center gap-4">
				<Select value={selectedAnimalId} onValueChange={setSelectedAnimalId}>
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
			</div>

			{/* Regimens by Animal */}
			<div className="space-y-6">
				{Object.entries(groupedRegimens).map(([animalId, regimens]) => {
					const animal = animals.find((a) => a.id === animalId);
					if (!animal) return null;

					return (
						<div key={animalId} className="space-y-3">
							<div className="flex items-center gap-3">
								<AnimalAvatar animal={animal} size="md" />
								<div>
									<h3 className="text-lg font-semibold">{animal.name}</h3>
									<p className="text-sm text-muted-foreground">
										{regimens.length} active regimens
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
									/>
								))}
							</div>
						</div>
					);
				})}

				{Object.keys(groupedRegimens).length === 0 && (
					<div className="text-center py-12">
						<Clock className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
						<h3 className="text-lg font-medium mb-2">No regimens found</h3>
						<p className="text-muted-foreground">
							{selectedAnimalId === "all"
								? "Create your first medication regimen to get started"
								: `No regimens for ${animals.find((a) => a.id === selectedAnimalId)?.name}`}
						</p>
					</div>
				)}
			</div>

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
}: {
	regimen: Regimen;
	onEdit: () => void;
	onArchive: () => void;
}) {
	return (
		<Card className="hover:shadow-md transition-shadow">
			<CardHeader className="pb-3">
				<div className="flex items-start justify-between">
					<div>
						<CardTitle className="text-base">
							{regimen.medicationName}
						</CardTitle>
						<p className="text-sm text-muted-foreground">
							{regimen.strength} • {regimen.route}
						</p>
					</div>
					<div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center">
						{regimen.highRisk && (
							<Badge
								variant="destructive"
								className="text-xs whitespace-nowrap"
							>
								<AlertTriangle className="h-3 w-3 mr-1" />
								High-risk
							</Badge>
						)}
						<Badge
							variant={
								regimen.scheduleType === "FIXED" ? "default" : "secondary"
							}
							className="text-xs whitespace-nowrap"
						>
							{regimen.scheduleType}
						</Badge>
					</div>
				</div>
			</CardHeader>

			<CardContent className="space-y-3">
				{regimen.scheduleType === "FIXED" && regimen.timesLocal && (
					<div>
						<p className="text-sm font-medium mb-1">Schedule:</p>
						<div className="flex flex-wrap gap-1">
							{regimen.timesLocal.map((time) => (
								<Badge key={time} variant="outline" className="text-xs">
									{format(new Date(`2000-01-01T${time}`), "h:mm a")}
								</Badge>
							))}
						</div>
					</div>
				)}

				<div className="text-sm text-muted-foreground">
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
						onClick={onArchive}
						className="gap-1 bg-transparent"
					>
						<Archive className="h-3 w-3" />
						Archive
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
