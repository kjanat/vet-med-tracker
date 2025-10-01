"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils/general";

interface BulkSelectionCheckboxProps {
  checked: boolean | "indeterminate";
  onCheckedChange: (checked: boolean) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
}

export function BulkSelectionCheckbox({
  checked,
  onCheckedChange,
  label = "Select all",
  className,
  disabled = false,
}: BulkSelectionCheckboxProps) {
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Checkbox
        checked={checked}
        disabled={disabled}
        id="bulk-select-all"
        onCheckedChange={onCheckedChange}
      />
      <label
        className="font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        htmlFor="bulk-select-all"
      >
        {label}
      </label>
    </div>
  );
}
