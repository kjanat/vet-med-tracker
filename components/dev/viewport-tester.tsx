"use client";

import { AlertCircle, Loader2 } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import {
	type ColorScheme,
	DEFAULT_VIEWPORT_STATE,
	DEVICES_API_URL,
	type DeviceItem,
	type DeviceType,
	type ViewportState,
	withSchemeParam,
} from "./viewport/constants";
import { DeviceCard } from "./viewport/device-card";
import { ViewportPreview } from "./viewport/viewport-preview";
import { ViewportToolbar } from "./viewport/viewport-toolbar";

// Helper function to sort devices
function sortDevices(a: DeviceItem, b: DeviceItem): number {
	const dateA = a.properties.releaseDate
		? new Date(a.properties.releaseDate).getTime()
		: 0;
	const dateB = b.properties.releaseDate
		? new Date(b.properties.releaseDate).getTime()
		: 0;

	// If both have dates, sort by date (descending)
	if (dateA && dateB) {
		return dateB - dateA;
	}

	// If only one has a date, put the one with date first
	if (dateA && !dateB) return -1;
	if (!dateA && dateB) return 1;

	// If neither has a date, fall back to ranking
	return a.attributes.ranking.amongAll - b.attributes.ranking.amongAll;
}

const MobileResponsiveTester: React.FC = () => {
	const [devices, setDevices] = useState<DeviceItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [state, setState] = useState<ViewportState>(DEFAULT_VIEWPORT_STATE);
	const [brandFilter, setBrandFilter] = useState<string>("All");
	const [deviceTypeFilter, setDeviceTypeFilter] = useState<string>("All");
	const [urlInput, setUrlInput] = useState(state.baseUrl);
	const [windowHeight, setWindowHeight] = useState(
		typeof window !== "undefined" ? window.innerHeight : 800,
	);
	const [layoutMode, setLayoutMode] = useState<"sidebar" | "topbar">("sidebar");
	const sidebarRef = useRef<HTMLDivElement>(null);

	// Track window resize
	useEffect(() => {
		const handleResize = () => {
			setWindowHeight(window.innerHeight);
		};

		handleResize(); // Set initial height
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

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

	// Compute available device types for the selected brand
	const availableDeviceTypes = useMemo(() => {
		if (brandFilter === "All") {
			return new Set(devices.map((d) => d.properties.deviceType));
		}
		return new Set(
			devices
				.filter((d) => (d.properties.brand || "Unknown") === brandFilter)
				.map((d) => d.properties.deviceType),
		);
	}, [devices, brandFilter]);

	// Reset device type filter if it's not available for the selected brand
	useEffect(() => {
		if (
			deviceTypeFilter !== "All" &&
			!availableDeviceTypes.has(deviceTypeFilter as DeviceType)
		) {
			setDeviceTypeFilter("All");
		}
	}, [availableDeviceTypes, deviceTypeFilter]);

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
			.sort(sortDevices);
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

	// Reset filters only
	const resetFilters = useCallback(() => {
		setBrandFilter("All");
		setDeviceTypeFilter("All");
	}, []);

	// Apply URL handler
	const applyUrl = useCallback(() => {
		setState((prev) => ({ ...prev, baseUrl: urlInput }));
	}, [urlInput]);

	// Color scheme change handler
	const handleColorSchemeChange = useCallback((scheme: ColorScheme) => {
		setState((prev) => ({ ...prev, scheme }));
	}, []);

	// Compute iframe source with scheme parameter
	const iframeSrc = withSchemeParam(state.baseUrl);

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
	const useSidebar = layoutMode === "sidebar";

	// Calculate dynamic height for ScrollArea based on viewport
	// For sidebar mode, make the sidebar height responsive to iframe size
	// but constrained by available window height
	const scrollAreaStyle = {
		height: useSidebar
			? `${Math.min(
					state.height + 120, // Add some padding around iframe height
					windowHeight - 200, // Leave room for toolbar and margins
				)}px`
			: undefined,
		maxHeight: "calc(100vh - 8rem)", // Safety max-height
	};

	return (
		<div className="flex min-h-screen flex-col bg-background">
			{/* Toolbar */}
			<ViewportToolbar
				brands={brands}
				deviceTypes={deviceTypes}
				availableDeviceTypes={availableDeviceTypes}
				brandFilter={brandFilter}
				deviceTypeFilter={deviceTypeFilter}
				colorScheme={state.scheme}
				urlInput={urlInput}
				deviceCount={filteredDevices.length}
				totalDevices={devices.length}
				layoutMode={layoutMode}
				onBrandFilterChange={setBrandFilter}
				onDeviceTypeFilterChange={setDeviceTypeFilter}
				onColorSchemeChange={handleColorSchemeChange}
				onUrlInputChange={setUrlInput}
				onApplyUrl={applyUrl}
				onRotate={rotate}
				onReset={reset}
				onResetFilters={resetFilters}
				onLayoutModeChange={setLayoutMode}
			/>

			{/* Main content */}
			<div className="flex flex-1 overflow-hidden">
				{useSidebar ? (
					<>
						{/* Sidebar layout */}
						<div ref={sidebarRef} className="w-96 border-r flex flex-col">
							<ScrollArea style={scrollAreaStyle} className="flex-1">
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
								<ScrollBar orientation="vertical" />
							</ScrollArea>
						</div>

						{/* Preview area */}
						<div className="flex flex-1 items-center justify-center p-8">
							<ViewportPreview src={iframeSrc} state={state} />
						</div>
					</>
				) : (
					/* Topbar layout */
					<div className="flex-1 overflow-auto p-8">
						{/* Device grid above preview */}
						<div className="mx-auto mb-8 max-w-7xl">
							<div className="border rounded-lg">
								<ScrollArea className="w-full">
									<div className="flex gap-2 p-4">
										{filteredDevices.map((device) => (
											<div key={device.id} className="w-48 flex-shrink-0">
												<DeviceCard
													device={device}
													isSelected={
														device.labels.primary === state.name &&
														(device.properties.brand || "Unknown") ===
															state.brand
													}
													onClick={() => setDevice(device)}
												/>
											</div>
										))}
									</div>
									<ScrollBar orientation="horizontal" />
								</ScrollArea>
							</div>
						</div>

						{/* Preview with max width constraint */}
						<div className="flex justify-center">
							<div
								style={{ maxWidth: "90vw", maxHeight: "calc(100vh - 400px)" }}
							>
								<ViewportPreview src={iframeSrc} state={state} />
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default MobileResponsiveTester;
