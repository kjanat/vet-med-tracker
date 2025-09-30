"use client";

// Minimal stub for add item button
export interface AddItemButtonProps {
  onClick?: () => void;
  disabled?: boolean;
}

export function AddItemButton({ onClick, disabled }: AddItemButtonProps) {
  return (
    <button
      className="rounded bg-blue-500 px-4 py-2 text-white"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      Add Item
    </button>
  );
}

export default AddItemButton;
