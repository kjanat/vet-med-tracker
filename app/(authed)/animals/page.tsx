"use client";

import { FileText, Plus, Search } from "lucide-react";
import { useState } from "react";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { useAnimalForm } from "@/components/providers/animal-form-provider";
import { useApp } from "@/components/providers/app-provider";
import { AnimalAvatar } from "@/components/ui/animal-avatar";
import { AnimalBreadcrumb } from "@/components/ui/animal-breadcrumb";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
	SidebarInset,
	SidebarProvider,
	SidebarTrigger,
} from "@/components/ui/sidebar";

// Welcome component for empty state
function WelcomeState() {
	const { openForm } = useAnimalForm();

	return (
		<div className="flex flex-1 items-center justify-center px-4">
			<div className="text-center max-w-md">
				<h1 className="text-4xl font-bold mb-4">Welcome!</h1>
				<p className="text-lg text-muted-foreground mb-8">
					Add your first animal to start tracking their medications and health.
				</p>
				<Button size="lg" onClick={() => openForm()} className="gap-2">
					<Plus className="h-5 w-5" />
					Add Your First Animal
				</Button>
			</div>
		</div>
	);
}

// No household selected state
function NoHouseholdState() {
	return (
		<div className="flex flex-1 items-center justify-center px-4">
			<div className="text-center max-w-md">
				<h1 className="text-3xl font-bold mb-2">Animals</h1>
				<p className="text-muted-foreground">
					Please select a household to view animals
				</p>
			</div>
		</div>
	);
}

// Animal list component
function AnimalList({
	animals,
}: {
	animals: Array<{
		id: string;
		name: string;
		species: string;
		pendingMeds: number;
	}>;
}) {
	const { openForm } = useAnimalForm();
	const [searchQuery, setSearchQuery] = useState("");

	// Filter animals based on search query
	const filteredAnimals = animals.filter((animal) =>
		animal.name.toLowerCase().includes(searchQuery.toLowerCase()),
	);

	const handleEdit = (animal: (typeof animals)[0]) => {
		// Convert minimal animal to full Animal type - in a real app, we'd fetch full animal data here
		const fullAnimal = {
			...animal,
			timezone: "America/New_York", // Default timezone
			allergies: [],
			conditions: [],
		};
		openForm(fullAnimal);
	};

	const handleEmergencyCard = (animalId: string) => {
		window.open(`/animals/${animalId}/emergency`, "_blank");
	};

	return (
		<div className="space-y-6">
			{/* Header with Add button */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Animals</h1>
					<p className="text-muted-foreground">
						Manage animal profiles and medical information
					</p>
				</div>
				<Button onClick={() => openForm()} className="gap-2">
					<Plus className="h-4 w-4" />
					Add Animal
				</Button>
			</div>

			{/* Search bar */}
			<div className="relative max-w-sm">
				<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
				<Input
					placeholder="Search animals..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="pl-10"
				/>
			</div>

			{/* Animals grid or no results message */}
			{filteredAnimals.length > 0 ? (
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
					{filteredAnimals.map((animal) => (
						<Card key={animal.id} className="hover:shadow-md transition-shadow">
							<CardHeader className="pb-3">
								<div className="flex items-center justify-between">
									<div className="flex items-center gap-3">
										<AnimalAvatar animal={animal} size="lg" showBadge />
										<div>
											<CardTitle className="text-lg">{animal.name}</CardTitle>
											<p className="text-sm text-muted-foreground">
												{animal.species}
											</p>
										</div>
									</div>
								</div>
							</CardHeader>

							<CardContent className="space-y-3 flex flex-col flex-1">
								{/* Status info */}
								<div className="grid grid-cols-2 gap-2 text-sm">
									<div>
										<span className="font-medium">Status:</span>{" "}
										{animal.pendingMeds > 0 ? (
											<span className="text-orange-600">
												{animal.pendingMeds} pending
											</span>
										) : (
											<span className="text-green-600">Up to date</span>
										)}
									</div>
								</div>

								{/* Actions */}
								<div className="flex gap-2 pt-2 mt-auto">
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
			) : (
				<div className="text-center py-12">
					<h3 className="text-lg font-medium mb-2">No animals found</h3>
					<p className="text-muted-foreground">
						Try adjusting your search terms or{" "}
						<button
							type="button"
							onClick={() => setSearchQuery("")}
							className="text-primary hover:underline"
						>
							clear the search
						</button>
						.
					</p>
				</div>
			)}
		</div>
	);
}

// Main page component
export default function AnimalsPage() {
	const { animals, selectedHousehold } = useApp();

	// Determine which content to render
	let content: React.ReactNode;
	if (!selectedHousehold) {
		content = <NoHouseholdState />;
	} else if (animals.length === 0) {
		content = <WelcomeState />;
	} else {
		content = <AnimalList animals={animals} />;
	}

	return (
		<SidebarProvider>
			<AppSidebar />
			<SidebarInset>
				<header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
					<SidebarTrigger className="-ml-1" />
					<Separator orientation="vertical" className="mr-2 h-4" />
					<AnimalBreadcrumb />
				</header>
				<div className="flex flex-1 flex-col gap-4 p-4 pt-6">{content}</div>
			</SidebarInset>
		</SidebarProvider>
	);
}
