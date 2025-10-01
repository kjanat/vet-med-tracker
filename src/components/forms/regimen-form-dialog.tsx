"use client";

import { useState } from "react";

// Minimal stub for regimen form dialog
export interface RegimenFormDialogProps {
  onClose?: () => void;
  isOpen?: boolean;
  animalId?: string;
}

export function RegimenFormDialog({
  onClose: _onClose,
  isOpen: _isOpen,
  animalId: _animalId,
}: RegimenFormDialogProps) {
  return null; // Placeholder - coming soon
}

export function useRegimenFormDialog() {
  const [isOpen, setIsOpen] = useState(false);

  return {
    closeDialog: () => setIsOpen(false),
    isOpen,
    openDialog: () => setIsOpen(true),
  };
}

export default RegimenFormDialog;
