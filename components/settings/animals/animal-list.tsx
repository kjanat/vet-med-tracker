"use client";

import { FileText, Plus, Search } from "lucide-react";
import { useState } from "react";
import { AnimalAvatar } from "@/components/ui/animal-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Animal } from "@/lib/types";
import { AnimalForm } from "./animal-form";

// Mock data - replace with tRPC
const mockAnimals: Animal[] = [
	{
		id: "1",
		name: "Buddy",
		species: "Dog",
		breed: "Golden Retriever",
		sex: "Male",
		neutered: true,
		dob: new Date("2020-03-15"),
		weightKg: 32,
		microchipId: "123456789012345",
		color: "Golden",
		timezone: "America/New_York",
		vetName: "Dr. Smith",
		vetPhone: "(555) 123-4567",
		allergies: ["Chicken", "Beef"],
		conditions: ["Hip Dysplasia"],
		avatar: undefined,
		pendingMeds: 2,
	},
	{
		id: "2",
		name: "Whiskers",
		species: "Cat",
		breed: "Maine Coon",
		sex: "Female",
		neutered: true,
		dob: new Date("2019-07-22"),
		weightKg: 5.5,
		timezone: "America/New_York",
		vetName: "Dr. Johnson",
		vetPhone: "(555) 987-6543",
		allergies: [],
		conditions: ["Diabetes"],
		avatar: undefined,
		pendingMeds: 1,
	},
];

export function AnimalList() {
	const [searchQuery, setSearchQuery] = useState("");
	const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null);
	const [isFormOpen, setIsFormOpen] = useState(false);

	const filteredAnimals = mockAnimals.filter((animal) =>
		animal.name.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	const handleEdit = (animal: Animal) => {
		setEditingAnimal(animal);
		setIsFormOpen(true);
	};

	const handleCreate = () => {
		setEditingAnimal(null);
		setIsFormOpen(true);
	};

	const handleSave = async (data: Partial<Animal>) => {
		console.log("Saving animal:", data);

		// Fire instrumentation event
		window.dispatchEvent(
			new CustomEvent(
				editingAnimal ? "settings_animals_update" : "settings_animals_create",
				{
					detail: { animalId: editingAnimal?.id, name: data.name },
				},
			),
		);

		// TODO: tRPC mutation
		// if (editingAnimal) {
		//   await updateAnimal.mutateAsync({ id: editingAnimal.id, ...data })
		// } else {
		//   await createAnimal.mutateAsync({ householdId, ...data })
		// }

		setIsFormOpen(false);
		setEditingAnimal(null);

		// Show success toast
		console.log(`${editingAnimal ? "Updated" : "Created"} ${data.name}`);
	};

	const handleEmergencyCard = (animalId: string) => {
		window.open(`/manage/animals/${animalId}/emergency`, "_blank");
	};

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

			{/* Animals Grid */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
				{filteredAnimals.map((animal) => (
					<Card key={animal.id} className="transition-shadow hover:shadow-md">
						<CardHeader className="pb-3">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<AnimalAvatar animal={animal} size="lg" showBadge />
									<div>
										<CardTitle className="text-lg">{animal.name}</CardTitle>
										<p className="text-muted-foreground text-sm">
											{animal.breed
												? `${animal.breed} ${animal.species}`
												: animal.species}
										</p>
									</div>
								</div>
							</div>
						</CardHeader>

						<CardContent className="flex flex-1 flex-col space-y-3">
							<div className="grid grid-cols-2 gap-2 text-sm">
								{animal.sex && (
									<div>
										<span className="font-medium">Sex:</span> {animal.sex}
										{animal.neutered && " (Neutered)"}
									</div>
								)}
								{animal.weightKg && (
									<div>
										<span className="font-medium">Weight:</span>{" "}
										{animal.weightKg}kg
									</div>
								)}
								{animal.dob && (
									<div>
										<span className="font-medium">Age:</span>{" "}
										{Math.floor(
											(Date.now() - animal.dob.getTime()) /
												(365.25 * 24 * 60 * 60 * 1000),
										)}{" "}
										years
									</div>
								)}
							</div>

							{animal.conditions.length > 0 && (
								<div>
									<p className="mb-1 font-medium text-sm">Conditions:</p>
									<div className="flex flex-wrap gap-1">
										{animal.conditions.map((condition) => (
											<Badge
												key={condition}
												variant="secondary"
												className="text-xs"
											>
												{condition}
											</Badge>
										))}
									</div>
								</div>
							)}

							{animal.allergies.length > 0 && (
								<div>
									<p className="mb-1 font-medium text-sm">Allergies:</p>
									<div className="flex flex-wrap gap-1">
										{animal.allergies.map((allergy) => (
											<Badge
												key={allergy}
												variant="destructive"
												className="text-xs"
											>
												{allergy}
											</Badge>
										))}
									</div>
								</div>
							)}

							<div className="mt-auto flex gap-2 pt-2">
								<Button
									variant="outline"
									size="sm"
									onClick={() => handleEdit(animal)}
									className="flex-1"
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
									Emergency Card
								</Button>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

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
