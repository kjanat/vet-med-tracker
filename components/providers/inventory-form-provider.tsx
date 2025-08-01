"use client";

import type React from "react";
import { createContext, useContext, useState } from "react";
import { AddItemModal } from "@/components/inventory/add-item-modal";
import type { InventoryFormData } from "@/lib/schemas/inventory";
import { trpc } from "@/server/trpc/client";
import { useApp } from "./app-provider";

interface InventoryFormContextType {
	isOpen: boolean;
	openForm: () => void;
	closeForm: () => void;
}

const InventoryFormContext = createContext<
	InventoryFormContextType | undefined
>(undefined);

export function useInventoryForm(): InventoryFormContextType {
	const context = useContext(InventoryFormContext);
	if (!context) {
		throw new Error(
			"useInventoryForm must be used within InventoryFormProvider",
		);
	}
	return context;
}

interface InventoryFormProviderProps {
	children: React.ReactNode;
}

export function InventoryFormProvider({
	children,
}: InventoryFormProviderProps) {
	const [isOpen, setIsOpen] = useState(false);
	const { selectedHousehold } = useApp();
	const utils = trpc.useUtils();

	// Create inventory item mutation
	const createMutation = trpc.inventory.create.useMutation({
		onSuccess: () => {
			// Invalidate and refetch
			utils.inventory.list.invalidate();
		},
	});

	// Set in use mutation
	const setInUseMutation = trpc.inventory.setInUse.useMutation({
		onSuccess: () => {
			// Invalidate and refetch
			utils.inventory.list.invalidate();
		},
	});

	const openForm = () => setIsOpen(true);
	const closeForm = () => setIsOpen(false);

	const handleAddItem = async (data: InventoryFormData) => {
		if (!selectedHousehold?.id) {
			console.error("No household selected!");
			return;
		}

		console.log("Adding item with household:", {
			id: selectedHousehold.id,
			name: selectedHousehold.name,
			data: data,
		});

		if (!data.medicationId) {
			console.error("No medication selected!");
			throw new Error("Please select a medication");
		}

		const payload = {
			householdId: selectedHousehold.id,
			medicationId: data.medicationId,
			brandOverride: data.brand || undefined, // Convert empty string to undefined
			lot: data.lot || undefined, // Convert empty string to undefined
			expiresOn: data.expiresOn ? new Date(data.expiresOn) : new Date(),
			storage: data.storage as "ROOM" | "FRIDGE" | "FREEZER" | "CONTROLLED",
			unitsTotal: data.quantityUnits,
			unitsRemaining: data.unitsRemaining,
			unitType: "units", // TODO: Add unit type to form
			notes: undefined, // TODO: Add notes to form
			assignedAnimalId: data.assignedAnimalId || undefined, // Convert empty string to undefined
		};

		try {
			const result = await createMutation.mutateAsync(payload);

			// If setInUse is true and an animal is assigned, call the setInUse mutation
			if (data.setInUse && data.assignedAnimalId && result?.id) {
				await setInUseMutation.mutateAsync({
					id: result.id,
					householdId: selectedHousehold.id,
					inUse: true,
				});
			}

			// Show success toast
			console.log(`Added ${data.name} (expires ${data.expiresOn})`);
		} catch (error) {
			// TODO: Implement inventory.create mutation for offline queue
			console.error("Failed to add item:", error);
			throw error;
		}
	};

	return (
		<InventoryFormContext.Provider value={{ isOpen, openForm, closeForm }}>
			{children}
			<AddItemModal
				open={isOpen}
				onOpenChange={setIsOpen}
				onAdd={async (data) => {
					await handleAddItem(data);
					closeForm();
				}}
			/>
		</InventoryFormContext.Provider>
	);
}
