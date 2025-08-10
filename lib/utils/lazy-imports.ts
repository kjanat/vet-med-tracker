import { dynamic } from "next/dynamic";

// Lazy loading utilities for heavy dependencies

// Date/time libraries
export const lazyDateFns = {
	format: () => import("date-fns").then((mod) => mod.format),
	parseISO: () => import("date-fns").then((mod) => mod.parseISO),
	formatDistanceToNow: () =>
		import("date-fns").then((mod) => mod.formatDistanceToNow),
	addDays: () => import("date-fns").then((mod) => mod.addDays),
	subDays: () => import("date-fns").then((mod) => mod.subDays),
	differenceInDays: () =>
		import("date-fns").then((mod) => mod.differenceInDays),
};

export const lazyLuxon = {
	DateTime: () => import("luxon").then((mod) => mod.DateTime),
	Duration: () => import("luxon").then((mod) => mod.Duration),
	Interval: () => import("luxon").then((mod) => mod.Interval),
};

// Chart components - these are heavy
export const lazyRecharts = {
	PieChart: () => import("recharts").then((mod) => mod.PieChart),
	BarChart: () => import("recharts").then((mod) => mod.BarChart),
	LineChart: () => import("recharts").then((mod) => mod.LineChart),
	XAxis: () => import("recharts").then((mod) => mod.XAxis),
	YAxis: () => import("recharts").then((mod) => mod.YAxis),
	CartesianGrid: () => import("recharts").then((mod) => mod.CartesianGrid),
	Tooltip: () => import("recharts").then((mod) => mod.Tooltip),
	ResponsiveContainer: () =>
		import("recharts").then((mod) => mod.ResponsiveContainer),
	Cell: () => import("recharts").then((mod) => mod.Cell),
	Pie: () => import("recharts").then((mod) => mod.Pie),
};

// Heavy UI components
export const lazyUIComponents = {
	EmblaCarousel: () => import("embla-carousel-react"),
	CommandDialog: () => import("cmdk").then((mod) => mod.Command),
	Popover: () => import("@radix-ui/react-popover"),
	Dialog: () => import("@radix-ui/react-dialog"),
};

// Utility for creating component-specific lazy loaders
export function createLazyComponent<T = any>(
	importFn: () => Promise<{ default: React.ComponentType<T> }>,
	fallback?: React.ComponentType,
) {
	return dynamic(importFn, {
		loading: fallback ? () => React.createElement(fallback) : undefined,
		ssr: false,
	});
}

// Utility for lazy loading with custom loading states
export function createLazyComponentWithLoading<T = any>(
	importFn: () => Promise<{ default: React.ComponentType<T> }>,
	LoadingComponent: React.ComponentType,
) {
	return dynamic(importFn, {
		loading: () => React.createElement(LoadingComponent),
		ssr: false,
	});
}

// For non-component modules that need to be lazy loaded
export async function lazyImport<T>(importFn: () => Promise<T>): Promise<T> {
	try {
		return await importFn();
	} catch (error) {
		console.error("Failed to lazy import:", error);
		throw error;
	}
}

// Preload utilities for critical paths
export function preloadComponent(
	importFn: () => Promise<{ default: React.ComponentType<any> }>,
) {
	// Preload during idle time
	if (typeof window !== "undefined" && "requestIdleCallback" in window) {
		window.requestIdleCallback(() => {
			importFn().catch(() => {
				// Silently fail preloads
			});
		});
	}
}

export function preloadModule<T>(importFn: () => Promise<T>) {
	if (typeof window !== "undefined" && "requestIdleCallback" in window) {
		window.requestIdleCallback(() => {
			importFn().catch(() => {
				// Silently fail preloads
			});
		});
	}
}
