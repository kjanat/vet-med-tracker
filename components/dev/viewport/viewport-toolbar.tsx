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
import { COLOR_SCHEMES, type ColorScheme } from "./constants";

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
            <Select onValueChange={onBrandFilterChange} value={brandFilter}>
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
              onValueChange={onDeviceTypeFilterChange}
              value={deviceTypeFilter}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                {deviceTypes.map((type) => (
                  <SelectItem
                    disabled={type !== "All" && !availableDeviceTypes.has(type)}
                    key={type}
                    value={type}
                  >
                    {type === "All" ? "All Types" : type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Reset Filters Button */}
            {(brandFilter !== "All" || deviceTypeFilter !== "All") && (
              <Button
                className="h-8 px-2"
                onClick={onResetFilters}
                size="sm"
                title="Reset filters"
                variant="ghost"
              >
                <X className="h-3 w-3" />
              </Button>
            )}

            <ToggleGroup
              className="ml-2"
              onValueChange={(value) => {
                if (value) onColorSchemeChange(value as ColorScheme);
              }}
              type="single"
              value={colorScheme}
            >
              {COLOR_SCHEMES.map((scheme) => (
                <ToggleGroupItem
                  aria-label={`Set color scheme to ${scheme}`}
                  className="capitalize"
                  key={scheme}
                  value={scheme}
                >
                  {scheme}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          {/* URL Controls */}
          <div className="flex items-center gap-2">
            <Input
              className="flex-1"
              onChange={(e) => onUrlInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter URL..."
              type="url"
              value={urlInput}
            />
            <Button onClick={onApplyUrl} size="default">
              Load
            </Button>

            {/* Layout Toggle */}
            <ToggleGroup
              onValueChange={(value) => {
                if (value) onLayoutModeChange(value as "sidebar" | "topbar");
              }}
              type="single"
              value={layoutMode}
            >
              <ToggleGroupItem
                aria-label="Sidebar layout"
                title="Sidebar layout"
                value="sidebar"
              >
                <LayoutPanelLeft className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem
                aria-label="Topbar layout"
                title="Topbar layout"
                value="topbar"
              >
                <LayoutPanelTop className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>

            <Button
              onClick={onRotate}
              size="icon"
              title="Rotate device"
              variant="outline"
            >
              <RotateCw className="h-4 w-4" />
            </Button>
            <Button
              onClick={onReset}
              size="icon"
              title="Reset all"
              variant="outline"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
