"use client";

import { useCallback, useEffect } from "react";

// Type declarations for global gtag function
declare global {
  interface Window {
    gtag?: (
      command: string,
      targetId: string,
      config?: Record<string, unknown>,
    ) => void;
  }
}

// Type definitions for performance entries with required properties
interface PerformanceEntryWithProcessing extends PerformanceEntry {
  processingStart: number;
}

interface LayoutShiftEntry extends PerformanceEntry {
  hadRecentInput: boolean;
  value: number;
}

interface PerformanceMetrics {
  FCP?: number; // First Contentful Paint
  LCP?: number; // Largest Contentful Paint
  FID?: number; // First Input Delay
  CLS?: number; // Cumulative Layout Shift
  TTFB?: number; // Time to First Byte
}

interface PerformanceMonitorProps {
  reportEndpoint?: string;
  debug?: boolean;
}

export function PerformanceMonitor({
  reportEndpoint = "/api/performance",
  debug = false,
}: PerformanceMonitorProps) {
  const reportMetrics = useCallback(
    (metrics: PerformanceMetrics) => {
      if (debug) {
        console.log("Performance Metrics:", metrics);
      }

      sendMetricsToAnalytics(metrics);
      sendMetricsToEndpoint(metrics, reportEndpoint);
    },
    [reportEndpoint, debug],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;

    const metrics: PerformanceMetrics = {};
    const cleanup = setupPerformanceMonitoring(metrics, reportMetrics);

    return cleanup;
  }, [reportMetrics]);

  return null; // This is a monitoring component with no UI
}

/**
 * Send metrics to analytics (gtag)
 */
function sendMetricsToAnalytics(metrics: PerformanceMetrics): void {
  if (window?.gtag) {
    Object.entries(metrics).forEach(([name, value]) => {
      if (value !== undefined) {
        window.gtag?.("event", "web_vitals", {
          custom_parameter_1: name,
          value: Math.round(value),
        });
      }
    });
  }
}

/**
 * Send metrics to API endpoint
 */
function sendMetricsToEndpoint(
  metrics: PerformanceMetrics,
  reportEndpoint?: string,
): void {
  if (reportEndpoint) {
    fetch(reportEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        metrics,
        url: window.location.href,
        userAgent: navigator.userAgent,
        timestamp: Date.now(),
      }),
    }).catch(() => {
      // Silently fail - don't block user experience
    });
  }
}

/**
 * Setup performance monitoring with observers and event listeners
 */
function setupPerformanceMonitoring(
  metrics: PerformanceMetrics,
  reportMetrics: (metrics: PerformanceMetrics) => void,
): () => void {
  const entryHandlers = createEntryHandlers(metrics);
  const observer = createPerformanceObserver(entryHandlers);
  const eventCleanup = setupEventListeners(reportMetrics, metrics);

  return () => {
    observer.disconnect();
    eventCleanup();
  };
}

/**
 * Create entry handlers for different performance entry types
 */
function createEntryHandlers(metrics: PerformanceMetrics) {
  return {
    handlePaintEntry: (entry: PerformanceEntry) => {
      if (entry.name === "first-contentful-paint") {
        metrics.FCP = entry.startTime;
      }
    },

    handleLCPEntry: (entry: PerformanceEntry) => {
      metrics.LCP = entry.startTime;
    },

    handleFIDEntry: (entry: PerformanceEntry) => {
      const fidEntry = entry as PerformanceEntryWithProcessing;
      metrics.FID = fidEntry.processingStart - fidEntry.startTime;
    },

    handleLayoutShiftEntry: (entry: PerformanceEntry) => {
      const clsEntry = entry as LayoutShiftEntry;
      if (!clsEntry.hadRecentInput) {
        metrics.CLS = (metrics.CLS || 0) + clsEntry.value;
      }
    },

    handleNavigationEntry: (entry: PerformanceEntry) => {
      const navEntry = entry as PerformanceNavigationTiming;
      metrics.TTFB = navEntry.responseStart - navEntry.requestStart;
    },
  };
}

/**
 * Create performance observer with entry processing
 */
function createPerformanceObserver(
  entryHandlers: ReturnType<typeof createEntryHandlers>,
): PerformanceObserver {
  const processPerformanceEntry = (entry: PerformanceEntry) => {
    switch (entry.entryType) {
      case "paint":
        entryHandlers.handlePaintEntry(entry);
        break;
      case "largest-contentful-paint":
        entryHandlers.handleLCPEntry(entry);
        break;
      case "first-input":
        entryHandlers.handleFIDEntry(entry);
        break;
      case "layout-shift":
        entryHandlers.handleLayoutShiftEntry(entry);
        break;
      case "navigation":
        entryHandlers.handleNavigationEntry(entry);
        break;
    }
  };

  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach(processPerformanceEntry);
  });

  // Observe all relevant entry types
  try {
    observer.observe({
      entryTypes: [
        "paint",
        "largest-contentful-paint",
        "first-input",
        "layout-shift",
        "navigation",
      ],
    });
  } catch {
    // Fallback for browsers that don't support all entry types
    try {
      observer.observe({ entryTypes: ["paint"] });
    } catch {
      // Silent fail
    }
  }

  return observer;
}

/**
 * Setup event listeners for load and beforeunload events
 */
function setupEventListeners(
  reportMetrics: (metrics: PerformanceMetrics) => void,
  metrics: PerformanceMetrics,
): () => void {
  const reportInitialMetrics = () => {
    setTimeout(() => {
      reportMetrics(metrics);
    }, 1000);
  };

  const handleBeforeUnload = () => {
    reportMetrics(metrics);
  };

  if (document.readyState === "complete") {
    reportInitialMetrics();
  } else {
    window.addEventListener("load", reportInitialMetrics);
  }

  window.addEventListener("beforeunload", handleBeforeUnload);

  return () => {
    window.removeEventListener("load", reportInitialMetrics);
    window.removeEventListener("beforeunload", handleBeforeUnload);
  };
}

// Bundle size monitoring hook
export function useBundleAnalytics() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Monitor chunk loading
    const originalFetch = window.fetch;
    const instrumentedFetch = (
      input: Parameters<typeof window.fetch>[0],
      init?: Parameters<typeof window.fetch>[1],
    ) => {
      const targetUrl =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.href
            : input instanceof Request
              ? input.url
              : String(input);

      if (targetUrl.includes("_next/static/chunks/")) {
        const startTime = performance.now();
        return originalFetch.call(window, input, init).then((response) => {
          const endTime = performance.now();
          const loadTime = endTime - startTime;

          // Report chunk load time
          if (window.gtag) {
            window.gtag?.("event", "chunk_load", {
              chunk_url: targetUrl,
              load_time: Math.round(loadTime),
            });
          }

          return response;
        });
      }

      return originalFetch.call(window, input, init);
    };

    const patchedFetch = Object.assign(
      instrumentedFetch,
      originalFetch,
    ) as typeof window.fetch;
    window.fetch = patchedFetch;

    return () => {
      window.fetch = originalFetch;
    };
  }, []);
}

// Resource timing hook
export function useResourceTiming() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const observer = createResourceObserver();
    return setupResourceObserver(observer);
  }, []);
}

function createResourceObserver(): PerformanceObserver {
  return new PerformanceObserver((list) => {
    list.getEntries().forEach(processResourceEntry);
  });
}

function processResourceEntry(entry: PerformanceEntry) {
  if (entry.entryType === "resource") {
    const resource = entry as PerformanceResourceTiming;
    reportSlowResource(resource);
  }
}

function reportSlowResource(resource: PerformanceResourceTiming) {
  // Report slow resources (>1s)
  if (resource.duration > 1000) {
    if (window.gtag) {
      window.gtag?.("event", "slow_resource", {
        resource_name: resource.name,
        duration: Math.round(resource.duration),
        size: resource.transferSize || 0,
      });
    }
  }
}

function setupResourceObserver(observer: PerformanceObserver): () => void {
  try {
    observer.observe({ entryTypes: ["resource"] });
  } catch {
    // Silent fail for unsupported browsers
  }

  return () => observer.disconnect();
}

// Combined performance monitoring hook
export function usePerformanceMonitoring(
  // Options parameter is currently unused but preserved for future functionality
  _options: PerformanceMonitorProps = {},
) {
  useBundleAnalytics();
  useResourceTiming();

  return null;
}
