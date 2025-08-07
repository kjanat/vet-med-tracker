"use client";

import { useMemo } from "react";

interface InventoryItem {
	id: string;
	unitsRemaining: number;
	assignedAnimalId?: string;
}

interface DaysOfSupplyData {
	itemId: string;
	daysLeft: number | null;
	animalName?: string | null;
}

export function useDaysOfSupply(
	items: InventoryItem[],
	serverData: DaysOfSupplyData[] = [],
) {
	return useMemo(() => {
		const daysLeftMap = new Map<string, number | null>();

		// Start with server data
		serverData.forEach(({ itemId, daysLeft }) => {
			daysLeftMap.set(itemId, daysLeft);
		});

		// Client-side computation for items without server data
		items.forEach((item) => {
			if (!daysLeftMap.has(item.id)) {
				// If no usage history, show null (will display as "—")
				daysLeftMap.set(item.id, null);
			}
		});

		return daysLeftMap;
	}, [items, serverData]);
}
