"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	type ColorScheme,
	DEFAULT_VIEWPORT_STATE,
	DEVICES_API_URL,
	type DeviceItem,
	type ViewportState,
	withSchemeParam,
} from "./viewport/constants";
import { DeviceCard } from "./viewport/device-card";
import { ViewportPreview } from "./viewport/viewport-preview";
import { ViewportToolbar } from "./viewport/viewport-toolbar";

const MobileResponsiveTester: React.FC = () => {
	const [devices, setDevices] = useState<DeviceItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [state, setState] = useState<ViewportState>(DEFAULT_VIEWPORT_STATE);
	const [brandFilter, setBrandFilter] = useState<string>("All");
	const [deviceTypeFilter, setDeviceTypeFilter] = useState<string>("All");
	const [urlInput, setUrlInput] = useState(state.baseUrl);

	// Fetch devices on mount
	useEffect(() => {
		const fetchDevices = async () => {
			try {
				const response = await fetch(DEVICES_API_URL);
				if (!response.ok) throw new Error("Failed to fetch device data");
				const data: DeviceItem[] = await response.json();
				setDevices(data.filter((d) => d.active));
				setLoading(false);
			} catch (err) {
				setError(err instanceof Error ? err.message : "Failed to load devices");
				setLoading(false);
			}
		};

		fetchDevices();
	}, []);

	// Compute unique brands and device types
	const brands = useMemo(() => {
		const uniqueBrands = Array.from(
			new Set(devices.map((d) => d.properties.brand).filter(Boolean)),
		) as string[];
		return ["All", ...uniqueBrands.sort()];
	}, [devices]);

	const deviceTypes = useMemo(() => {
		const types = Array.from(
			new Set(devices.map((d) => d.properties.deviceType)),
		);
		return ["All", ...types.sort()];
	}, [devices]);

	// Filter devices based on current filters
	const filteredDevices = useMemo(() => {
		return devices
			.filter((device) => {
				const brandMatch =
					brandFilter === "All" ||
					(device.properties.brand || "Unknown") === brandFilter;
				const typeMatch =
					deviceTypeFilter === "All" ||
					device.properties.deviceType === deviceTypeFilter;
				return brandMatch && typeMatch;
			})
			.sort(
				(a, b) => a.attributes.ranking.amongAll - b.attributes.ranking.amongAll,
			);
	}, [devices, brandFilter, deviceTypeFilter]);

	// Device selection handler
	const setDevice = useCallback((device: DeviceItem) => {
		const { width, height } = device.attributes;
		setState((prev) => ({
			...prev,
			width,
			height,
			brand: device.properties.brand || "Unknown",
			name: device.labels.primary,
			orientation: width >= height ? "landscape" : "portrait",
			deviceType: device.properties.deviceType,
		}));
	}, []);

	// Rotate device handler
	const rotate = useCallback(() => {
		setState((prev) => ({
			...prev,
			width: prev.height,
			height: prev.width,
			orientation: prev.orientation === "portrait" ? "landscape" : "portrait",
		}));
	}, []);

	// Reset to defaults handler
	const reset = useCallback(() => {
		const defaultDevice =
			devices.find((d) => d.slug === "iphone-se") || devices[0];
		if (defaultDevice) {
			setDevice(defaultDevice);
		}
		setState((prev) => ({
			...prev,
			scheme: "system",
			baseUrl: "http://localhost:3000/",
		}));
		setUrlInput("http://localhost:3000/");
		setBrandFilter("All");
		setDeviceTypeFilter("All");
	}, [devices, setDevice]);

	// Apply URL handler
	const applyUrl = useCallback(() => {
		setState((prev) => ({ ...prev, baseUrl: urlInput }));
	}, [urlInput]);

	// Color scheme change handler
	const handleColorSchemeChange = useCallback((scheme: ColorScheme) => {
		setState((prev) => ({ ...prev, scheme }));
	}, []);

	// Compute iframe source with scheme parameter
	const iframeSrc = withSchemeParam(state.baseUrl, state.scheme);

	// Loading state
	if (loading) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin" />
					<p>Loading device data...</p>
				</div>
			</div>
		);
	}

	// Error state
	if (error) {
		return (
			<div className="flex min-h-screen items-center justify-center">
				<div className="text-center">
					<AlertCircle className="mx-auto mb-4 h-12 w-12 text-destructive" />
					<p className="text-destructive">{error}</p>
				</div>
			</div>
		);
	}

	// Main render
	const isPortrait = state.height > state.width;

	return (
		<div className="flex min-h-screen flex-col bg-background">
			{/* Toolbar */}
			<ViewportToolbar
				brands={brands}
				deviceTypes={deviceTypes}
				brandFilter={brandFilter}
				deviceTypeFilter={deviceTypeFilter}
				colorScheme={state.scheme}
				urlInput={urlInput}
				deviceCount={filteredDevices.length}
				totalDevices={devices.length}
				onBrandFilterChange={setBrandFilter}
				onDeviceTypeFilterChange={setDeviceTypeFilter}
				onColorSchemeChange={handleColorSchemeChange}
				onUrlInputChange={setUrlInput}
				onApplyUrl={applyUrl}
				onRotate={rotate}
				onReset={reset}
			/>

			{/* Main content */}
			<div className="flex flex-1 overflow-hidden">
				{isPortrait ? (
					<>
						{/* Sidebar for portrait mode */}
						<ScrollArea className="w-96 border-r">
							<div className="grid gap-2 p-4">
								{filteredDevices.map((device) => (
									<DeviceCard
										key={device.id}
										device={device}
										isSelected={
											device.labels.primary === state.name &&
											(device.properties.brand || "Unknown") === state.brand
										}
										onClick={() => setDevice(device)}
									/>
								))}
							</div>
						</ScrollArea>

						{/* Preview area */}
						<div className="flex flex-1 items-center justify-center p-8">
							<ViewportPreview src={iframeSrc} state={state} />
						</div>
					</>
				) : (
					/* Landscape layout */
					<div className="flex-1 overflow-auto p-8">
						{/* Device grid above preview */}
						<div className="mx-auto mb-8 max-w-7xl">
							<div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
								{filteredDevices.map((device) => (
									<DeviceCard
										key={device.id}
										device={device}
										isSelected={
											device.labels.primary === state.name &&
											(device.properties.brand || "Unknown") === state.brand
										}
										onClick={() => setDevice(device)}
									/>
								))}
							</div>
						</div>

						{/* Preview centered */}
						<ViewportPreview src={iframeSrc} state={state} />
					</div>
				)}
			</div>
		</div>
	);
};

export default MobileResponsiveTester;
