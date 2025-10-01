import dynamic from "next/dynamic";
import React from "react";

// Lazy loading utilities for heavy dependencies

// Date/time libraries
export const lazyDateFns = {
  addDays: () => import("date-fns").then((mod) => mod.addDays),
  differenceInDays: () =>
    import("date-fns").then((mod) => mod.differenceInDays),
  format: () => import("date-fns").then((mod) => mod.format),
  formatDistanceToNow: () =>
    import("date-fns").then((mod) => mod.formatDistanceToNow),
  parseISO: () => import("date-fns").then((mod) => mod.parseISO),
  subDays: () => import("date-fns").then((mod) => mod.subDays),
};

export const lazyLuxon = {
  DateTime: () => import("luxon").then((mod) => mod.DateTime),
  Duration: () => import("luxon").then((mod) => mod.Duration),
  Interval: () => import("luxon").then((mod) => mod.Interval),
};

// Chart components - these are heavy
export const lazyRecharts = {
  BarChart: () => import("recharts").then((mod) => mod.BarChart),
  CartesianGrid: () => import("recharts").then((mod) => mod.CartesianGrid),
  Cell: () => import("recharts").then((mod) => mod.Cell),
  LineChart: () => import("recharts").then((mod) => mod.LineChart),
  Pie: () => import("recharts").then((mod) => mod.Pie),
  PieChart: () => import("recharts").then((mod) => mod.PieChart),
  ResponsiveContainer: () =>
    import("recharts").then((mod) => mod.ResponsiveContainer),
  Tooltip: () => import("recharts").then((mod) => mod.Tooltip),
  XAxis: () => import("recharts").then((mod) => mod.XAxis),
  YAxis: () => import("recharts").then((mod) => mod.YAxis),
};

// Heavy UI components
export const lazyUIComponents = {
  CommandDialog: () => import("cmdk").then((mod) => mod.Command),
  Dialog: () => import("@radix-ui/react-dialog"),
  EmblaCarousel: () => import("embla-carousel-react"),
  Popover: () => import("@radix-ui/react-popover"),
};

// Utility for creating component-specific lazy loaders
export function createLazyComponent<T = Record<string, unknown>>(
  importFn: () => Promise<{ default: React.ComponentType<T> }>,
  fallback?: React.ComponentType,
) {
  return dynamic(importFn, {
    loading: fallback ? () => React.createElement(fallback) : undefined,
    ssr: false,
  });
}

// Utility for lazy loading with custom loading states
export function createLazyComponentWithLoading<T = Record<string, unknown>>(
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
  importFn: () => Promise<{
    default: React.ComponentType<Record<string, unknown>>;
  }>,
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
