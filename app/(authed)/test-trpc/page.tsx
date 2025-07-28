"use client";

import { trpc } from "@/server/trpc/client";
import { useState } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function TestTRPCPage() {
	const [householdId] = useState("123e4567-e89b-12d3-a456-426614174000"); // Mock household ID
	const [animalName, setAnimalName] = useState("");
	const [species, setSpecies] = useState("");

	// Fetch animals using tRPC
	const {
		data: animals,
		isLoading,
		refetch,
	} = trpc.animal.list.useQuery({
		householdId,
		includeDeleted: false,
	});

	// Create animal mutation
	const createAnimalMutation = trpc.animal.create.useMutation({
		onSuccess: () => {
			// Refetch the list after creating
			refetch();
			setAnimalName("");
			setSpecies("");
		},
		onError: (error) => {
			console.error("Error creating animal:", error);
		},
	});

	const handleCreateAnimal = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!animalName || !species) return;

		await createAnimalMutation.mutate({
			householdId,
			name: animalName,
			species: species,
		});
	};

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-3xl font-bold">Test tRPC Connection</h1>
				<p className="text-muted-foreground">
					This page demonstrates tRPC + Drizzle integration
				</p>
			</div>

			{/* Create Animal Form */}
			<Card>
				<CardHeader>
					<CardTitle>Add New Animal</CardTitle>
					<CardDescription>Test the create mutation</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleCreateAnimal} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="name">Animal Name</Label>
							<Input
								id="name"
								value={animalName}
								onChange={(e) => setAnimalName(e.target.value)}
								placeholder="e.g., Buddy"
								required
							/>
						</div>
						<div className="space-y-2">
							<Label htmlFor="species">Species</Label>
							<Input
								id="species"
								value={species}
								onChange={(e) => setSpecies(e.target.value)}
								placeholder="e.g., Dog, Cat"
								required
							/>
						</div>
						<Button type="submit" disabled={createAnimalMutation.isPending}>
							{createAnimalMutation.isPending ? "Creating..." : "Create Animal"}
						</Button>
					</form>
				</CardContent>
			</Card>

			{/* Animals List */}
			<Card>
				<CardHeader>
					<CardTitle>Animals in Household</CardTitle>
					<CardDescription>Household ID: {householdId}</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<p>Loading animals...</p>
					) : animals && animals.length > 0 ? (
						<ul className="space-y-2">
							{animals.map((animal) => (
								<li key={animal.id} className="p-2 border rounded">
									<strong>{animal.name}</strong> - {animal.species}
									{animal.breed && ` (${animal.breed})`}
								</li>
							))}
						</ul>
					) : (
						<p className="text-muted-foreground">
							No animals found. Try creating one above!
						</p>
					)}
				</CardContent>
			</Card>

			{/* Connection Status */}
			<Card>
				<CardHeader>
					<CardTitle>Connection Status</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="space-y-2 text-sm">
						<p>✅ tRPC Client Connected</p>
						<p>✅ React Query Provider Active</p>
						<p>
							{animals !== undefined ? "✅" : "❌"} Data Fetching{" "}
							{animals !== undefined ? "Working" : "Not Working"}
						</p>
						<p>
							{createAnimalMutation.isSuccess ? "✅" : "⏳"} Mutations{" "}
							{createAnimalMutation.isSuccess ? "Working" : "Not Tested"}
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
