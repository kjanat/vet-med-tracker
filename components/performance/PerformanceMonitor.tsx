"use client";

import { useCallback, useEffect } from "react";

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

			// Send to analytics
			if (typeof window !== "undefined" && window.gtag) {
				Object.entries(metrics).forEach(([name, value]) => {
					if (value !== undefined) {
						window.gtag("event", "web_vitals", {
							custom_parameter_1: name,
							value: Math.round(value),
						});
					}
				});
			}

			// Send to API endpoint
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
		},
		[reportEndpoint, debug],
	);

	useEffect(() => {
		if (typeof window === "undefined") return;

		const metrics: PerformanceMetrics = {};

		// Observe Core Web Vitals
		const observer = new PerformanceObserver((list) => {
			list.getEntries().forEach((entry) => {
				switch (entry.entryType) {
					case "paint":
						if (entry.name === "first-contentful-paint") {
							metrics.FCP = entry.startTime;
						}
						break;
					case "largest-contentful-paint":
						// Get the most recent LCP entry
						metrics.LCP = entry.startTime;
						break;
					case "first-input":
						metrics.FID = entry.processingStart - entry.startTime;
						break;
					case "layout-shift":
						if (!(entry as any).hadRecentInput) {
							metrics.CLS = (metrics.CLS || 0) + (entry as any).value;
						}
						break;
					case "navigation": {
						const navEntry = entry as PerformanceNavigationTiming;
						metrics.TTFB = navEntry.responseStart - navEntry.requestStart;
						break;
					}
				}
			});
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
		} catch (_e) {
			// Fallback for browsers that don't support all entry types
			try {
				observer.observe({ entryTypes: ["paint"] });
			} catch (_e2) {
				// Silent fail
			}
		}

		// Report initial metrics after page load
		const reportInitialMetrics = () => {
			setTimeout(() => {
				reportMetrics(metrics);
			}, 1000);
		};

		if (document.readyState === "complete") {
			reportInitialMetrics();
		} else {
			window.addEventListener("load", reportInitialMetrics);
		}

		// Report final metrics before page unload
		const handleBeforeUnload = () => {
			reportMetrics(metrics);
		};

		window.addEventListener("beforeunload", handleBeforeUnload);

		return () => {
			observer.disconnect();
			window.removeEventListener("load", reportInitialMetrics);
			window.removeEventListener("beforeunload", handleBeforeUnload);
		};
	}, [reportMetrics]);

	return null; // This is a monitoring component with no UI
}

// Bundle size monitoring hook
export function useBundleAnalytics() {
	useEffect(() => {
		if (typeof window === "undefined") return;

		// Monitor chunk loading
		const originalFetch = window.fetch;
		window.fetch = function (...args) {
			const [url] = args;
			if (typeof url === "string" && url.includes("_next/static/chunks/")) {
				const startTime = performance.now();
				return originalFetch.apply(this, args).then((response) => {
					const endTime = performance.now();
					const loadTime = endTime - startTime;

					// Report chunk load time
					if (window.gtag) {
						window.gtag("event", "chunk_load", {
							chunk_url: url,
							load_time: Math.round(loadTime),
						});
					}

					return response;
				});
			}
			return originalFetch.apply(this, args);
		};

		return () => {
			window.fetch = originalFetch;
		};
	}, []);
}

// Resource timing hook
export function useResourceTiming() {
	useEffect(() => {
		if (typeof window === "undefined") return;

		const observer = new PerformanceObserver((list) => {
			list.getEntries().forEach((entry) => {
				if (entry.entryType === "resource") {
					const resource = entry as PerformanceResourceTiming;

					// Report slow resources (>1s)
					if (resource.duration > 1000) {
						if (window.gtag) {
							window.gtag("event", "slow_resource", {
								resource_name: resource.name,
								duration: Math.round(resource.duration),
								size: resource.transferSize || 0,
							});
						}
					}
				}
			});
		});

		try {
			observer.observe({ entryTypes: ["resource"] });
		} catch (_e) {
			// Silent fail for unsupported browsers
		}

		return () => observer.disconnect();
	}, []);
}

// Combined performance monitoring hook
export function usePerformanceMonitoring(
	_options: PerformanceMonitorProps = {},
) {
	useBundleAnalytics();
	useResourceTiming();

	return null;
}
