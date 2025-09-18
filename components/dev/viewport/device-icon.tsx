import {
  Laptop,
  type LucideIcon,
  Monitor,
  Smartphone,
  Tablet,
} from "lucide-react";
import type React from "react";
import type { DeviceItem } from "./constants";

interface DeviceIconProps {
  device: DeviceItem;
  className?: string;
}

// Map device types to appropriate Lucide icons
const deviceTypeIcons: Record<string, LucideIcon> = {
  // Brand-specific mappings still use appropriate device icons
  apple: Smartphone,
  desktop: Monitor,
  google: Smartphone,
  huawei: Smartphone,
  laptop: Laptop,
  lenovo: Smartphone,
  lg: Smartphone,
  mobile: Smartphone,
  oneplus: Smartphone,
  phone: Smartphone,
  samsung: Smartphone,
  tablet: Tablet,
  touch: Tablet,
  xiaomi: Smartphone,
};

export const DeviceIcon: React.FC<DeviceIconProps> = ({
  device,
  className = "h-4 w-4",
}) => {
  const deviceType = device.properties.deviceType;
  const Icon = deviceTypeIcons[deviceType] || Smartphone;

  return <Icon className={className} />;
};
