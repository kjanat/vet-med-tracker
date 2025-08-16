"use client";

import {
  LayoutPanelLeft,
  LayoutPanelTop,
  RefreshCw,
  RotateCw,
  X,
} from "lucide-react";
import type React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { ColorScheme } from "./constants";
import { COLOR_SCHEMES } from "./constants";

interface ViewportToolbarProps {
  brands: string[];
  deviceTypes: string[];
  availableDeviceTypes: Set<string>;
  brandFilter: string;
  deviceTypeFilter: string;
  colorScheme: ColorScheme;
  urlInput: string;
  deviceCount: number;
  totalDevices: number;
  layoutMode: "sidebar" | "topbar";
  onBrandFilterChange: (value: string) => void;
  onDeviceTypeFilterChange: (value: string) => void;
  onColorSchemeChange: (value: ColorScheme) => void;
  onUrlInputChange: (value: string) => void;
  onApplyUrl: () => void;
  onRotate: () => void;
  onReset: () => void;
  onResetFilters: () => void;
  onLayoutModeChange: (value: "sidebar" | "topbar") => void;
}

export const ViewportToolbar: React.FC<ViewportToolbarProps> = ({
  brands,
  deviceTypes,
  availableDeviceTypes,
  brandFilter,
  deviceTypeFilter,
  colorScheme,
  urlInput,
  deviceCount,
  totalDevices,
  layoutMode,
  onBrandFilterChange,
  onDeviceTypeFilterChange,
  onColorSchemeChange,
  onUrlInputChange,
  onApplyUrl,
  onRotate,
  onReset,
  onResetFilters,
  onLayoutModeChange,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onApplyUrl();
    }
  };

  return (
    <div className="border-b bg-card p-4">
      <div className="container mx-auto">
        <div className="grid gap-4 lg:grid-cols-3 lg:items-center">
          {/* Title */}
          <div>
            <h1 className="font-bold text-2xl">Viewport Tester</h1>
            <p className="text-muted-foreground text-sm">
              {deviceCount} of {totalDevices} devices
            </p>
          </div>

          {/* Filters & Theme */}
          <div className="flex flex-wrap items-center gap-2">
            <Select value={brandFilter} onValueChange={onBrandFilterChange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Brands" />
              </SelectTrigger>
              <SelectContent>
                {brands.map((brand) => (
                  <SelectItem key={brand} value={brand}>
                    {brand === "All" ? "All Brands" : brand}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={deviceTypeFilter}
              onValueChange={onDeviceTypeFilterChange}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                {deviceTypes.map((type) => (
                  <SelectItem
                    key={type}
                    value={type}
                    disabled={type !== "All" && !availableDeviceTypes.has(type)}
                  >
                    {type === "All" ? "All Types" : type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Reset Filters Button */}
            {(brandFilter !== "All" || deviceTypeFilter !== "All") && (
              <Button
                onClick={onResetFilters}
                size="sm"
                variant="ghost"
                className="h-8 px-2"
                title="Reset filters"
              >
                <X className="h-3 w-3" />
              </Button>
            )}

            <ToggleGroup
              type="single"
              value={colorScheme}
              onValueChange={(value) => {
                if (value) onColorSchemeChange(value as ColorScheme);
              }}
              className="ml-2"
            >
              {COLOR_SCHEMES.map((scheme) => (
                <ToggleGroupItem
                  key={scheme}
                  value={scheme}
                  aria-label={`Set color scheme to ${scheme}`}
                  className="capitalize"
                >
                  {scheme}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {/* URL Controls */}
          <div className="flex items-center gap-2">
            <Input
              type="url"
              value={urlInput}
              onChange={(e) => onUrlInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter URL..."
              className="flex-1"
            />
            <Button onClick={onApplyUrl} size="default">
              Load
            </Button>

            {/* Layout Toggle */}
            <ToggleGroup
              type="single"
              value={layoutMode}
              onValueChange={(value) => {
                if (value) onLayoutModeChange(value as "sidebar" | "topbar");
              }}
            >
              <ToggleGroupItem
                value="sidebar"
                aria-label="Sidebar layout"
                title="Sidebar layout"
              >
                <LayoutPanelLeft className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem
                value="topbar"
                aria-label="Topbar layout"
                title="Topbar layout"
              >
                <LayoutPanelTop className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>

            <Button
              onClick={onRotate}
              size="icon"
              variant="outline"
              title="Rotate device"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button
              onClick={onReset}
              size="icon"
              variant="outline"
              title="Reset all"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
