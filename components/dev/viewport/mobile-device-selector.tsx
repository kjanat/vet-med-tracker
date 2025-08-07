"use client";

import { Check, Search, X } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils/general";
import type { DeviceItem } from "./constants";

interface MobileDeviceSelectorProps {
	devices: DeviceItem[];
	selectedDevice: DeviceItem | null;
	onSelectDevice: (device: DeviceItem) => void;
	onClose: () => void;
}

export const MobileDeviceSelector = memo(function MobileDeviceSelector({
	devices,
	selectedDevice,
	onSelectDevice,
	onClose,
}: MobileDeviceSelectorProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [activeTab, setActiveTab] = useState<"all" | "phone" | "tablet">("all");
	const searchInputRef = useRef<HTMLInputElement>(null);

	// Focus search on mount
	useEffect(() => {
		searchInputRef.current?.focus();
	}, []);

	// Filter devices based on search and tab
	const filteredDevices = devices.filter((device) => {
		const matchesSearch =
			device.labels.primary.toLowerCase().includes(searchQuery.toLowerCase()) ||
			(device.properties.brand?.toLowerCase() || "").includes(
				searchQuery.toLowerCase(),
			);

		const matchesTab =
			activeTab === "all" ||
			(activeTab === "phone" && device.properties.deviceType === "phone") ||
			(activeTab === "tablet" && device.properties.deviceType === "tablet");

		return matchesSearch && matchesTab;
	});

	// Group devices by brand
	const groupedDevices = filteredDevices.reduce(
		(acc, device) => {
			const brand = device.properties.brand || "Other";
			if (!acc[brand]) acc[brand] = [];
			acc[brand].push(device);
			return acc;
		},
		{} as Record<string, DeviceItem[]>,
	);

	const handleSelectDevice = (device: DeviceItem) => {
		onSelectDevice(device);
		onClose();
	};

	return (
		<div className="fixed inset-0 z-50 flex flex-col bg-background">
			{/* Header */}
			<div className="flex items-center gap-2 border-b px-4 py-3">
				<Button
					variant="ghost"
					size="icon"
					onClick={onClose}
					className="h-8 w-8"
				>
					<X className="h-4 w-4" />
				</Button>
				<h2 className="flex-1 font-semibold text-lg">Select Device</h2>
			</div>

			{/* Search */}
			<div className="border-b px-4 py-3">
				<div className="relative">
					<Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
					<Input
						ref={searchInputRef}
						placeholder="Search devices..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-9"
					/>
				</div>
			</div>

			{/* Tabs */}
			<div className="flex border-b">
				{(["all", "phone", "tablet"] as const).map((tab) => (
					<button
						type="button"
						key={tab}
						onClick={() => setActiveTab(tab)}
						className={cn(
							"flex-1 py-3 font-medium text-sm capitalize transition-colors",
							activeTab === tab
								? "border-primary border-b-2 text-primary"
								: "text-muted-foreground",
						)}
					>
						{tab === "all" ? "All Devices" : `${tab}s`}
					</button>
				))}
			</div>

			{/* Device List */}
			<ScrollArea className="flex-1">
				<div className="px-4 py-2">
					{Object.entries(groupedDevices)
						.sort(([a], [b]) => a.localeCompare(b))
						.map(([brand, brandDevices]) => (
							<div key={brand} className="mb-6">
								<h3 className="mb-2 font-medium text-muted-foreground text-sm">
									{brand}
								</h3>
								<div className="space-y-1">
									{brandDevices.map((device) => (
										<button
											type="button"
											key={device.id}
											onClick={() => handleSelectDevice(device)}
											className={cn(
												"flex w-full items-center justify-between rounded-lg px-3 py-3 text-left transition-colors",
												"hover:bg-accent active:scale-[0.98]",
												selectedDevice?.id === device.id && "bg-accent",
											)}
										>
											<div className="flex-1">
												<div className="font-medium">
													{device.labels.primary}
												</div>
												<div className="text-muted-foreground text-sm">
													{device.attributes.width} × {device.attributes.height}
												</div>
											</div>
											{selectedDevice?.id === device.id && (
												<Check className="h-4 w-4 text-primary" />
											)}
										</button>
									))}
								</div>
							</div>
						))}
				</div>
			</ScrollArea>
		</div>
	);
});
