"use client";

import { FileText, Plus, Search } from "lucide-react";
import { useState } from "react";
import { useApp } from "@/components/providers/app-provider-consolidated";
import { AnimalAvatar } from "@/components/ui/animal-avatar";
import { Badge } from "@/components/ui/badge";
import {
	type BulkSelectionColumn,
	BulkSelectionTable,
} from "@/components/ui/bulk-selection-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/shared/use-toast";
import type { Animal } from "@/lib/utils/types";
import { trpc } from "@/server/trpc/client";
import { AnimalForm } from "./animal-form";

export function BulkAnimalTable() {
	const [searchQuery, setSearchQuery] = useState("");
	const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null);
	const [isFormOpen, setIsFormOpen] = useState(false);

	const { selectedHouseholdId } = useApp();
	const { toast } = useToast();

	// Fetch animals from the database
	const {
		data: animalsData = [],
		isLoading,
		error,
	} = trpc.animal.list.useQuery(
		{ householdId: selectedHouseholdId || "" },
		{ enabled: !!selectedHouseholdId },
	);

	// Transform database animals to match Animal interface
	const animals: Animal[] = animalsData.map((animal) => ({
		id: animal.id,
		name: animal.name,
		species: animal.species,
		breed: animal.breed || undefined,
		sex: (animal.sex as "Male" | "Female") || undefined,
		neutered: animal.neutered || false,
		dob: animal.dob ? new Date(animal.dob) : undefined,
		weightKg: animal.weightKg ? Number(animal.weightKg) : undefined,
		microchipId: animal.microchipId || undefined,
		color: animal.color || undefined,
		timezone: animal.timezone,
		vetName: animal.vetName || undefined,
		vetPhone: animal.vetPhone || undefined,
		allergies: animal.allergies || [],
		conditions: animal.conditions || [],
		avatar: undefined,
		pendingMeds: 0,
	}));

	// tRPC mutations
	const utils = trpc.useUtils();
	const createAnimal = trpc.animal.create.useMutation({
		onSuccess: () => {
			utils.animal.list.invalidate();
			utils.household.getAnimals.invalidate();
		},
	});

	const updateAnimal = trpc.animal.update.useMutation({
		onSuccess: () => {
			utils.animal.list.invalidate();
			utils.household.getAnimals.invalidate();
		},
	});

	const deleteAnimal = trpc.animal.delete.useMutation({
		onSuccess: () => {
			utils.animal.list.invalidate();
			utils.household.getAnimals.invalidate();
		},
	});

	const filteredAnimals = animals.filter((animal) =>
		animal.name.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	// Define table columns
	const columns: BulkSelectionColumn<Animal>[] = [
		{
			key: "name",
			title: "Animal",
			render: (animal) => (
				<div className="flex items-center gap-3">
					<AnimalAvatar animal={animal} size="sm" showBadge />
					<div>
						<div className="font-medium">{animal.name}</div>
						<div className="text-muted-foreground text-sm">
							{animal.breed
								? `${animal.breed} ${animal.species}`
								: animal.species}
						</div>
					</div>
				</div>
			),
		},
		{
			key: "sex",
			title: "Sex/Status",
			render: (animal) => (
				<div className="text-sm">
					{animal.sex && (
						<div>
							{animal.sex}
							{animal.neutered && (
								<Badge variant="secondary" className="ml-1 text-xs">
									Neutered
								</Badge>
							)}
						</div>
					)}
				</div>
			),
		},
		{
			key: "dob",
			title: "Age",
			render: (animal) =>
				animal.dob ? (
					<div className="text-sm">
						{Math.floor(
							(Date.now() - animal.dob.getTime()) /
								(365.25 * 24 * 60 * 60 * 1000),
						)}{" "}
						years
					</div>
				) : (
					<span className="text-muted-foreground text-sm">-</span>
				),
		},
		{
			key: "weightKg",
			title: "Weight",
			render: (animal) =>
				animal.weightKg ? (
					<div className="text-sm">{animal.weightKg}kg</div>
				) : (
					<span className="text-muted-foreground text-sm">-</span>
				),
		},
		{
			key: "conditions",
			title: "Conditions",
			render: (animal) => (
				<div className="flex flex-wrap gap-1">
					{animal.conditions.length > 0 ? (
						animal.conditions.slice(0, 2).map((condition) => (
							<Badge key={condition} variant="secondary" className="text-xs">
								{condition}
							</Badge>
						))
					) : (
						<span className="text-muted-foreground text-sm">None</span>
					)}
					{animal.conditions.length > 2 && (
						<Badge variant="outline" className="text-xs">
							+{animal.conditions.length - 2}
						</Badge>
					)}
				</div>
			),
		},
		{
			key: "allergies",
			title: "Allergies",
			render: (animal) => (
				<div className="flex flex-wrap gap-1">
					{animal.allergies.length > 0 ? (
						animal.allergies.slice(0, 2).map((allergy) => (
							<Badge key={allergy} variant="destructive" className="text-xs">
								{allergy}
							</Badge>
						))
					) : (
						<span className="text-muted-foreground text-sm">None</span>
					)}
					{animal.allergies.length > 2 && (
						<Badge variant="outline" className="text-xs">
							+{animal.allergies.length - 2}
						</Badge>
					)}
				</div>
			),
		},
		{
			key: "actions",
			title: "Actions",
			render: (animal) => (
				<div className="flex gap-1">
					<Button
						variant="outline"
						size="sm"
						onClick={() => handleEdit(animal)}
						disabled={updateAnimal.isPending}
					>
						Edit
					</Button>
					<Button
						variant="outline"
						size="sm"
						onClick={() => handleEmergencyCard(animal.id)}
						className="gap-1"
					>
						<FileText className="h-3 w-3" />
					</Button>
				</div>
			),
		},
	];

	const handleEdit = (animal: Animal) => {
		setEditingAnimal(animal);
		setIsFormOpen(true);
	};

	const handleCreate = () => {
		setEditingAnimal(null);
		setIsFormOpen(true);
	};

	const prepareAnimalData = (data: Partial<Animal>) => ({
		name: data.name || "",
		species: data.species || "",
		breed: data.breed,
		sex: data.sex,
		neutered: data.neutered || false,
		dob: data.dob?.toISOString(),
		weightKg: data.weightKg,
		microchipId: data.microchipId,
		color: data.color,
		timezone: data.timezone || "America/New_York",
		vetName: data.vetName,
		vetPhone: data.vetPhone,
		allergies: data.allergies || [],
		conditions: data.conditions || [],
	});

	const handleSave = async (data: Partial<Animal>) => {
		if (!selectedHouseholdId) {
			toast({
				title: "Error",
				description: "No household selected",
				variant: "destructive",
			});
			return;
		}

		try {
			const animalData = prepareAnimalData(data);

			if (editingAnimal) {
				await updateAnimal.mutateAsync({
					id: editingAnimal.id,
					...animalData,
				});
			} else {
				await createAnimal.mutateAsync(animalData);
			}

			// Fire instrumentation event
			window.dispatchEvent(
				new CustomEvent(
					editingAnimal ? "settings_animals_update" : "settings_animals_create",
					{
						detail: { animalId: editingAnimal?.id, name: data.name },
					},
				),
			);

			toast({
				title: "Success",
				description: `${editingAnimal ? "Updated" : "Created"} ${data.name}`,
			});

			setIsFormOpen(false);
			setEditingAnimal(null);
		} catch (error) {
			console.error("Error saving animal:", error);
			toast({
				title: "Error",
				description: `Failed to ${editingAnimal ? "update" : "create"} ${data.name}`,
				variant: "destructive",
			});
		}
	};

	const handleBulkDelete = async (selectedIds: string[]) => {
		const selectedAnimals = animals.filter((animal) =>
			selectedIds.includes(animal.id),
		);

		const confirmMessage = `Are you sure you want to delete ${selectedAnimals.length} animal${
			selectedAnimals.length > 1 ? "s" : ""
		}? This action cannot be undone.

Selected animals:
${selectedAnimals.map((animal) => `• ${animal.name}`).join("\n")}`;

		if (!confirm(confirmMessage)) {
			return;
		}

		try {
			// Delete animals one by one (could be optimized with a bulk API)
			await Promise.all(
				selectedIds.map((id) => deleteAnimal.mutateAsync({ id })),
			);

			toast({
				title: "Success",
				description: `Deleted ${selectedIds.length} animal${
					selectedIds.length > 1 ? "s" : ""
				}`,
			});
		} catch (error) {
			console.error("Error deleting animals:", error);
			toast({
				title: "Error",
				description: "Failed to delete some animals",
				variant: "destructive",
			});
		}
	};

	const handleBulkExport = (selectedIds: string[]) => {
		const selectedAnimals = animals.filter((animal) =>
			selectedIds.includes(animal.id),
		);

		// Create CSV content
		const csvContent = [
			// Header
			"Name,Species,Breed,Sex,Neutered,Weight (kg),Microchip ID,Color,Timezone,Vet Name,Vet Phone,Allergies,Conditions",
			// Data rows
			...selectedAnimals.map((animal) =>
				[
					animal.name,
					animal.species,
					animal.breed || "",
					animal.sex || "",
					animal.neutered ? "Yes" : "No",
					animal.weightKg || "",
					animal.microchipId || "",
					animal.color || "",
					animal.timezone,
					animal.vetName || "",
					animal.vetPhone || "",
					animal.allergies.join("; "),
					animal.conditions.join("; "),
				].join(","),
			),
		].join("\n");

		// Download CSV
		const blob = new Blob([csvContent], { type: "text/csv" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = `animals-${new Date().toISOString().split("T")[0]}.csv`;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);

		toast({
			title: "Success",
			description: `Exported ${selectedIds.length} animal${
				selectedIds.length > 1 ? "s" : ""
			} to CSV`,
		});
	};

	const handleEmergencyCard = (animalId: string) => {
		window.open(`/manage/animals/${animalId}/emergency`, "_blank");
	};

	// Show loading state
	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="font-bold text-2xl">Animals</h2>
						<p className="text-muted-foreground">
							Manage animal profiles and medical information
						</p>
					</div>
					<Button onClick={handleCreate} className="gap-2">
						<Plus className="h-4 w-4" />
						Add Animal
					</Button>
				</div>
				<div className="flex justify-center py-8">
					<p className="text-muted-foreground">Loading animals...</p>
				</div>
			</div>
		);
	}

	// Show error state
	if (error) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="font-bold text-2xl">Animals</h2>
						<p className="text-muted-foreground">
							Manage animal profiles and medical information
						</p>
					</div>
					<Button onClick={handleCreate} className="gap-2">
						<Plus className="h-4 w-4" />
						Add Animal
					</Button>
				</div>
				<div className="flex justify-center py-8">
					<p className="text-destructive">Failed to load animals</p>
				</div>
			</div>
		);
	}

	// Show empty state
	if (!selectedHouseholdId) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h2 className="font-bold text-2xl">Animals</h2>
						<p className="text-muted-foreground">
							Manage animal profiles and medical information
						</p>
					</div>
				</div>
				<div className="flex justify-center py-8">
					<p className="text-muted-foreground">
						Please select a household first
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h2 className="font-bold text-2xl">Animals</h2>
					<p className="text-muted-foreground">
						Manage animal profiles and medical information with bulk selection
					</p>
				</div>
				<Button
					onClick={handleCreate}
					className="gap-2"
					disabled={createAnimal.isPending}
				>
					<Plus className="h-4 w-4" />
					Add Animal
				</Button>
			</div>

			{/* Search */}
			<div className="relative max-w-sm">
				<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
				<Input
					placeholder="Search animals..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="pl-10"
				/>
			</div>

			{/* Bulk Selection Table */}
			<BulkSelectionTable
				data={filteredAnimals}
				columns={columns}
				getItemId={(animal) => animal.id}
				getItemLabel={(animal) => animal.name}
				onDelete={handleBulkDelete}
				onExport={handleBulkExport}
				emptyMessage={
					searchQuery
						? "No animals found matching your search"
						: "No animals yet. Add your first animal to get started."
				}
			/>

			{/* Animal Form */}
			<AnimalForm
				animal={editingAnimal}
				open={isFormOpen}
				onOpenChange={setIsFormOpen}
				onSave={handleSave}
			/>
		</div>
	);
}
