"use client";

import { differenceInDays, format } from "date-fns";
import { Calendar, MapPin, MoreHorizontal, Package } from "lucide-react";
import { useApp } from "@/components/providers/app-provider";
import { AnimalAvatar } from "@/components/ui/animal-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export interface InventoryItem {
	id: string;
	name: string;
	brand?: string;
	strength?: string;
	concentration?: string;
	route: string;
	form: string;
	expiresOn: Date;
	unitsRemaining: number;
	lot?: string;
	storage: "FRIDGE" | "ROOM";
	barcode?: string;
	inUse: boolean;
	inUseSince?: Date;
	assignedAnimalId?: string;
	catalogId: string;
}

interface InventoryCardProps {
	item: InventoryItem;
	daysLeft: number | null;
	onUseThis: () => void;
	onAssign: () => void;
	onDetails: () => void;
}

const formIcons = {
	Tablet: "💊",
	Capsule: "💊",
	Liquid: "🧪",
	Injection: "💉",
	Topical: "🧴",
	Drops: "💧",
};

// Helper component for expiry info
function ExpiryInfo({
	item,
	isExpired,
	isExpiring,
}: {
	item: InventoryItem;
	isExpired: boolean;
	isExpiring: boolean;
}) {
	return (
		<div className="flex items-center gap-1">
			<Calendar className="h-3 w-3" />
			<span
				className={cn(
					isExpired
						? "text-red-600 font-medium"
						: isExpiring
							? "text-orange-600"
							: "",
				)}
			>
				Expires {format(item.expiresOn, "MMM d, yyyy")}
			</span>
		</div>
	);
}

// Helper component for status badges
function StatusBadges({
	isExpired,
	isExpiring,
	isLowStock,
	storage,
}: {
	isExpired: boolean;
	isExpiring: boolean;
	isLowStock: boolean;
	storage: "FRIDGE" | "ROOM";
}) {
	return (
		<div className="flex flex-col items-end gap-1 sm:flex-row sm:items-center">
			{isExpired && (
				<Badge variant="destructive" className="text-xs">
					Expired
				</Badge>
			)}
			{isExpiring && !isExpired && (
				<Badge variant="secondary" className="text-xs text-orange-600">
					Expiring
				</Badge>
			)}
			{isLowStock && (
				<Badge variant="secondary" className="text-xs text-orange-600">
					Low
				</Badge>
			)}
			{storage === "FRIDGE" && (
				<Badge variant="outline" className="text-xs">
					<MapPin className="h-3 w-3 mr-1" />
					Fridge
				</Badge>
			)}
		</div>
	);
}

export function InventoryCard({
	item,
	daysLeft,
	onUseThis,
	onAssign,
	onDetails,
}: InventoryCardProps) {
	const { animals } = useApp();

	const assignedAnimal = item.assignedAnimalId
		? animals.find((a) => a.id === item.assignedAnimalId)
		: null;
	const daysUntilExpiry = differenceInDays(item.expiresOn, new Date());

	const isExpiring = daysUntilExpiry <= 14;
	const isExpired = daysUntilExpiry < 0;
	const isLowStock = daysLeft !== null && daysLeft <= 7;

	const handleUseThis = () => {
		onUseThis();

		// Fire instrumentation event
		window.dispatchEvent(
			new CustomEvent("inventory_set_in_use", {
				detail: { itemId: item.id, inUse: !item.inUse },
			}),
		);
	};

	const handleAssign = () => {
		onAssign();

		// Fire instrumentation event
		window.dispatchEvent(
			new CustomEvent("inventory_assign", {
				detail: { itemId: item.id },
			}),
		);
	};

	return (
		<Card
			className={cn(
				"transition-all duration-200 hover:shadow-md",
				item.inUse && "ring-2 ring-primary ring-offset-2",
				isExpired && "border-red-200 bg-red-50",
			)}
		>
			<CardContent className="p-4">
				<div className="flex items-start justify-between">
					<div className="flex items-start gap-3 flex-1">
						{/* Form Icon */}
						<div className="text-2xl">
							{formIcons[item.form as keyof typeof formIcons] || "📦"}
						</div>

						{/* Main Info */}
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2 mb-1">
								<h3 className="font-semibold truncate">
									{item.name}
									{item.brand && item.brand !== item.name && (
										<span className="text-muted-foreground font-normal">
											{" "}
											({item.brand})
										</span>
									)}
								</h3>

								{item.inUse && (
									<Badge variant="default" className="shrink-0">
										In Use
									</Badge>
								)}
							</div>

							<div className="text-sm text-muted-foreground space-y-1">
								<div>
									{item.strength || item.concentration} • {item.route}
								</div>

								<div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-4">
									<ExpiryInfo
										item={item}
										isExpired={isExpired}
										isExpiring={isExpiring}
									/>

									<div className="flex items-center gap-1">
										<Package className="h-3 w-3" />
										<span>{item.unitsRemaining} units</span>
									</div>

									{item.lot && (
										<div className="flex items-center gap-1">
											<span className="text-muted-foreground">Lot:</span>
											<span className="font-mono text-xs bg-muted px-1 py-0.5 rounded select-all">
												{item.lot}
											</span>
										</div>
									)}
								</div>

								{daysLeft !== null && (
									<div
										className={cn(
											"text-xs",
											isLowStock
												? "text-orange-600 font-medium"
												: "text-muted-foreground",
										)}
									>
										~{daysLeft} days left
									</div>
								)}

								{item.inUseSince && (
									<div className="text-xs text-muted-foreground">
										In use since {format(item.inUseSince, "MMM d")}
									</div>
								)}
							</div>
						</div>
					</div>

					{/* Actions */}
					<DropdownMenu>
						<DropdownMenuTrigger asChild>
							<Button variant="ghost" size="icon" className="shrink-0">
								<MoreHorizontal className="h-4 w-4" />
							</Button>
						</DropdownMenuTrigger>
						<DropdownMenuContent align="end">
							<DropdownMenuItem onClick={handleUseThis}>
								{item.inUse ? "Stop Using" : "Use This"}
							</DropdownMenuItem>
							<DropdownMenuItem onClick={handleAssign}>Assign</DropdownMenuItem>
							<DropdownMenuItem onClick={onDetails}>Details</DropdownMenuItem>
						</DropdownMenuContent>
					</DropdownMenu>
				</div>

				{/* Bottom Row */}
				<div className="flex items-center justify-between mt-3 pt-3 border-t">
					{/* Assignment */}
					<div className="flex items-center gap-2">
						{assignedAnimal ? (
							<div className="flex flex-col items-start gap-1 sm:flex-row sm:items-center sm:gap-2">
								<AnimalAvatar animal={assignedAnimal} size="sm" />
								<span className="text-sm">
									Assigned to {assignedAnimal.name}
								</span>
							</div>
						) : (
							<Badge variant="outline" className="text-muted-foreground">
								Unassigned
							</Badge>
						)}
					</div>

					{/* Status Chips */}
					<StatusBadges
						isExpired={isExpired}
						isExpiring={isExpiring}
						isLowStock={isLowStock}
						storage={item.storage}
					/>
				</div>
			</CardContent>
		</Card>
	);
}
