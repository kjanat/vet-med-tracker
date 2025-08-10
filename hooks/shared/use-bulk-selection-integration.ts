"use client";

import { useEffect, useState } from "react";
import { useBulkSelection } from "@/components/providers/bulk-selection-provider";

interface UseBulkSelectionIntegrationProps<T> {
	data: T[];
	getItemId: (item: T) => string;
	onSelectionChange?: (selectedItems: T[], selectedIds: string[]) => void;
}

/**
 * Hook to integrate bulk selection functionality with existing data lists/tables.
 * Automatically syncs available IDs when data changes and provides selected items.
 */
export function useBulkSelectionIntegration<T>({
	data,
	getItemId,
	onSelectionChange,
}: UseBulkSelectionIntegrationProps<T>) {
	const {
		selectedIds,
		setAvailableIds,
		selectionCount,
		clearSelection,
		selectAll,
		isAllSelected,
		isPartiallySelected,
	} = useBulkSelection();

	const [selectedItems, setSelectedItems] = useState<T[]>([]);

	// Update available IDs when data changes
	useEffect(() => {
		const availableIds = data.map(getItemId);
		setAvailableIds(availableIds);
	}, [data, getItemId, setAvailableIds]);

	// Update selected items when selection changes
	useEffect(() => {
		const selected = data.filter((item) => selectedIds.has(getItemId(item)));
		setSelectedItems(selected);

		// Call callback if provided
		if (onSelectionChange) {
			onSelectionChange(selected, Array.from(selectedIds));
		}
	}, [data, selectedIds, getItemId, onSelectionChange]);

	return {
		selectedItems,
		selectedIds: Array.from(selectedIds),
		selectionCount,
		clearSelection,
		selectAll,
		isAllSelected,
		isPartiallySelected,
	};
}
