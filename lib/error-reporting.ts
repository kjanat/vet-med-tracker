/**
 * Error reporting utility for centralized error handling
 * Integrates with error tracking services (e.g., Sentry) in production
 */

interface ErrorContext {
	userId?: string;
	householdId?: string;
	animalId?: string;
	errorBoundary?: string;
	componentStack?: string;
	errorInfo?: React.ErrorInfo;
}

interface ErrorReport {
	message: string;
	stack?: string;
	context: ErrorContext;
	timestamp: string;
	userAgent: string;
	url: string;
}

class ErrorReporter {
	private static instance: ErrorReporter;
	private queue: ErrorReport[] = [];
	private isOnline = true;

	private constructor() {
		if (typeof window !== "undefined") {
			window.addEventListener("online", () => {
				this.isOnline = true;
				this.flushQueue();
			});
			window.addEventListener("offline", () => {
				this.isOnline = false;
			});
		}
	}

	static getInstance(): ErrorReporter {
		if (!ErrorReporter.instance) {
			ErrorReporter.instance = new ErrorReporter();
		}
		return ErrorReporter.instance;
	}

	/**
	 * Report an error to the error tracking service
	 */
	report(error: Error, context: ErrorContext = {}): void {
		const report: ErrorReport = {
			message: error.message,
			stack: error.stack,
			context,
			timestamp: new Date().toISOString(),
			userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
			url: typeof window !== "undefined" ? window.location.href : "",
		};

		// In development, log to console
		if (process.env.NODE_ENV === "development") {
			console.error("Error Report:", {
				error,
				context,
				report,
			});
		}

		// In production, send to error tracking service
		if (process.env.NODE_ENV === "production") {
			if (this.isOnline) {
				this.sendReport(report);
			} else {
				// Queue for later if offline
				this.queue.push(report);
			}
		}
	}

	/**
	 * Log a warning (non-fatal error)
	 */
	warn(message: string, context: ErrorContext = {}): void {
		if (process.env.NODE_ENV === "development") {
			console.warn("Warning:", message, context);
		}

		// In production, could send to logging service
		if (process.env.NODE_ENV === "production") {
			// TODO: Implement warning logging
		}
	}

	/**
	 * Send error report to tracking service
	 */
	private async sendReport(report: ErrorReport): Promise<void> {
		try {
			// TODO: Replace with actual error tracking service (e.g., Sentry)
			// For now, we'll just log it
			if (process.env.NEXT_PUBLIC_ERROR_TRACKING_ENDPOINT) {
				await fetch(process.env.NEXT_PUBLIC_ERROR_TRACKING_ENDPOINT, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(report),
				});
			}
		} catch (error) {
			// Don't throw errors from error reporting
			console.error("Failed to send error report:", error);
		}
	}

	/**
	 * Flush queued error reports when coming back online
	 */
	private async flushQueue(): Promise<void> {
		const reports = [...this.queue];
		this.queue = [];

		for (const report of reports) {
			await this.sendReport(report);
		}
	}
}

// Export singleton instance
export const errorReporter = ErrorReporter.getInstance();

/**
 * Helper function to extract error context from React components
 */
export function extractErrorContext(
	_error: Error,
	errorInfo?: React.ErrorInfo,
): ErrorContext {
	const context: ErrorContext = {};

	// Try to extract context from localStorage (if available)
	if (typeof window !== "undefined") {
		try {
			context.userId = localStorage.getItem("userId") || undefined;
			context.householdId =
				localStorage.getItem("selectedHouseholdId") || undefined;
			context.animalId = localStorage.getItem("selectedAnimalId") || undefined;
		} catch {
			// Ignore localStorage errors
		}
	}

	// Add component stack if available
	if (errorInfo?.componentStack) {
		context.componentStack = errorInfo.componentStack;
		context.errorInfo = errorInfo;
	}

	return context;
}

/**
 * Format error message for user display
 */
export function formatErrorMessage(error: Error): string {
	// Common error patterns and user-friendly messages
	const errorPatterns: Array<[RegExp, string]> = [
		[/network/i, "Network connection issue. Please check your connection."],
		[/unauthorized/i, "You need to sign in to access this feature."],
		[/forbidden/i, "You don't have permission to access this resource."],
		[/not found/i, "The requested resource was not found."],
		[/timeout/i, "The request took too long. Please try again."],
		[/offline/i, "You appear to be offline. Some features may be limited."],
	];

	for (const [pattern, message] of errorPatterns) {
		if (pattern.test(error.message)) {
			return message;
		}
	}

	// Generic message for unknown errors
	return "An unexpected error occurred. Please try again or contact support.";
}
