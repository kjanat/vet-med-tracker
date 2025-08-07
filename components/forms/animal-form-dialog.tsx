"use client";

import { AnimalForm } from "@/components/settings/animals/animal-form";
import { useAnimalForm } from "@/hooks/forms/useAnimalForm";
import type { Animal } from "@/lib/utils/types";

/**
 * Animal form dialog component that manages its own state
 *
 * This component provides a complete animal form dialog with state management,
 * validation, and saving functionality.
 */
export function AnimalFormDialog() {
	const { isOpen, editingAnimal, closeForm, saveForm } = useAnimalForm({
		showSuccessToast: true,
		autoClose: true,
	});

	return (
		<AnimalForm
			animal={editingAnimal}
			open={isOpen}
			onOpenChange={closeForm}
			onSave={saveForm}
		/>
	);
}

/**
 * Hook that provides animal form controls and state
 *
 * This hook can be used by components that need to trigger the animal form
 * or check its state.
 */
export function useAnimalFormDialog() {
	const { openForm, isOpen, isLoading } = useAnimalForm();

	return {
		openAnimalForm: (animal?: Animal | null) => openForm(animal),
		isFormOpen: isOpen,
		isFormLoading: isLoading,
	};
}
