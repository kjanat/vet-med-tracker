/**
 * Client-side error tracking and reporting
 *
 * This module provides error tracking capabilities for the browser environment,
 * including automatic error capture, user context, and feature flag reporting.
 */

import { getClientFeatureFlags } from "@/lib/feature-flags";

export interface ErrorReport {
	error: string;
	message: string;
	stack?: string;
	name?: string;
	line?: number;
	column?: number;
	filename?: string;
	url: string;
	userAgent: string;
	timestamp: string;
	severity: "low" | "normal" | "high" | "critical";
	userId?: string;
	sessionId?: string;
	featureFlags?: Record<string, boolean>;
	context?: Record<string, any>;
}

/**
 * Error tracking service configuration
 */
interface ErrorTrackingConfig {
	enabled: boolean;
	endpoint: string;
	maxReports: number;
	reportInterval: number;
	includeFeatureFlags: boolean;
	includeUserContext: boolean;
	filters: {
		ignoreUrls: RegExp[];
		ignoreMessages: RegExp[];
	};
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: ErrorTrackingConfig = {
	enabled:
		typeof window !== "undefined" && process.env.NODE_ENV === "production",
	endpoint: "/api/monitoring",
	maxReports: 10, // Max reports per session to prevent spam
	reportInterval: 60000, // 1 minute minimum between identical reports
	includeFeatureFlags: true,
	includeUserContext: true,
	filters: {
		ignoreUrls: [
			/chrome-extension:\/\//,
			/moz-extension:\/\//,
			/safari-extension:\/\//,
		],
		ignoreMessages: [
			/Script error/,
			/Non-Error promise rejection captured/,
			/ResizeObserver loop limit exceeded/,
		],
	},
};

/**
 * Error tracking service
 */
class ErrorTrackingService {
	private config: ErrorTrackingConfig;
	private reportCount: number = 0;
	private reportedErrors: Map<string, number> = new Map();
	private sessionId: string;

	constructor(config: Partial<ErrorTrackingConfig> = {}) {
		this.config = { ...DEFAULT_CONFIG, ...config };
		this.sessionId = this.generateSessionId();

		if (this.config.enabled) {
			this.setupGlobalErrorHandlers();
		}
	}

	/**
	 * Generate unique session ID
	 */
	private generateSessionId(): string {
		return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Setup global error handlers
	 */
	private setupGlobalErrorHandlers(): void {
		if (typeof window === "undefined") return;

		// Handle JavaScript errors
		window.addEventListener("error", (event) => {
			this.reportError({
				error: event.error?.toString() || "Unknown error",
				message: event.message,
				stack: event.error?.stack,
				name: event.error?.name,
				line: event.lineno,
				column: event.colno,
				filename: event.filename,
				severity: "high",
			});
		});

		// Handle unhandled promise rejections
		window.addEventListener("unhandledrejection", (event) => {
			this.reportError({
				error: event.reason?.toString() || "Unhandled promise rejection",
				message: event.reason?.message || "Promise rejected",
				stack: event.reason?.stack,
				name: "UnhandledPromiseRejection",
				severity: "high",
			});
		});

		// Handle React error boundary errors (if you're using React)
		if (typeof window !== "undefined" && (window as any).React) {
			const originalConsoleError = console.error;
			console.error = (...args) => {
				// Check if this looks like a React error
				if (
					args[0] &&
					typeof args[0] === "string" &&
					args[0].includes("React")
				) {
					this.reportError({
						error: args.join(" "),
						message: "React error caught",
						severity: "normal",
					});
				}
				originalConsoleError.apply(console, args);
			};
		}
	}

	/**
	 * Check if error should be filtered out
	 */
	private shouldIgnoreError(errorData: Partial<ErrorReport>): boolean {
		// Check URL filters
		if (errorData.filename) {
			for (const urlFilter of this.config.filters.ignoreUrls) {
				if (urlFilter.test(errorData.filename)) {
					return true;
				}
			}
		}

		// Check message filters
		if (errorData.message || errorData.error) {
			const message = errorData.message || errorData.error || "";
			for (const messageFilter of this.config.filters.ignoreMessages) {
				if (messageFilter.test(message)) {
					return true;
				}
			}
		}

		return false;
	}

	/**
	 * Report an error
	 */
	public async reportError(errorData: Partial<ErrorReport>): Promise<void> {
		if (!this.config.enabled) return;

		// Check rate limits
		if (this.reportCount >= this.config.maxReports) {
			console.warn("Error reporting rate limit exceeded");
			return;
		}

		// Check if we should ignore this error
		if (this.shouldIgnoreError(errorData)) {
			return;
		}

		// Check for duplicate errors
		const errorKey = `${errorData.message || errorData.error}_${errorData.filename}_${errorData.line}`;
		const lastReported = this.reportedErrors.get(errorKey) || 0;
		const now = Date.now();

		if (now - lastReported < this.config.reportInterval) {
			return; // Skip duplicate error within interval
		}

		try {
			// Build complete error report
			const report: ErrorReport = {
				error: errorData.error || "Unknown error",
				message: errorData.message || errorData.error || "No message",
				stack: errorData.stack,
				name: errorData.name,
				line: errorData.line,
				column: errorData.column,
				filename: errorData.filename,
				url: typeof window !== "undefined" ? window.location.href : "unknown",
				userAgent:
					typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
				timestamp: new Date().toISOString(),
				severity: errorData.severity || "normal",
				sessionId: this.sessionId,
				userId: await this.getUserId(),
				featureFlags: this.config.includeFeatureFlags
					? await this.getFeatureFlags()
					: undefined,
				context: errorData.context,
			};

			// Send error report
			const response = await fetch(this.config.endpoint, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(report),
			});

			if (response.ok) {
				this.reportCount++;
				this.reportedErrors.set(errorKey, now);
				console.debug("Error reported successfully");
			} else {
				console.warn("Failed to report error:", response.status);
			}
		} catch (error) {
			console.error("Failed to send error report:", error);
		}
	}

	/**
	 * Get current user ID (integrate with your auth system)
	 */
	private async getUserId(): Promise<string | undefined> {
		try {
			// This would integrate with your authentication system
			// For Stack Auth, you might do something like:
			// const user = await stackApp.getUser();
			// return user?.id;

			// For now, return undefined
			return undefined;
		} catch {
			return undefined;
		}
	}

	/**
	 * Get current feature flags
	 */
	private async getFeatureFlags(): Promise<
		Record<string, boolean> | undefined
	> {
		try {
			const response = await fetch("/api/feature-flags");
			if (response.ok) {
				const data = await response.json();
				return data.flags;
			}
		} catch {
			// Fallback to client flags if API fails
			try {
				return getClientFeatureFlags() as Record<string, boolean>;
			} catch {
				return undefined;
			}
		}

		return undefined;
	}

	/**
	 * Manually report an error with context
	 */
	public captureError(
		error: Error,
		context?: Record<string, any>,
		severity?: ErrorReport["severity"],
	): void {
		this.reportError({
			error: error.toString(),
			message: error.message,
			stack: error.stack,
			name: error.name,
			severity: severity || "normal",
			context,
		});
	}

	/**
	 * Report a custom message
	 */
	public captureMessage(
		message: string,
		severity: ErrorReport["severity"] = "normal",
		context?: Record<string, any>,
	): void {
		this.reportError({
			error: message,
			message,
			severity,
			context,
		});
	}

	/**
	 * Add context to future error reports
	 */
	public setContext(key: string, value: any): void {
		// This would be implemented to store context that gets added to all future reports
		// For now, just log it
		console.debug("Error tracking context set:", key, value);
	}

	/**
	 * Clear all context
	 */
	public clearContext(): void {
		console.debug("Error tracking context cleared");
	}
}

/**
 * Global error tracking instance
 */
export const errorTracker = new ErrorTrackingService();

/**
 * React error boundary integration
 */
export function reportReactError(error: Error, errorInfo: any): void {
	errorTracker.captureError(
		error,
		{
			componentStack: errorInfo.componentStack,
			errorBoundary: true,
		},
		"high",
	);
}

/**
 * Next.js error page integration
 */
export function reportNextError(error: Error, statusCode?: number): void {
	errorTracker.captureError(
		error,
		{
			statusCode,
			nextjs: true,
		},
		statusCode && statusCode >= 500 ? "high" : "normal",
	);
}

/**
 * Performance monitoring helpers
 */
export function reportPerformanceIssue(
	metric: string,
	value: number,
	threshold: number,
): void {
	if (value > threshold) {
		errorTracker.captureMessage(
			`Performance threshold exceeded: ${metric} = ${value}ms (threshold: ${threshold}ms)`,
			"normal",
			{ metric, value, threshold, performance: true },
		);
	}
}

/**
 * Initialize error tracking (call this early in your app)
 */
export function initializeErrorTracking(
	config?: Partial<ErrorTrackingConfig>,
): void {
	if (typeof window === "undefined") return;

	const tracker = new ErrorTrackingService(config);

	// Replace global instance
	Object.assign(errorTracker, tracker);

	console.debug("Error tracking initialized");
}

export type { ErrorReport, ErrorTrackingConfig };
