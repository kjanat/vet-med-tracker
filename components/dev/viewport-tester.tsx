"use client";

import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import type React from "react";
import { memo, useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { useMobileDetection } from "@/hooks/shared/useResponsive";
import { calculateScrollAreaHeight, VIEWPORT_CONFIG } from "./viewport/config";
import { withSchemeParam } from "./viewport/constants";
import { DeviceCard } from "./viewport/device-card";
import {
	useDeviceData,
	useDeviceFilters,
	useViewportState,
	useWindowDimensions,
} from "./viewport/hooks";
import { MobileDeviceSelector } from "./viewport/mobile-device-selector";
import { MobileToolbar } from "./viewport/mobile-toolbar";
import { MobileViewportPreview } from "./viewport/mobile-viewport-preview";
import { useViewportShortcuts } from "./viewport/use-viewport-shortcuts";
import { ViewportPreview } from "./viewport/viewport-preview";
import { ViewportToolbar } from "./viewport/viewport-toolbar";

// Memoized device card component for better performance
const MemoizedDeviceCard = memo(DeviceCard);

const MobileResponsiveTester: React.FC = () => {
	// Custom hooks for cleaner organization
	const { devices, loading, error, retry } = useDeviceData();
	const windowDimensions = useWindowDimensions();
	const {
		brands,
		deviceTypes,
		availableDeviceTypes,
		brandFilter,
		deviceTypeFilter,
		filteredDevices,
		setBrandFilter,
		setDeviceTypeFilter,
		resetFilters,
	} = useDeviceFilters(devices);
	const {
		state,
		urlInput,
		setDevice,
		rotate,
		reset: resetViewport,
		applyUrl,
		setUrlInput,
		handleColorSchemeChange,
	} = useViewportState(devices);

	// Local state
	const [layoutMode, setLayoutMode] = useState<"sidebar" | "topbar">(
		VIEWPORT_CONFIG.defaults.layoutMode,
	);
	const [showMobileDeviceSelector, setShowMobileDeviceSelector] =
		useState(false);
	const sidebarRef = useRef<HTMLDivElement>(null);

	// Mobile detection
	const { isMobile } = useMobileDetection();

	// Combined reset handler
	const handleFullReset = () => {
		resetViewport();
		resetFilters();
	};

	// Open in new tab handler
	const handleOpenInNewTab = useCallback(() => {
		window.open(state.baseUrl, "_blank");
	}, [state.baseUrl]);

	// Find current device
	const currentDevice = filteredDevices.find(
		(device) =>
			device.labels.primary === state.name &&
			(device.properties.brand || "Unknown") === state.brand,
	);

	// Compute iframe source
	const iframeSrc = withSchemeParam(state.baseUrl);

	// Keyboard shortcuts
	useViewportShortcuts({
		onRotate: rotate,
		onReset: handleFullReset,
		onOpenDeviceSelector: isMobile
			? () => setShowMobileDeviceSelector(true)
			: undefined,
	});

	// Loading state
	if (loading) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background">
				<div className="text-center">
					<Loader2 className="mx-auto mb-4 h-12 w-12 animate-spin text-primary" />
					<p className="text-muted-foreground">Loading device data...</p>
					<p className="mt-2 text-muted-foreground text-sm">
						Fetching viewport configurations...
					</p>
				</div>
			</div>
		);
	}

	// Error state with retry
	if (error) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-background">
				<div className="flex max-w-md flex-col items-center text-center">
					<AlertCircle className="mb-4 h-12 w-12 text-destructive" />
					<h2 className="mb-2 font-semibold text-lg">Failed to Load Devices</h2>
					<p className="mb-4 text-muted-foreground text-sm">{error}</p>
					<Button
						onClick={retry}
						variant="outline"
						className="flex items-center gap-2"
					>
						<RefreshCw className="h-4 w-4" />
						Try Again
					</Button>
				</div>
			</div>
		);
	}

	// Main render
	const useSidebar = layoutMode === "sidebar" && !isMobile;

	// Calculate dynamic height for ScrollArea
	const scrollAreaStyle = {
		height: useSidebar
			? `${calculateScrollAreaHeight(state.height, windowDimensions.height)}px`
			: undefined,
		maxHeight: "calc(100vh - 8rem)",
		transition: `height ${VIEWPORT_CONFIG.transitions.layoutChange}ms ease-in-out`,
	};

	// Mobile layout
	if (isMobile) {
		return (
			<>
				<div className="fixed inset-0 flex flex-col bg-background">
					<MobileToolbar
						state={state}
						deviceCount={filteredDevices.length}
						onRotate={rotate}
						onColorSchemeChange={handleColorSchemeChange}
						onOpenDeviceSelector={() => setShowMobileDeviceSelector(true)}
						onOpenInNewTab={handleOpenInNewTab}
					/>

					{/* Mobile Preview - use remaining height */}
					<div className="relative min-h-0 flex-1">
						<MobileViewportPreview src={iframeSrc} state={state} />
					</div>
				</div>

				{/* Mobile Device Selector Modal */}
				{showMobileDeviceSelector && (
					<MobileDeviceSelector
						devices={filteredDevices}
						selectedDevice={currentDevice || null}
						onSelectDevice={setDevice}
						onClose={() => setShowMobileDeviceSelector(false)}
					/>
				)}
			</>
		);
	}

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
				onReset={handleFullReset}
				onResetFilters={resetFilters}
				onLayoutModeChange={setLayoutMode}
			/>

			{/* Main content */}
			<div className="flex flex-1 overflow-hidden">
				{useSidebar ? (
					<>
						{/* Sidebar layout */}
						<div ref={sidebarRef} className="flex w-96 flex-col border-r">
							<ScrollArea style={scrollAreaStyle} className="flex-1">
								<div className="grid gap-2 p-4">
									{filteredDevices.map((device) => (
										<MemoizedDeviceCard
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
						<div
							className="flex flex-1 items-center justify-center bg-muted/5"
							style={{ padding: `${VIEWPORT_CONFIG.preview.padding}px` }}
						>
							<ViewportPreview src={iframeSrc} state={state} />
						</div>
					</>
				) : (
					/* Topbar layout */
					<div className="flex-1 overflow-auto p-8">
						{/* Device grid above preview */}
						<div className="mx-auto mb-8 max-w-7xl">
							<div className="rounded-lg border bg-card">
								<ScrollArea className="w-full">
									<div
										className="flex"
										style={{
											gap: `${VIEWPORT_CONFIG.deviceGrid.gap}px`,
											padding: `${VIEWPORT_CONFIG.deviceGrid.padding}px`,
										}}
									>
										{filteredDevices.map((device) => (
											<div
												key={device.id}
												style={{
													width: `${VIEWPORT_CONFIG.deviceGrid.cardWidth}px`,
												}}
												className="flex-shrink-0"
											>
												<MemoizedDeviceCard
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
						<div className="flex justify-center bg-muted/5 px-8">
							<div
								style={{
									maxWidth: `${VIEWPORT_CONFIG.preview.maxWidthPercent}vw`,
									maxHeight: `calc(100vh - ${VIEWPORT_CONFIG.preview.topbarMaxHeight}px)`,
								}}
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
