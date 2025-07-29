"use client";

import type React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DeviceItem } from "./constants";
import { DeviceIcon } from "./device-icon";

interface DeviceCardProps {
	device: DeviceItem;
	isSelected: boolean;
	onClick: () => void;
}

export const DeviceCard: React.FC<DeviceCardProps> = ({
	device,
	isSelected,
	onClick,
}) => {
	return (
		<Card
			className={cn(
				"cursor-pointer transition-all hover:bg-accent/50",
				isSelected && "border-primary bg-accent",
			)}
			onClick={onClick}
		>
			<CardContent className="p-4">
				<div className="flex items-start gap-3">
					<DeviceIcon
						device={device}
						className="h-5 w-5 text-muted-foreground mt-0.5"
					/>
					<div className="flex-1 min-w-0">
						<h3 className="font-semibold text-sm truncate">
							{device.labels.primary}
						</h3>
						<p className="text-xs text-muted-foreground mt-1">
							{device.properties.brand || "Unknown"} • {device.attributes.width}
							×{device.attributes.height}
						</p>
						<p className="text-xs text-muted-foreground/70 mt-0.5">
							DPR: {device.properties.devicePixelRatio} •{" "}
							{device.properties.operatingSystem}
						</p>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};
