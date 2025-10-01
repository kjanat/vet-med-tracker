"use client";

import type { InventoryItem } from "./inventory-card.tsx";

// Minimal stub for assign modal
export interface AssignModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  inventoryItem?: InventoryItem | null;
  onAssign?: (itemId: string, animalId: string | null) => Promise<void>;
}

export function AssignModal(_props: AssignModalProps) {
  return null; // Placeholder - coming soon
}

export default AssignModal;
