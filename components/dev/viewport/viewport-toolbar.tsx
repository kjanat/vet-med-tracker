"use client";

import { RefreshCw, RotateCw } from "lucide-react";
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
	brandFilter: string;
	deviceTypeFilter: string;
	colorScheme: ColorScheme;
	urlInput: string;
	deviceCount: number;
	totalDevices: number;
	onBrandFilterChange: (value: string) => void;
	onDeviceTypeFilterChange: (value: string) => void;
	onColorSchemeChange: (value: ColorScheme) => void;
	onUrlInputChange: (value: string) => void;
	onApplyUrl: () => void;
	onRotate: () => void;
	onReset: () => void;
}

export const ViewportToolbar: React.FC<ViewportToolbarProps> = ({
	brands,
	deviceTypes,
	brandFilter,
	deviceTypeFilter,
	colorScheme,
	urlInput,
	deviceCount,
	totalDevices,
	onBrandFilterChange,
	onDeviceTypeFilterChange,
	onColorSchemeChange,
	onUrlInputChange,
	onApplyUrl,
	onRotate,
	onReset,
}) => {
	const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
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
						<h1 className="text-2xl font-bold">Viewport Tester</h1>
						<p className="text-sm text-muted-foreground">
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
									<SelectItem key={type} value={type}>
										{type === "All" ? "All Types" : type}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

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
							onKeyPress={handleKeyPress}
							placeholder="Enter URL..."
							className="flex-1"
						/>
						<Button onClick={onApplyUrl} size="default">
							Load
						</Button>
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
