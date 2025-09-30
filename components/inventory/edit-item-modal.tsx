"use client";

import type { InventoryItem } from "./inventory-card";

// Minimal stub for edit item modal
export interface EditItemData {
  brandOverride?: string;
  lot?: string;
  expiresOn: string;
  storage?: "ROOM" | "FRIDGE" | "FREEZER" | "CONTROLLED";
  unitsRemaining: number;
  notes?: string;
}

export interface EditItemModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  onOpenChange?: (open: boolean) => undefined | false;
  item?: InventoryItem | null;
  onSave?: (id: string, data: EditItemData) => Promise<void>;
}

export function EditItemModal(_props: EditItemModalProps) {
  return null; // Placeholder - coming soon
}

export default EditItemModal;
