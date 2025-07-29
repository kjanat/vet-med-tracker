"use client";

import { differenceInDays } from "date-fns";
import { AlertTriangle, Package, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import {
	type AddItemData,
	AddItemModal,
} from "@/components/inventory/add-item-modal";
import { AssignModal } from "@/components/inventory/assign-modal";
import {
	InventoryCard,
	type InventoryItem,
} from "@/components/inventory/inventory-card";
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
import { useDaysOfSupply } from "@/hooks/useDaysOfSupply";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";

// Mock data - replace with tRPC queries
const mockItems: InventoryItem[] = [
	{
		id: "1",
		name: "Rimadyl",
		brand: "Pfizer",
		strength: "75mg",
		route: "Oral",
		form: "Tablet",
		expiresOn: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
		unitsRemaining: 45,
		lot: "ABC123",
		storage: "ROOM",
		inUse: true,
		inUseSince: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
		assignedAnimalId: "1",
		catalogId: "rimadyl-75mg",
	},
	{
		id: "2",
		name: "Insulin",
		brand: "Vetsulin",
		strength: "40 IU/ml",
		route: "Subcutaneous",
		form: "Injection",
		expiresOn: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // Expired
		unitsRemaining: 12,
		lot: "INS456",
		storage: "FRIDGE",
		inUse: true,
		inUseSince: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000),
		assignedAnimalId: "2",
		catalogId: "insulin-40iu",
	},
	{
		id: "3",
		name: "Antibiotics",
		brand: "Amoxicillin",
		strength: "250mg",
		route: "Oral",
		form: "Capsule",
		expiresOn: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
		unitsRemaining: 8,
		lot: "AMX789",
		storage: "ROOM",
		inUse: false,
		catalogId: "amoxicillin-250mg",
	},
	{
		id: "4",
		name: "Eye Drops",
		strength: "0.5%",
		route: "Ophthalmic",
		form: "Drops",
		expiresOn: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // Expiring soon
		unitsRemaining: 15,
		lot: "EYE001",
		storage: "ROOM",
		inUse: false,
		assignedAnimalId: "3",
		catalogId: "eye-drops-05",
	},
];

const mockDaysOfSupply = [
	{ itemId: "1", daysLeft: 6 }, // Low stock
	{ itemId: "2", daysLeft: 3 }, // Very low stock
	{ itemId: "3", daysLeft: 15 },
	{ itemId: "4", daysLeft: null }, // No usage history
];

export default function InventoryPage() {
	const [searchQuery, setSearchQuery] = useState("");
	const [sortBy, setSortBy] = useState("priority");
	const [assignModalItem, setAssignModalItem] = useState<InventoryItem | null>(
		null,
	);
	const { enqueue } = useOfflineQueue();

	// Fire page view event
	useState(() => {
		window.dispatchEvent(new CustomEvent("inventory_view"));
	});

	const daysLeftMap = useDaysOfSupply(mockItems, mockDaysOfSupply);

	// Generate alerts
	const alerts = useMemo(() => {
		return generateInventoryAlerts(mockItems, daysLeftMap);
	}, [daysLeftMap]);

	// Filter and sort items
	const filteredAndSortedItems = useMemo(() => {
		let filtered = mockItems;

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
	}, [searchQuery, sortBy, daysLeftMap]);

	const handleAddItem = async (data: AddItemData) => {
		const itemId = crypto.randomUUID();
		const payload = {
			...data,
			householdId: "household-1", // From context
			catalogId: `${data.name.toLowerCase().replace(/\s+/g, "-")}-${data.strength || ""}`,
		};

		// Optimistic update would go here
		console.log("Adding item:", payload);

		// Queue for offline
		await enqueue(payload, `inventory:addItem:${itemId}`);

		// Show success toast
		console.log(`Added ${data.name} (expires ${data.expiresOn})`);
	};

	const handleSetInUse = async (itemId: string, inUse: boolean) => {
		// Optimistic update
		console.log(`Setting item ${itemId} in use: ${inUse}`);

		// Queue for offline
		const idempotencyKey = `inventory:setInUse:${itemId}:${Math.floor(Date.now() / 60000)}`;
		await enqueue({ itemId, inUse }, idempotencyKey);

		// Show toast
		console.log(inUse ? "Now in use" : "No longer in use");
	};

	const handleAssign = async (itemId: string, animalId: string | null) => {
		// Optimistic update
		console.log(`Assigning item ${itemId} to animal ${animalId}`);

		// Queue for offline
		await enqueue(
			{ itemId, assignedAnimalId: animalId },
			`inventory:assign:${itemId}:${animalId || "null"}`,
		);
	};

	const handleAlertClick = (alertId: string) => {
		// Scroll to item or highlight it
		console.log("Alert clicked:", alertId);

		window.dispatchEvent(
			new CustomEvent("inventory_alert_click", {
				detail: { alertId },
			}),
		);
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-3xl font-bold">Inventory</h1>
					<p className="text-muted-foreground">
						Manage medications and supplies
					</p>
				</div>
				<AddItemModal onAdd={handleAddItem} />
			</div>

			{/* Alert Banners */}
			{(alerts.expiringSoon.length > 0 || alerts.lowStock.length > 0) && (
				<div className="space-y-2">
					{alerts.lowStock.map((alert) => (
						<Alert key={alert.id} className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
							<AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
							<AlertDescription className="flex items-center justify-between">
								<span className="text-orange-800 dark:text-orange-200">{alert.message}</span>
								<Button
									variant="outline"
									size="sm"
									onClick={() => handleAlertClick(alert.id)}
									className="text-orange-600 border-orange-200 hover:bg-orange-100 dark:text-orange-400 dark:border-orange-800 dark:hover:bg-orange-900"
								>
									View Item
								</Button>
							</AlertDescription>
						</Alert>
					))}

					{alerts.expiringSoon.map((alert) => (
						<Alert key={alert.id} className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950">
							<AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
							<AlertDescription className="flex items-center justify-between">
								<span className="text-yellow-800 dark:text-yellow-200">{alert.message}</span>
								<Button
									variant="outline"
									size="sm"
									onClick={() => handleAlertClick(alert.id)}
									className="text-yellow-600 border-yellow-200 hover:bg-yellow-100 dark:text-yellow-400 dark:border-yellow-800 dark:hover:bg-yellow-900"
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
						<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search medications..."
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							className="pl-10"
						/>
					</div>
					<div className="block sm:hidden">
						{searchQuery ? (
							<div className="relative">
								<Input
									placeholder="Search..."
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.target.value)}
									className="pr-10"
									autoFocus
								/>
								<Button
									variant="ghost"
									size="icon"
									className="absolute right-0 top-0 h-full"
									onClick={() => setSearchQuery("")}
								>
									<X className="h-4 w-4" />
								</Button>
							</div>
						) : (
							<Button
								variant="outline"
								size="icon"
								onClick={() => {
									// Focus will be set by autoFocus when input appears
									setSearchQuery(" "); // Set to space to show input
									setTimeout(() => setSearchQuery(""), 0); // Clear it immediately
								}}
							>
								<Search className="h-4 w-4" />
							</Button>
						)}
					</div>
				</div>
			</div>

			{/* Items List */}
			{filteredAndSortedItems.length === 0 ? (
				<div className="text-center py-12">
					<Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
					<h3 className="text-lg font-medium mb-2">No items found</h3>
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
							onDetails={() => console.log("Show details for", item.id)}
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
			const animalName = item.assignedAnimalId ? "Buddy" : ""; // Mock animal name
			lowStock.push({
				id: item.id,
				message: `${item.name}${animalName ? ` (${animalName})` : ""} ~${daysLeft} days left`,
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
