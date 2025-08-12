"use client";

import { differenceInDays } from "date-fns";
import { AlertTriangle, Package, Search, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { InventoryErrorBoundary } from "@/components/error-boundary-page";
import { InventoryFormDialog } from "@/components/forms/inventory-form-dialog";
import { AddItemButton } from "@/components/inventory/add-item-button";
import { AssignModal } from "@/components/inventory/assign-modal";
import {
	type EditItemData,
	EditItemModal,
} from "@/components/inventory/edit-item-modal";
import {
	InventoryCard,
	type InventoryItem,
} from "@/components/inventory/inventory-card";
import { useApp } from "@/components/providers/app-provider-consolidated";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useDaysOfSupply } from "@/hooks/inventory/useDaysOfSupply";
import { useOfflineQueue } from "@/hooks/offline/useOfflineQueue";
import { trpc } from "@/server/trpc/client";

// Remove mock data - now using real calculations

export default function InventoryPage() {
	return (
		<InventoryErrorBoundary>
			<InventoryContent />
		</InventoryErrorBoundary>
	);
}

function InventoryContent() {
	const [searchQuery, setSearchQuery] = useState("");
	const [showMobileSearch, setShowMobileSearch] = useState(false);
	const [sortBy, setSortBy] = useState("priority");
	const [assignModalItem, setAssignModalItem] = useState<InventoryItem | null>(
		null,
	);
	const [editModalItem, setEditModalItem] = useState<InventoryItem | null>(
		null,
	);
	const { enqueue } = useOfflineQueue();
	const { selectedHousehold } = useApp();
	const utils = trpc.useUtils();

	// Fire page view event
	useEffect(() => {
		if (typeof window !== "undefined") {
			window.dispatchEvent(new CustomEvent("inventory_view"));
		}
	}, []);

	// Fetch household data to determine loading state
	const { isLoading: isLoadingHouseholds } = trpc.household.list.useQuery(
		undefined,
		{
			enabled: true,
		},
	);

	// Fetch inventory items
	const {
		data: items = [],
		isLoading,
		error,
	} = trpc.inventory.list.useQuery(
		{
			householdId: selectedHousehold?.id || "",
		},
		{
			enabled: !!selectedHousehold?.id,
		},
	);

	// Fetch days of supply data
	const { data: daysOfSupplyData = [] } =
		trpc.inventory.getDaysOfSupply.useQuery(
			{
				householdId: selectedHousehold?.id || "",
			},
			{
				enabled: !!selectedHousehold?.id && items.length > 0,
			},
		);

	// Transform the data to match the InventoryItem interface
	const inventoryItems: InventoryItem[] = useMemo(() => {
		return items.map((item) => ({
			id: item.id,
			medicationId: item.medicationId,
			name: item.name,
			brand: item.name, // Using name as brand for now
			genericName: item.genericName,
			strength: item.strength || "",
			route: item.route as InventoryItem["route"],
			form: item.form as InventoryItem["form"],
			expiresOn: item.expiresOn || new Date(),
			unitsRemaining: item.unitsRemaining || 0,
			unitsTotal: item.unitsTotal || 0,
			lot: item.lot,
			storage: item.storage as InventoryItem["storage"],
			inUse: item.inUse,
			assignedAnimalId: item.assignedAnimalId || undefined,
			catalogId: item.medicationId,
			assignedAnimalName: item.assignedAnimalName || undefined,
		}));
	}, [items]);

	// Use real days of supply data from tRPC
	const daysLeftMap = useDaysOfSupply(inventoryItems, daysOfSupplyData);

	// Generate alerts
	const alerts = useMemo(() => {
		return generateInventoryAlerts(inventoryItems, daysLeftMap);
	}, [inventoryItems, daysLeftMap]);

	// Filter and sort items
	const filteredAndSortedItems = useMemo(() => {
		let filtered = inventoryItems;

		// Search filter
		if (searchQuery) {
			const query = searchQuery.toLowerCase();
			filtered = filtered.filter(
				(item) =>
					item.name.toLowerCase().includes(query) ||
					item.brand?.toLowerCase().includes(query) ||
					item.route.toLowerCase().includes(query),
			);
		}

		// Sort
		const sorted = [...filtered].sort(
			getInventorySortFunction(sortBy, daysLeftMap),
		);

		return sorted;
	}, [searchQuery, sortBy, daysLeftMap, inventoryItems]);

	// Set in-use mutation
	const setInUseMutation = trpc.inventory.setInUse.useMutation({
		onSuccess: () => {
			utils.inventory.list.invalidate();
		},
	});

	const handleSetInUse = async (itemId: string, inUse: boolean) => {
		if (!selectedHousehold?.id) return;

		try {
			await setInUseMutation.mutateAsync({
				id: itemId,
				householdId: selectedHousehold.id,
				inUse,
			});
			console.log(inUse ? "Now in use" : "No longer in use");
		} catch (error) {
			// Queue for offline
			const idempotencyKey = `inventory:setInUse:${itemId}:${Math.floor(Date.now() / 60000)}`;
			await enqueue(
				"inventory.markAsInUse",
				{ id: itemId, householdId: selectedHousehold.id, inUse },
				idempotencyKey,
			);
			console.error(
				"Failed to update in-use status, queued for offline sync:",
				error,
			);
		}
	};

	// Assign to animal mutation
	const assignMutation = trpc.inventory.assignToAnimal.useMutation({
		onSuccess: () => {
			utils.inventory.list.invalidate();
		},
	});

	// Update inventory item mutation
	const updateMutation = trpc.inventory.update.useMutation({
		onSuccess: () => {
			utils.inventory.list.invalidate();
		},
	});

	// Delete inventory item mutation
	const deleteMutation = trpc.inventory.delete.useMutation({
		onSuccess: () => {
			utils.inventory.list.invalidate();
		},
	});

	const handleAssign = async (itemId: string, animalId: string | null) => {
		if (!selectedHousehold?.id) return;

		try {
			await assignMutation.mutateAsync({
				id: itemId,
				householdId: selectedHousehold.id,
				animalId,
			});
			console.log(`Assigned item to ${animalId || "no animal"}`);
		} catch (error) {
			// Queue for offline
			await enqueue(
				"inventory.update",
				{
					id: itemId,
					householdId: selectedHousehold.id,
					assignedAnimalId: animalId,
				},
				`inventory:assign:${itemId}:${animalId || "null"}`,
			);
			console.error("Failed to assign item, queued for offline sync:", error);
		}
	};

	const handleUpdate = async (id: string, data: EditItemData) => {
		if (!selectedHousehold?.id) return;

		try {
			await updateMutation.mutateAsync({
				id,
				householdId: selectedHousehold.id,
				brandOverride: data.brandOverride,
				lot: data.lot,
				expiresOn: new Date(data.expiresOn),
				storage: data.storage,
				unitsRemaining: data.unitsRemaining,
				notes: data.notes,
			});
			console.log("Item updated successfully");
		} catch (error) {
			console.error("Failed to update item:", error);
		}
	};

	const handleDelete = async (id: string) => {
		if (!selectedHousehold?.id) return;

		try {
			await deleteMutation.mutateAsync({
				id,
				householdId: selectedHousehold.id,
			});
			console.log("Item deleted successfully");
		} catch (error) {
			console.error("Failed to delete item:", error);
		}
	};

	const handleAlertClick = (alertId: string) => {
		// Scroll to item or highlight it
		console.log("Alert clicked:", alertId);

		if (typeof window !== "undefined") {
			window.dispatchEvent(
				new CustomEvent("inventory_alert_click", {
					detail: { alertId },
				}),
			);
		}
	};

	// Show initial loading state (when households are still loading)
	if (isLoadingHouseholds) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="text-center">
					<Package className="mx-auto mb-4 h-12 w-12 animate-pulse text-muted-foreground opacity-50" />
					<p className="text-muted-foreground">Loading...</p>
				</div>
			</div>
		);
	}

	// Show no household selected state (only after households have loaded)
	if (!selectedHousehold?.id) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="text-center">
					<Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-50" />
					<h3 className="mb-2 font-medium text-lg">No household selected</h3>
					<p className="text-muted-foreground">
						Please select a household to view inventory
					</p>
				</div>
			</div>
		);
	}

	// Show inventory loading state (when household is selected but inventory is loading)
	if (isLoading && !inventoryItems.length) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="text-center">
					<Package className="mx-auto mb-4 h-12 w-12 animate-pulse text-muted-foreground opacity-50" />
					<p className="text-muted-foreground">Loading inventory...</p>
				</div>
			</div>
		);
	}

	// Show error state
	if (error) {
		return (
			<div className="flex items-center justify-center py-12">
				<div className="text-center">
					<AlertTriangle className="mx-auto mb-4 h-12 w-12 text-destructive" />
					<h3 className="mb-2 font-medium text-lg">Failed to load inventory</h3>
					<p className="mb-4 text-muted-foreground">
						{error.message || "An unexpected error occurred"}
					</p>
					<Button
						onClick={() => utils.inventory.list.invalidate()}
						variant="outline"
					>
						Try Again
					</Button>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<p className="text-muted-foreground">Manage medications and supplies</p>
				<AddItemButton />
			</div>

			{/* Alert Banners */}
			{(alerts.expiringSoon.length > 0 || alerts.lowStock.length > 0) && (
				<div className="space-y-2">
					{alerts.lowStock.map((alert) => (
						<Alert
							key={alert.id}
							className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950"
						>
							<AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
							<AlertDescription className="flex items-center justify-between">
								<span className="text-orange-800 dark:text-orange-200">
									{alert.message}
								</span>
								<Button
									variant="outline"
									size="sm"
									onClick={() => handleAlertClick(alert.id)}
									className="border-orange-200 text-orange-600 hover:bg-orange-100 dark:border-orange-800 dark:text-orange-400 dark:hover:bg-orange-900"
								>
									View Item
								</Button>
							</AlertDescription>
						</Alert>
					))}

					{alerts.expiringSoon.map((alert) => (
						<Alert
							key={alert.id}
							className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950"
						>
							<AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
							<AlertDescription className="flex items-center justify-between">
								<span className="text-yellow-800 dark:text-yellow-200">
									{alert.message}
								</span>
								<Button
									variant="outline"
									size="sm"
									onClick={() => handleAlertClick(alert.id)}
									className="border-yellow-200 text-yellow-600 hover:bg-yellow-100 dark:border-yellow-800 dark:text-yellow-400 dark:hover:bg-yellow-900"
								>
									View Item
								</Button>
							</AlertDescription>
						</Alert>
					))}
				</div>
			)}

			{/* Filters */}
			<div className="flex items-center gap-2">
				{/* Priority dropdown on the left for mobile */}
				<Select value={sortBy} onValueChange={setSortBy}>
					<SelectTrigger className="w-[140px] sm:w-[180px]">
						<SelectValue />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="priority">Priority</SelectItem>
						<SelectItem value="name">Name A-Z</SelectItem>
						<SelectItem value="expiry">Expiry Date</SelectItem>
					</SelectContent>
				</Select>

				{/* Search - expandable on mobile */}
				<div className="relative flex-1">
					<div className="hidden sm:block">
						<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 transform text-muted-foreground" />
						<Input
							placeholder="Search medications..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10"
						/>
					</div>
					<div className="block sm:hidden">
						{showMobileSearch ? (
							<div className="relative">
								<Input
									placeholder="Search..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									onBlur={() => {
										// Hide search if empty when user taps away
										if (!searchQuery) {
											setShowMobileSearch(false);
										}
									}}
									className="pr-10"
									autoFocus
								/>
								<Button
									variant="ghost"
									size="icon"
									className="absolute top-0 right-0 h-full"
									onClick={() => {
										setSearchQuery("");
										setShowMobileSearch(false);
									}}
								>
									<X className="h-4 w-4" />
								</Button>
							</div>
						) : (
							<Button
								variant="outline"
								size="icon"
								onClick={() => setShowMobileSearch(true)}
							>
								<Search className="h-4 w-4" />
							</Button>
						)}
					</div>
				</div>
			</div>

			{/* Items List */}
			{filteredAndSortedItems.length === 0 ? (
				<div className="py-12 text-center">
					<Package className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-50" />
					<h3 className="mb-2 font-medium text-lg">No items found</h3>
					<p className="text-muted-foreground">
						{searchQuery
							? "Try adjusting your search terms"
							: "Add your first medication to get started"}
					</p>
				</div>
			) : (
				<div className="grid gap-4">
					{filteredAndSortedItems.map((item) => (
						<InventoryCard
							key={item.id}
							item={item}
							daysLeft={daysLeftMap.get(item.id) || null}
							onUseThis={() => handleSetInUse(item.id, !item.inUse)}
							onAssign={() => setAssignModalItem(item)}
							onDetails={() => setEditModalItem(item)}
						/>
					))}
				</div>
			)}

			{/* Assign Modal */}
			<AssignModal
				item={assignModalItem}
				open={!!assignModalItem}
				onOpenChange={(open) => !open && setAssignModalItem(null)}
				onAssign={handleAssign}
			/>

			{/* Edit Modal */}
			<EditItemModal
				item={editModalItem}
				open={!!editModalItem}
				onOpenChange={(open) => !open && setEditModalItem(null)}
				onUpdate={handleUpdate}
				onDelete={handleDelete}
			/>

			{/* Inventory Form Dialog */}
			<InventoryFormDialog />
		</div>
	);
}

// Helper function to generate inventory alerts
function generateInventoryAlerts(
	items: InventoryItem[],
	daysLeftMap: Map<string, number | null>,
) {
	const expiringSoon: Array<{
		id: string;
		message: string;
		type: "expiring";
	}> = [];
	const lowStock: Array<{ id: string; message: string; type: "low-stock" }> =
		[];

	for (const item of items) {
		const daysUntilExpiry = differenceInDays(item.expiresOn, new Date());
		const daysLeft = daysLeftMap.get(item.id);

		// Expiring alerts
		if (daysUntilExpiry <= 14 && daysUntilExpiry > 0) {
			expiringSoon.push({
				id: item.id,
				message: `${item.name} lot ${item.lot} expires in ${daysUntilExpiry} days`,
				type: "expiring",
			});
		}

		// Low stock alerts
		if (daysLeft !== undefined && daysLeft !== null && daysLeft <= 7) {
			const animalName =
				item.assignedAnimalName || (item.assignedAnimalId ? "Assigned" : "");
			const displayName = animalName || "Unassigned";
			lowStock.push({
				id: item.id,
				message: `${item.name}${displayName !== "Unassigned" ? ` (${displayName})` : ` (${displayName})`} ~${daysLeft} days left`,
				type: "low-stock",
			});
		}
	}

	return { expiringSoon, lowStock };
}

// Helper function to get the sort comparator
function getInventorySortFunction(
	sortBy: string,
	daysLeftMap: Map<string, number | null>,
) {
	return (a: InventoryItem, b: InventoryItem) => {
		if (sortBy === "priority") {
			return sortByPriority(a, b, daysLeftMap);
		} else if (sortBy === "name") {
			return a.name.localeCompare(b.name);
		} else if (sortBy === "expiry") {
			return a.expiresOn.getTime() - b.expiresOn.getTime();
		}
		return 0;
	};
}

// Helper function for priority sorting
function sortByPriority(
	a: InventoryItem,
	b: InventoryItem,
	daysLeftMap: Map<string, number | null>,
) {
	// In Use first
	const aInUse = a.inUse ? 1 : 0;
	const bInUse = b.inUse ? 1 : 0;
	if (aInUse !== bInUse) return bInUse - aInUse;

	// Expiring soon
	const aDaysUntilExpiry = differenceInDays(a.expiresOn, new Date());
	const bDaysUntilExpiry = differenceInDays(b.expiresOn, new Date());
	const aExpiring = aDaysUntilExpiry <= 14 ? 1 : 0;
	const bExpiring = bDaysUntilExpiry <= 14 ? 1 : 0;
	if (aExpiring !== bExpiring) return bExpiring - aExpiring;

	// Low stock
	const aDaysLeft = daysLeftMap.get(a.id);
	const bDaysLeft = daysLeftMap.get(b.id);
	const aLowStock =
		aDaysLeft !== undefined && aDaysLeft !== null && aDaysLeft <= 7 ? 1 : 0;
	const bLowStock =
		bDaysLeft !== undefined && bDaysLeft !== null && bDaysLeft <= 7 ? 1 : 0;
	if (aLowStock !== bLowStock) return bLowStock - aLowStock;

	// Alphabetical
	return a.name.localeCompare(b.name);
}
