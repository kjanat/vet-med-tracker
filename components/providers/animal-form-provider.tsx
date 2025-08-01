"use client";

import type React from "react";
import { createContext, useContext, useState } from "react";
import { AnimalForm } from "@/components/settings/animals/animal-form";
import type { Animal } from "@/components/settings/animals/animal-list";

interface AnimalFormContextValue {
	openForm: (animal?: Animal | null) => void;
	closeForm: () => void;
	isOpen: boolean;
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

	const openForm = (animal?: Animal | null) => {
		setEditingAnimal(animal || null);
		setIsOpen(true);
	};

	const closeForm = () => {
		setIsOpen(false);
		setEditingAnimal(null);
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

		closeForm();

		// Show success toast
		console.log(`${editingAnimal ? "Updated" : "Created"} ${data.name}`);
	};

	const contextValue: AnimalFormContextValue = {
		openForm,
		closeForm,
		isOpen,
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
