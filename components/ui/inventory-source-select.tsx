"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface InventorySourceSelectProps {
  value?: string;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const INVENTORY_SOURCES = [
  { label: "Pharmacy", value: "pharmacy" },
  { label: "Veterinarian", value: "veterinarian" },
  { label: "Online Store", value: "online" },
  { label: "Other", value: "other" },
];

export function InventorySourceSelect({
  value,
  onValueChange,
  placeholder = "Select source",
  disabled,
}: InventorySourceSelectProps) {
  return (
    <Select disabled={disabled} onValueChange={onValueChange} value={value}>
      <SelectTrigger>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {INVENTORY_SOURCES.map((source) => (
          <SelectItem key={source.value} value={source.value}>
            {source.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
