"use client";

import type React from "react";
import { createContext, useContext, useState } from "react";
import { AnimalForm } from "@/components/settings/animals/animal-form";
import { useToast } from "@/hooks/shared/use-toast";
import type { Animal } from "@/lib/utils/types";
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

	// Helper function to validate form data
	const validateFormData = (data: Partial<Animal>): boolean => {
		if (!selectedHousehold) {
			toast({
				title: "Error",
				description: "No household selected",
				variant: "destructive",
			});
			return false;
		}

		if (!editingAnimal && (!data.name || !data.species)) {
			toast({
				title: "Error",
				description: "Name and species are required",
				variant: "destructive",
			});
			return false;
		}

		return true;
	};

	// Helper function to fire instrumentation events
	const fireInstrumentationEvent = (data: Partial<Animal>) => {
		const eventType = editingAnimal
			? "settings_animals_update"
			: "settings_animals_create";
		window.dispatchEvent(
			new CustomEvent(eventType, {
				detail: { animalId: editingAnimal?.id, name: data.name },
			}),
		);
	};

	// Helper function to transform data for API calls
	const transformAnimalData = (data: Partial<Animal>) => {
		return {
			...data,
			dob: data.dob ? data.dob.toISOString() : undefined,
			weightKg: data.weightKg,
		};
	};

	// Helper function to handle animal updates
	const handleUpdateAnimal = async (data: Partial<Animal>) => {
		if (!editingAnimal) return;

		await updateAnimal.mutateAsync({
			id: editingAnimal.id,
			...transformAnimalData(data),
		});

		toast({
			title: "Success",
			description: `Updated ${data.name}`,
		});
	};

	// Helper function to handle animal creation
	const handleCreateAnimal = async (data: Partial<Animal>) => {
		const name = data.name as string;
		const species = data.species as string;

		await createAnimal.mutateAsync({
			...transformAnimalData(data),
			name,
			species,
			allergies: data.allergies || [],
			conditions: data.conditions || [],
			timezone: data.timezone || BROWSER_ZONE || "America/New_York",
		});

		toast({
			title: "Success",
			description: `Created ${name}`,
		});
	};

	// Helper function to handle save errors
	const handleSaveError = (error: unknown, data: Partial<Animal>) => {
		console.error("Error saving animal:", error);
		const action = editingAnimal ? "update" : "create";
		toast({
			title: "Error",
			description: `Failed to ${action} ${data.name || "animal"}`,
			variant: "destructive",
		});
	};

	const handleSave = async (data: Partial<Animal>) => {
		if (!validateFormData(data)) {
			return;
		}

		try {
			fireInstrumentationEvent(data);

			if (editingAnimal) {
				await handleUpdateAnimal(data);
			} else {
				await handleCreateAnimal(data);
			}

			closeForm();
		} catch (error) {
			handleSaveError(error, data);
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
