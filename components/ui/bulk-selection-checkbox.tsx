"use client";

import { useBulkSelection } from "@/components/providers/bulk-selection-provider";
import { Checkbox } from "@/components/ui/checkbox";

interface BulkSelectionCheckboxProps {
	id: string;
	"aria-label"?: string;
}

export function BulkSelectionCheckbox({
	id,
	"aria-label": ariaLabel,
}: BulkSelectionCheckboxProps) {
	const { isSelected, toggle } = useBulkSelection();

	const checked = isSelected(id);

	return (
		<Checkbox
			checked={checked}
			onCheckedChange={() => toggle(id)}
			aria-label={ariaLabel || `Select item ${id}`}
		/>
	);
}
