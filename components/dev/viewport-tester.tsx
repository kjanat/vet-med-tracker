"use client";

import { AlertCircle, Loader2, RefreshCw, RotateCw } from "lucide-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";

interface DeviceItem {
	id: string;
	slug: string;
	active: boolean;
	labels: {
		primary: string;
		secondary: string;
	};
	tags: string[];
	attributes: {
		ranking: {
			amongAll: number;
			amongBrand: number;
		};
		icons: string[];
		width: number;
		height: number;
	};
	properties: {
		screen: {
			width: number;
			height: number;
		};
		viewport: {
			width: number;
			height: number;
		};
		releaseDate: string;
		discontinuedDate: string | null;
		devicePixelRatio: number;
		operatingSystem: string;
		deviceType: string;
		brand: string;
	};
}

type ColorScheme = "system" | "light" | "dark";
type Orientation = "portrait" | "landscape";

interface AppState {
	width: number;
	height: number;
	brand: string;
	name: string;
	orientation: Orientation;
	scheme: ColorScheme;
	baseUrl: string;
	deviceType: string;
}

const MobileResponsiveTester: React.FC = () => {
	const [devices, setDevices] = useState<DeviceItem[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);

	const [state, setState] = useState<AppState>({
		width: 375,
		height: 667,
		brand: "Apple",
		name: "iPhone SE",
		orientation: "portrait",
		scheme: "system",
		baseUrl: "http://localhost:3000/",
		deviceType: "phone",
	});

	const [brandFilter, setBrandFilter] = useState<string>("All");
	const [deviceTypeFilter, setDeviceTypeFilter] = useState<string>("All");
	const [urlInput, setUrlInput] = useState(state.baseUrl);

	useEffect(() => {
		const fetchDevices = async () => {
			try {
				const response = await fetch(
					"https://cdn.jsdelivr.net/gh/bitcomplete/labs-viewports@refs/heads/main/items.json",
				);
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

	const brands = useMemo(() => {
		const uniqueBrands = Array.from(
			new Set(devices.map((d) => d.properties.brand)),
		);
		return ["All", ...uniqueBrands.sort()];
	}, [devices]);

	const deviceTypes = useMemo(() => {
		const types = Array.from(
			new Set(devices.map((d) => d.properties.deviceType)),
		);
		return ["All", ...types.sort()];
	}, [devices]);

	const filteredDevices = useMemo(() => {
		return devices
			.filter((device) => {
				const brandMatch =
					brandFilter === "All" || device.properties.brand === brandFilter;
				const typeMatch =
					deviceTypeFilter === "All" ||
					device.properties.deviceType === deviceTypeFilter;
				return brandMatch && typeMatch;
			})
			.sort(
				(a, b) => a.attributes.ranking.amongAll - b.attributes.ranking.amongAll,
			);
	}, [devices, brandFilter, deviceTypeFilter]);

	const isPortrait = state.height > state.width;

	const withSchemeParam = (url: string, scheme: ColorScheme): string => {
		try {
			const u = new URL(url);
			if (scheme !== "system") {
				u.searchParams.set("simulatedPrefersColorScheme", scheme);
			} else {
				u.searchParams.delete("simulatedPrefersColorScheme");
			}
			return u.toString();
		} catch {
			const sep = url.includes("?") ? "&" : "?";
			return scheme !== "system"
				? `${url}${sep}simulatedPrefersColorScheme=${scheme}`
				: url;
		}
	};

	const setDevice = (device: DeviceItem) => {
		const { width, height } = device.attributes;
		setState((prev) => ({
			...prev,
			width,
			height,
			brand: device.properties.brand,
			name: device.labels.primary,
			orientation: width >= height ? "landscape" : "portrait",
			deviceType: device.properties.deviceType,
		}));
	};

	const rotate = () => {
		setState((prev) => ({
			...prev,
			width: prev.height,
			height: prev.width,
			orientation: prev.orientation === "portrait" ? "landscape" : "portrait",
		}));
	};

	const reset = () => {
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
	};

	const applyUrl = () => {
		setState((prev) => ({ ...prev, baseUrl: urlInput }));
	};

	const iframeSrc = withSchemeParam(state.baseUrl, state.scheme);

	const getDeviceIcon = (device: DeviceItem) => {
		if (device.properties.deviceType === "phone") return "📱";
		if (device.properties.deviceType === "tablet") return "📋";
		if (device.properties.deviceType === "desktop") return "🖥️";
		if (device.properties.deviceType === "laptop") return "💻";
		return "📱";
	};

	const DeviceButtons = () => (
		<div
			className={
				isPortrait
					? "space-y-2"
					: "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2"
			}
		>
			{filteredDevices.map((device) => (
				<button
					type="button"
					key={device.id}
					onClick={() => setDevice(device)}
					className={`bg-gray-800 border border-gray-700 p-3 rounded-lg text-left hover:bg-gray-700 transition-colors ${
						device.labels.primary === state.name &&
						device.properties.brand === state.brand
							? "border-blue-500 bg-gray-700"
							: ""
					}`}
				>
					<div className="flex items-start justify-between">
						<div className="flex-1">
							<div className="font-semibold text-sm flex items-center gap-1">
								<span className="text-lg">{getDeviceIcon(device)}</span>
								{device.labels.primary}
							</div>
							<div className="text-gray-400 text-xs mt-1">
								{device.properties.brand} · {device.attributes.width}×
								{device.attributes.height}
							</div>
							<div className="text-gray-500 text-xs mt-1">
								DPR: {device.properties.devicePixelRatio} ·{" "}
								{device.properties.operatingSystem}
							</div>
						</div>
					</div>
				</button>
			))}
		</div>
	);

	if (loading) {
		return (
			<div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
				<div className="text-center">
					<Loader2 className="animate-spin mx-auto mb-4" size={48} />
					<p>Loading device data...</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
				<div className="text-center">
					<AlertCircle className="mx-auto mb-4 text-red-500" size={48} />
					<p className="text-red-400">{error}</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-gray-900 text-gray-100 flex flex-col">
			<style jsx>{`
        :global(body) {
          margin: 0;
          font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
        }
      `}</style>

			{/* Toolbar */}
			<div className="bg-gray-800 p-3 shadow-lg">
				<div className="grid grid-cols-1 lg:grid-cols-3 gap-3 items-center">
					{/* Title */}
					<div className="flex items-baseline gap-2">
						<h2 className="text-xl font-bold m-0">Mobile Responsive Tester</h2>
						<span className="text-gray-400 text-sm">
							{filteredDevices.length} of {devices.length} devices
						</span>
					</div>

					{/* Filters & Theme */}
					<div className="flex items-center gap-2 flex-wrap">
						<select
							value={brandFilter}
							onChange={(e) => setBrandFilter(e.target.value)}
							className="bg-gray-900 border border-gray-700 text-gray-100 px-2 py-1.5 rounded-lg text-sm"
							title="Filter by brand"
						>
							{brands.map((brand) => (
								<option key={brand} value={brand}>
									{brand === "All" ? "All Brands" : brand}
								</option>
							))}
						</select>

						<select
							value={deviceTypeFilter}
							onChange={(e) => setDeviceTypeFilter(e.target.value)}
							className="bg-gray-900 border border-gray-700 text-gray-100 px-2 py-1.5 rounded-lg text-sm"
							title="Filter by device type"
						>
							{deviceTypes.map((type) => (
								<option key={type} value={type}>
									{type === "All" ? "All Types" : type}
								</option>
							))}
						</select>

						<div className="inline-flex border border-gray-700 rounded-lg overflow-hidden ml-2">
							{(["system", "light", "dark"] as ColorScheme[]).map((scheme) => (
								<button
									type="button"
									key={scheme}
									onClick={() => setState((prev) => ({ ...prev, scheme }))}
									className={`px-3 py-1.5 text-sm capitalize transition-colors ${
										state.scheme === scheme
											? "bg-blue-600 text-white"
											: "bg-gray-900 text-gray-300 hover:bg-gray-800"
									}`}
								>
									{scheme}
								</button>
							))}
						</div>
					</div>

					{/* URL controls */}
					<div className="flex items-center gap-2">
						<input
							type="text"
							value={urlInput}
							onChange={(e) => setUrlInput(e.target.value)}
							className="flex-1 bg-gray-900 border border-gray-700 text-gray-100 px-3 py-1.5 rounded-lg text-sm"
							placeholder="Enter URL..."
						/>
						<button
							type="button"
							onClick={applyUrl}
							className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-blue-700 transition-colors"
						>
							Load
						</button>
						<button
							type="button"
							onClick={rotate}
							className="bg-gray-700 text-gray-100 p-1.5 rounded-lg hover:bg-gray-600 transition-colors"
							title="Rotate device"
						>
							<RotateCw size={16} />
						</button>
						<button
							type="button"
							onClick={reset}
							className="bg-gray-700 text-gray-100 p-1.5 rounded-lg hover:bg-gray-600 transition-colors"
							title="Reset all"
						>
							<RefreshCw size={16} />
						</button>
					</div>
				</div>
			</div>

			{/* Main content area */}
			<div className="flex-1 flex overflow-hidden">
				{isPortrait ? (
					<>
						{/* Sidebar for portrait mode */}
						<div className="w-96 bg-gray-850 border-r border-gray-700 overflow-y-auto p-4">
							<DeviceButtons />
						</div>

						{/* Preview area */}
						<div className="flex-1 flex flex-col items-center justify-center p-5">
							<iframe
								src={iframeSrc}
								width={state.width}
								height={state.height}
								className="border-2 border-gray-700 rounded-xl shadow-2xl bg-white"
								title="Device Preview"
							/>

							{/* Info */}
							<div className="text-center mt-3 text-gray-400 text-sm">
								{state.width} × {state.height} — {state.brand} {state.name} [
								{state.orientation}] · {state.deviceType} · scheme:{" "}
								{state.scheme}
							</div>
						</div>
					</>
				) : (
					<div className="flex-1 p-5 overflow-auto">
						{/* Device buttons above preview for landscape */}
						<div className="mb-4 max-w-7xl mx-auto">
							<DeviceButtons />
						</div>

						{/* Preview iframe */}
						<div className="flex justify-center">
							<iframe
								src={iframeSrc}
								width={state.width}
								height={state.height}
								className="border-2 border-gray-700 rounded-xl shadow-2xl bg-white"
								title="Device Preview"
							/>
						</div>

						{/* Info */}
						<div className="text-center mt-3 text-gray-400 text-sm">
							{state.width} × {state.height} — {state.brand} {state.name} [
							{state.orientation}] · {state.deviceType} · scheme: {state.scheme}
						</div>
					</div>
				)}
			</div>
		</div>
	);
};

export default MobileResponsiveTester;
