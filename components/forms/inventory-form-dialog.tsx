"use client";

import { AddItemModal } from "@/components/inventory/add-item-modal";
import { useInventoryForm } from "@/hooks/forms/useInventoryForm";

/**
 * Inventory form dialog component that manages its own state
 *
 * This component provides a complete inventory form dialog with state management,
 * validation, and saving functionality.
 */
export function InventoryFormDialog() {
  const { isOpen, closeForm, saveForm } = useInventoryForm({
    autoClose: true,
    showSuccessToast: true,
  });

  return (
    <AddItemModal onAdd={saveForm} onOpenChange={closeForm} open={isOpen} />
  );
}

/**
 * Hook that provides inventory form controls and state
 *
 * This hook can be used by components that need to trigger the inventory form
 * or check its state.
 */
export function useInventoryFormDialog() {
  const { openForm, isOpen, isLoading } = useInventoryForm();

  return {
    isFormLoading: isLoading,
    isFormOpen: isOpen,
    openInventoryForm: () => openForm(),
  };
}
