"use client";

import type React from "react";
import { createContext, useContext, useState } from "react";
import {
	type AddItemData,
	AddItemModal,
} from "@/components/inventory/add-item-modal";
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

	const openForm = () => setIsOpen(true);
	const closeForm = () => setIsOpen(false);

	const handleAddItem = async (data: AddItemData) => {
		if (!selectedHousehold?.id) return;

		// For now, use a dummy medication ID until we implement medication catalog search
		// TODO: Implement medication catalog search/create
		const medicationId = crypto.randomUUID();

		const payload = {
			householdId: selectedHousehold.id,
			medicationId,
			brandOverride: data.brand,
			lot: data.lot,
			expiresOn: data.expiresOn ? new Date(data.expiresOn) : new Date(),
			storage: data.storage as "ROOM" | "FRIDGE" | "FREEZER" | "CONTROLLED",
			unitsTotal: data.quantityUnits,
			unitType: "units", // TODO: Add unit type to form
			notes: undefined, // TODO: Add notes to form
		};

		try {
			await createMutation.mutateAsync(payload);
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
