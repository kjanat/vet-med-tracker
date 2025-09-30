"use client";

import type * as React from "react";
import { BulkSelectionCheckbox } from "@/components/ui/bulk-selection-checkbox";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils/general";

interface BulkSelectionTableProps {
  children: React.ReactNode;
  selectedItems: Set<string>;
  totalItems: number;
  onSelectAll: (checked: boolean) => void;
  onSelectItem: (id: string, checked: boolean) => void;
  className?: string;
}

export function BulkSelectionTable({
  children,
  selectedItems,
  totalItems,
  onSelectAll,
  className,
}: BulkSelectionTableProps) {
  const allSelected = selectedItems.size === totalItems && totalItems > 0;
  const someSelected =
    selectedItems.size > 0 && selectedItems.size < totalItems;
  const checkedState = allSelected
    ? true
    : someSelected
      ? "indeterminate"
      : false;

  return (
    <div className={cn("relative", className)}>
      <div className="mb-4">
        <BulkSelectionCheckbox
          checked={checkedState}
          label={`${selectedItems.size} of ${totalItems} selected`}
          onCheckedChange={onSelectAll}
        />
      </div>
      {children}
    </div>
  );
}

interface BulkSelectionRowProps {
  id: string;
  isSelected: boolean;
  onSelect: (id: string, checked: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export function BulkSelectionRow({
  id,
  isSelected,
  onSelect,
  children,
  className,
}: BulkSelectionRowProps) {
  return (
    <div className={cn("flex items-center space-x-2", className)}>
      <Checkbox
        checked={isSelected}
        id={`select-${id}`}
        onCheckedChange={(checked) => onSelect(id, checked as boolean)}
      />
      <div className="flex-1">{children}</div>
    </div>
  );
}
