"use client";

import type { InventoryItem } from "./inventory-card";

// Minimal stub for assign modal
export interface AssignModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  inventoryItem?: InventoryItem | null;
  onAssign?: (itemId: string, animalId: string | null) => Promise<void>;
}

export function AssignModal({
  open,
  onOpenChange,
  inventoryItem,
  onAssign,
}: AssignModalProps) {
  return null; // Placeholder - coming soon
}

export default AssignModal;
