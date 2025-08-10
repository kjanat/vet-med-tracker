"use client";

import { useBulkSelection } from "@/components/providers/bulk-selection-provider";
import { Checkbox } from "@/components/ui/checkbox";

interface SelectAllCheckboxProps {
	"aria-label"?: string;
}

export function SelectAllCheckbox({
	"aria-label": ariaLabel = "Select all items",
}: SelectAllCheckboxProps) {
	const {
		isAllSelected,
		isPartiallySelected,
		selectAll,
		clearSelection,
		availableIds,
	} = useBulkSelection();

	const handleCheckedChange = () => {
		if (isAllSelected) {
			clearSelection();
		} else {
			selectAll();
		}
	};

	// Don't render if there are no available items
	if (availableIds.length === 0) {
		return null;
	}

	return (
		<Checkbox
			checked={
				isAllSelected ? true : isPartiallySelected ? "indeterminate" : false
			}
			onCheckedChange={handleCheckedChange}
			aria-label={ariaLabel}
		/>
	);
}
