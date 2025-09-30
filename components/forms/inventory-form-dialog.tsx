"use client";

import { useState } from "react";

// Minimal stub for inventory form dialog
export interface InventoryFormDialogProps {
  onClose?: () => void;
  isOpen?: boolean;
}

export function InventoryFormDialog({
  onClose,
  isOpen,
}: InventoryFormDialogProps) {
  return null; // Placeholder - coming soon
}

export function useInventoryFormDialog() {
  const [isOpen, setIsOpen] = useState(false);

  return {
    closeDialog: () => setIsOpen(false),
    isOpen,
    openDialog: () => setIsOpen(true),
  };
}

export default InventoryFormDialog;
