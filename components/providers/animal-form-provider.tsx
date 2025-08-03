"use client";

import type React from "react";
import { createContext, useContext, useState } from "react";
import { AnimalForm } from "@/components/settings/animals/animal-form";
import { useToast } from "@/hooks/use-toast";
import type { Animal } from "@/lib/types";
import { trpc } from "@/server/trpc/client";
import { BROWSER_ZONE } from "@/utils/timezone-helpers";
import { useApp } from "./app-provider";

interface AnimalFormContextValue {
	openForm: (animal?: Animal | null) => void;
	closeForm: () => void;
	isOpen: boolean;
	isLoading: boolean;
}

const AnimalFormContext = createContext<AnimalFormContextValue | undefined>(
	undefined,
);

export function useAnimalForm() {
	const context = useContext(AnimalFormContext);
	if (context === undefined) {
		throw new Error("useAnimalForm must be used within an AnimalFormProvider");
	}
	return context;
}

interface AnimalFormProviderProps {
	children: React.ReactNode;
}

export function AnimalFormProvider({ children }: AnimalFormProviderProps) {
	const [isOpen, setIsOpen] = useState(false);
	const [editingAnimal, setEditingAnimal] = useState<Animal | null>(null);
	const { selectedHousehold } = useApp();
	const { toast } = useToast();
	const utils = trpc.useUtils();

	// tRPC mutations
	const createAnimal = trpc.animal.create.useMutation({
		onSuccess: () => {
			// Invalidate queries to refresh data
			utils.animal.list.invalidate();
			utils.household.getAnimals.invalidate();
		},
	});

	const updateAnimal = trpc.animal.update.useMutation({
		onSuccess: () => {
			// Invalidate queries to refresh data
			utils.animal.list.invalidate();
			utils.household.getAnimals.invalidate();
		},
	});

	const openForm = (animal?: Animal | null) => {
		setEditingAnimal(animal || null);
		setIsOpen(true);
	};

	const closeForm = () => {
		setIsOpen(false);
		setEditingAnimal(null);
	};

	const handleSave = async (data: Partial<Animal>) => {
		if (!selectedHousehold) {
			toast({
				title: "Error",
				description: "No household selected",
				variant: "destructive",
			});
			return;
		}

		// Validate required fields
		if (!editingAnimal && (!data.name || !data.species)) {
			toast({
				title: "Error",
				description: "Name and species are required",
				variant: "destructive",
			});
			return;
		}

		try {
			// Fire instrumentation event
			window.dispatchEvent(
				new CustomEvent(
					editingAnimal ? "settings_animals_update" : "settings_animals_create",
					{
						detail: { animalId: editingAnimal?.id, name: data.name },
					},
				),
			);

			if (editingAnimal) {
				// Update existing animal
				await updateAnimal.mutateAsync({
					id: editingAnimal.id,
					...data,
					// Convert dates and numbers to proper format
					dob: data.dob ? data.dob.toISOString() : undefined,
					weightKg: data.weightKg,
				});

				toast({
					title: "Success",
					description: `Updated ${data.name}`,
				});
			} else {
				// Create new animal - safe to use non-null since we validated above
				const name = data.name as string;
				const species = data.species as string;

				await createAnimal.mutateAsync({
					...data,
					name,
					species,
					// Convert dates and numbers to proper format
					dob: data.dob ? data.dob.toISOString() : undefined,
					weightKg: data.weightKg,
					// Provide defaults for required fields
					allergies: data.allergies || [],
					conditions: data.conditions || [],
					timezone: data.timezone || BROWSER_ZONE || "America/New_York",
				});

				toast({
					title: "Success",
					description: `Created ${name}`,
				});
			}

			closeForm();
		} catch (error) {
			console.error("Error saving animal:", error);
			toast({
				title: "Error",
				description: `Failed to ${editingAnimal ? "update" : "create"} ${data.name || "animal"}`,
				variant: "destructive",
			});
		}
	};

	const contextValue: AnimalFormContextValue = {
		openForm,
		closeForm,
		isOpen,
		isLoading: createAnimal.isPending || updateAnimal.isPending,
	};

	return (
		<AnimalFormContext.Provider value={contextValue}>
			{children}
			<AnimalForm
				animal={editingAnimal}
				open={isOpen}
				onOpenChange={setIsOpen}
				onSave={handleSave}
			/>
		</AnimalFormContext.Provider>
	);
}
