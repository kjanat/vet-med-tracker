"use client";

// Minimal stub for inventory card
export interface InventoryItem {
  id: string;
  name: string;
  brand?: string;
  genericName: string;
  strength?: string;
  route: "ORAL" | "TOPICAL" | "INJECTABLE" | "OTHER";
  form:
    | "TABLET"
    | "CAPSULE"
    | "LIQUID"
    | "CREAM"
    | "PATCH"
    | "INJECTION"
    | "OTHER";
  expiresOn: Date;
  unitsRemaining: number;
  unitsTotal: number;
  lot?: string;
  storage?: "ROOM" | "FRIDGE" | "FREEZER" | "CONTROLLED";
  inUse?: boolean;
  assignedAnimalId?: string;
  catalogId?: string;
  assignedAnimalName?: string;
  medicationId?: string;
}

export interface InventoryCardProps {
  item?: InventoryItem;
  daysLeft?: number | null;
  onEdit?: () => void;
  onDelete?: () => void;
  onAssign?: () => void;
  onDetails?: () => void;
  onUseThis?: () => Promise<void>;
}

export function InventoryCard({
  item,
  onEdit,
  onDelete,
  onAssign,
}: InventoryCardProps) {
  return (
    <div className="rounded border p-4">
      <h3>{item?.name || "Inventory Item"}</h3>
      <p>
        Quantity: {item?.unitsRemaining || 0} / {item?.unitsTotal || 0}
      </p>
      <div className="mt-2 flex gap-2">
        <button className="text-blue-500" onClick={onEdit} type="button">
          Edit
        </button>
        <button className="text-green-500" onClick={onAssign} type="button">
          Assign
        </button>
        <button className="text-red-500" onClick={onDelete} type="button">
          Delete
        </button>
      </div>
    </div>
  );
}

export default InventoryCard;
