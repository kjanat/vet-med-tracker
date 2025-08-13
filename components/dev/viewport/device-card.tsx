"use client";

import type React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils/general";
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
            className="mt-0.5 h-5 w-5 text-muted-foreground"
          />
          <div className="min-w-0 flex-1">
            <h3 className="truncate font-semibold text-sm">
              {device.labels.primary}
            </h3>
            <p className="mt-1 text-muted-foreground text-xs">
              {device.properties.brand || "Unknown"} • {device.attributes.width}
              ×{device.attributes.height}
            </p>
            <p className="mt-0.5 text-muted-foreground/70 text-xs">
              DPR: {device.properties.devicePixelRatio} •{" "}
              {device.properties.operatingSystem}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
