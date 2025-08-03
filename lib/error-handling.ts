import { TRPCError } from "@trpc/server";
import { ZodError } from "zod";
import { CircuitBreakerError, CircuitState } from "./circuit-breaker";

// Types for React ErrorInfo
interface ReactErrorInfo {
	componentStack: string;
}

/**
 * Error types for categorization
 */
export enum ErrorType {
	VALIDATION = "VALIDATION",
	RATE_LIMIT = "RATE_LIMIT",
	CONNECTION = "CONNECTION",
	CIRCUIT_BREAKER = "CIRCUIT_BREAKER",
	QUEUE_FULL = "QUEUE_FULL",
	DATABASE = "DATABASE",
	AUTHENTICATION = "AUTHENTICATION",
	AUTHORIZATION = "AUTHORIZATION",
	NOT_FOUND = "NOT_FOUND",
	CONFLICT = "CONFLICT",
	INTERNAL = "INTERNAL",
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
	LOW = "LOW",
	MEDIUM = "MEDIUM",
	HIGH = "HIGH",
	CRITICAL = "CRITICAL",
}

/**
 * User-friendly error information
 */
export interface UserFriendlyError {
	type: ErrorType;
	severity: ErrorSeverity;
	userMessage: string;
	technicalMessage: string;
	suggestedActions: string[];
	retryable: boolean;
	retryAfter?: number;
	degradedMode?: boolean;
	contactSupport?: boolean;
}

/**
 * Error mapping configuration
 */
const ERROR_MAPPINGS: Record<string, Partial<UserFriendlyError>> = {
	// Connection and rate limiting errors
	"Rate limit exceeded": {
		type: ErrorType.RATE_LIMIT,
		severity: ErrorSeverity.MEDIUM,
		userMessage: "You're sending requests too quickly. Please slow down a bit.",
		suggestedActions: [
			"Wait a moment before trying again",
			"Refresh the page if the issue persists",
		],
		retryable: true,
	},

	"Connection queue is full": {
		type: ErrorType.QUEUE_FULL,
		severity: ErrorSeverity.HIGH,
		userMessage: "Our system is busy right now. Please try again in a moment.",
		suggestedActions: [
			"Wait 30 seconds and try again",
			"Check your internet connection",
			"Contact support if this persists",
		],
		retryable: true,
		retryAfter: 30,
	},

	"Circuit breaker is OPEN": {
		type: ErrorType.CIRCUIT_BREAKER,
		severity: ErrorSeverity.HIGH,
		userMessage:
			"We're experiencing technical difficulties. Our team is working to resolve this.",
		suggestedActions: [
			"Try again in a few minutes",
			"Use offline mode if available",
			"Contact support if urgent",
		],
		retryable: true,
		degradedMode: true,
		contactSupport: true,
	},

	// Database errors
	"Connection terminated": {
		type: ErrorType.CONNECTION,
		severity: ErrorSeverity.HIGH,
		userMessage:
			"Lost connection to our servers. Please check your internet and try again.",
		suggestedActions: [
			"Check your internet connection",
			"Refresh the page",
			"Try again in a moment",
		],
		retryable: true,
	},

	timeout: {
		type: ErrorType.CONNECTION,
		severity: ErrorSeverity.MEDIUM,
		userMessage:
			"The request is taking longer than expected. Please try again.",
		suggestedActions: [
			"Try again with a simpler request",
			"Check your internet connection",
			"Wait a moment and retry",
		],
		retryable: true,
	},

	// Authentication errors
	"Authentication required": {
		type: ErrorType.AUTHENTICATION,
		severity: ErrorSeverity.MEDIUM,
		userMessage: "Please sign in to continue.",
		suggestedActions: [
			"Sign in to your account",
			"Check if your session expired",
			"Clear browser cache if needed",
		],
		retryable: true,
	},

	"Invalid token": {
		type: ErrorType.AUTHENTICATION,
		severity: ErrorSeverity.MEDIUM,
		userMessage: "Your session has expired. Please sign in again.",
		suggestedActions: [
			"Sign in again",
			"Check your email for a new login link",
		],
		retryable: true,
	},

	// Authorization errors
	"Insufficient permissions": {
		type: ErrorType.AUTHORIZATION,
		severity: ErrorSeverity.MEDIUM,
		userMessage: "You don't have permission to perform this action.",
		suggestedActions: [
			"Contact your household owner for access",
			"Check if you're in the right household",
			"Verify your role permissions",
		],
		retryable: false,
	},

	"Not a member of this household": {
		type: ErrorType.AUTHORIZATION,
		severity: ErrorSeverity.MEDIUM,
		userMessage: "You don't have access to this household's data.",
		suggestedActions: [
			"Check if you're viewing the right household",
			"Ask for an invitation to this household",
			"Switch to a household you're a member of",
		],
		retryable: false,
	},

	// Validation errors
	"Invalid input": {
		type: ErrorType.VALIDATION,
		severity: ErrorSeverity.LOW,
		userMessage: "Please check your input and try again.",
		suggestedActions: [
			"Review the form for errors",
			"Ensure all required fields are filled",
			"Check date and time formats",
		],
		retryable: true,
	},

	// Conflict errors
	"already exists": {
		type: ErrorType.CONFLICT,
		severity: ErrorSeverity.LOW,
		userMessage:
			"This item already exists. Please choose a different name or update the existing one.",
		suggestedActions: [
			"Use a different name",
			"Update the existing item instead",
			"Check for duplicates",
		],
		retryable: true,
	},

	// Not found errors
	"not found": {
		type: ErrorType.NOT_FOUND,
		severity: ErrorSeverity.MEDIUM,
		userMessage: "The requested item couldn't be found.",
		suggestedActions: [
			"Check if the item was deleted",
			"Verify you have the correct link",
			"Go back and try again",
		],
		retryable: false,
	},
};

/**
 * Convert any error to user-friendly format
 */
export function toUserFriendlyError(error: unknown): UserFriendlyError {
	const baseError = createBaseError();
	const technicalMessage = extractTechnicalMessage(error);

	// Handle different error types
	if (error instanceof CircuitBreakerError) {
		return processCircuitBreakerError(error, baseError);
	}

	if (error instanceof TRPCError) {
		return processTRPCError(error, baseError, technicalMessage);
	}

	if (error instanceof ZodError) {
		return processZodError(error, baseError);
	}

	if (error instanceof Error) {
		return processGenericError(error, baseError, technicalMessage);
	}

	if (typeof error === "string") {
		return processStringError(error, baseError, technicalMessage);
	}

	return buildFinalError(baseError, technicalMessage);
}

/**
 * Create base error object with default values
 */
function createBaseError(): Partial<UserFriendlyError> {
	return {
		type: ErrorType.INTERNAL,
		severity: ErrorSeverity.HIGH,
		userMessage: "Something went wrong. Please try again.",
		technicalMessage: "Unknown error",
		suggestedActions: [
			"Try refreshing the page",
			"Wait a moment and try again",
			"Contact support if the problem continues",
		],
		retryable: true,
		contactSupport: true,
	};
}

/**
 * Extract technical message from error
 */
function extractTechnicalMessage(error: unknown): string {
	if (error instanceof Error) {
		return error.message;
	}
	if (typeof error === "string") {
		return error;
	}
	return "Unknown error";
}

/**
 * Process circuit breaker specific errors
 */
function processCircuitBreakerError(
	error: CircuitBreakerError,
	baseError: Partial<UserFriendlyError>,
): UserFriendlyError {
	const circuitMapping = ERROR_MAPPINGS["Circuit breaker is OPEN"];
	if (circuitMapping) {
		Object.assign(baseError, circuitMapping);
	}

	const technicalMessage = `Circuit breaker ${error.metrics.state}: ${error.message}`;
	const retryAfter = error.metrics.state === CircuitState.OPEN ? 60 : undefined;

	return buildFinalError(baseError, technicalMessage, retryAfter);
}

/**
 * Process tRPC specific errors
 */
function processTRPCError(
	error: TRPCError,
	baseError: Partial<UserFriendlyError>,
	technicalMessage: string,
): UserFriendlyError {
	switch (error.code) {
		case "BAD_REQUEST":
			baseError.type = ErrorType.VALIDATION;
			baseError.severity = ErrorSeverity.LOW;
			baseError.userMessage = "Please check your input and try again.";
			break;
		case "UNAUTHORIZED":
			applyErrorMapping(baseError, "Authentication required");
			break;
		case "FORBIDDEN":
			applyErrorMapping(baseError, "Insufficient permissions");
			break;
		case "NOT_FOUND":
			applyErrorMapping(baseError, "not found");
			break;
		case "TIMEOUT":
			applyErrorMapping(baseError, "timeout");
			break;
		case "TOO_MANY_REQUESTS":
			applyErrorMapping(baseError, "Rate limit exceeded");
			break;
		case "SERVICE_UNAVAILABLE":
			baseError.type = ErrorType.CONNECTION;
			baseError.severity = ErrorSeverity.HIGH;
			baseError.userMessage =
				"Service is temporarily unavailable. Please try again soon.";
			baseError.degradedMode = true;
			break;
	}

	return buildFinalError(baseError, technicalMessage);
}

/**
 * Process Zod validation errors
 */
function processZodError(
	error: ZodError,
	baseError: Partial<UserFriendlyError>,
): UserFriendlyError {
	baseError.type = ErrorType.VALIDATION;
	baseError.severity = ErrorSeverity.LOW;
	baseError.userMessage =
		"Please correct the highlighted fields and try again.";
	baseError.suggestedActions = [
		"Check for missing required fields",
		"Verify data formats (dates, emails, etc.)",
		"Ensure all inputs are valid",
	];

	const zodErrors = error.issues || [];
	const technicalMessage =
		zodErrors.length > 0
			? zodErrors.map((e) => `${e.path.join(".")}: ${e.message}`).join("; ")
			: "Validation error";

	return buildFinalError(baseError, technicalMessage);
}

/**
 * Process generic Error objects
 */
function processGenericError(
	error: Error,
	baseError: Partial<UserFriendlyError>,
	technicalMessage: string,
): UserFriendlyError {
	applyKnownErrorPatterns(baseError, error.message);
	return buildFinalError(baseError, technicalMessage);
}

/**
 * Process string errors
 */
function processStringError(
	error: string,
	baseError: Partial<UserFriendlyError>,
	technicalMessage: string,
): UserFriendlyError {
	applyKnownErrorPatterns(baseError, error);
	return buildFinalError(baseError, technicalMessage);
}

/**
 * Apply error mapping by key
 */
function applyErrorMapping(
	baseError: Partial<UserFriendlyError>,
	mappingKey: string,
): void {
	const mapping = ERROR_MAPPINGS[mappingKey];
	if (mapping) {
		Object.assign(baseError, mapping);
	}
}

/**
 * Apply known error patterns by checking message content
 */
function applyKnownErrorPatterns(
	baseError: Partial<UserFriendlyError>,
	message: string,
): void {
	for (const [pattern, mapping] of Object.entries(ERROR_MAPPINGS)) {
		if (message.toLowerCase().includes(pattern.toLowerCase())) {
			Object.assign(baseError, mapping);
			break;
		}
	}
}

/**
 * Build final error object with proper type safety
 */
function buildFinalError(
	baseError: Partial<UserFriendlyError>,
	technicalMessage: string,
	retryAfter?: number,
): UserFriendlyError {
	return {
		type: baseError.type ?? ErrorType.INTERNAL,
		severity: baseError.severity ?? ErrorSeverity.HIGH,
		userMessage:
			baseError.userMessage ?? "Something went wrong. Please try again.",
		technicalMessage,
		suggestedActions: baseError.suggestedActions ?? ["Try refreshing the page"],
		retryable: baseError.retryable ?? true,
		retryAfter: retryAfter ?? baseError.retryAfter,
		degradedMode: baseError.degradedMode,
		contactSupport: baseError.contactSupport,
	};
}

/**
 * Graceful degradation strategies
 */
export const DegradationStrategies = {
	/**
	 * Return cached data with warning
	 */
	returnCachedData<T>(
		cachedData: T,
		cacheAge: number,
	): {
		data: T;
		warning: string;
		stale: boolean;
	} {
		const ageMinutes = Math.floor(cacheAge / (1000 * 60));
		return {
			data: cachedData,
			warning: `Showing cached data from ${ageMinutes} minutes ago due to connection issues.`,
			stale: ageMinutes > 5,
		};
	},

	/**
	 * Return partial data with explanation
	 */
	returnPartialData<T>(
		partialData: Partial<T>,
		missingFields: string[],
	): {
		data: Partial<T>;
		warning: string;
		incomplete: boolean;
	} {
		return {
			data: partialData,
			warning: `Some information is temporarily unavailable: ${missingFields.join(", ")}.`,
			incomplete: true,
		};
	},

	/**
	 * Queue operation for later
	 */
	queueForLater(
		_operationId: string,
		retryDelay: number = 30000,
	): {
		queued: boolean;
		message: string;
		retryAfter: number;
	} {
		return {
			queued: true,
			message:
				"Your request has been queued and will be processed automatically when the system recovers.",
			retryAfter: retryDelay,
		};
	},

	/**
	 * Suggest offline mode
	 */
	suggestOfflineMode(): {
		offline: boolean;
		message: string;
		instructions: string[];
	} {
		return {
			offline: true,
			message:
				"You can continue working offline. Your changes will sync when connectivity is restored.",
			instructions: [
				"Your data will be saved locally",
				"Sync will happen automatically when online",
				"Some features may be limited in offline mode",
			],
		};
	},

	/**
	 * Provide read-only mode
	 */
	enterReadOnlyMode(): {
		readOnly: boolean;
		message: string;
		limitations: string[];
	} {
		return {
			readOnly: true,
			message: "System is in read-only mode due to connection issues.",
			limitations: [
				"You can view existing data",
				"New entries cannot be saved right now",
				"Changes will be enabled when the system recovers",
			],
		};
	},
};

/**
 * Error context for better debugging
 */
export interface ErrorContext {
	userId?: string;
	householdId?: string;
	endpoint: string;
	operation: string;
	timestamp: number;
	userAgent?: string;
	ip?: string;
	requestId?: string;
}

/**
 * Enhanced error with context
 */
export interface EnhancedError extends UserFriendlyError {
	context: ErrorContext;
	id: string;
	timestamp: number;
}

/**
 * Create enhanced error with context
 */
export function createEnhancedError(
	error: unknown,
	context: Partial<ErrorContext>,
): EnhancedError {
	const userFriendlyError = toUserFriendlyError(error);

	return {
		...userFriendlyError,
		context: {
			endpoint: "unknown",
			operation: "unknown",
			timestamp: Date.now(),
			...context,
		},
		id: generateErrorId(),
		timestamp: Date.now(),
	};
}

/**
 * Generate unique error ID for tracking
 */
function generateErrorId(): string {
	return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Error reporting utility functions
 */

// In-memory error storage
let reportedErrors: EnhancedError[] = [];
const MAX_ERRORS = 100;

/**
 * Report error for logging and analytics
 */
export function reportError(enhancedError: EnhancedError): void {
	// Add to in-memory store
	reportedErrors.unshift(enhancedError);
	if (reportedErrors.length > MAX_ERRORS) {
		reportedErrors = reportedErrors.slice(0, MAX_ERRORS);
	}

	// Log based on severity
	if (enhancedError.severity === ErrorSeverity.CRITICAL) {
		console.error("🚨 CRITICAL ERROR:", {
			id: enhancedError.id,
			type: enhancedError.type,
			message: enhancedError.technicalMessage,
			context: enhancedError.context,
		});
	} else if (enhancedError.severity === ErrorSeverity.HIGH) {
		console.error("❌ HIGH SEVERITY ERROR:", {
			id: enhancedError.id,
			type: enhancedError.type,
			message: enhancedError.technicalMessage,
			context: enhancedError.context,
		});
	} else {
		console.warn("⚠️ ERROR:", {
			id: enhancedError.id,
			type: enhancedError.type,
			message: enhancedError.technicalMessage,
		});
	}

	// TODO: Send to external error tracking service (Sentry, LogRocket, etc.)
}

/**
 * Get recent errors for debugging
 */
export function getRecentErrors(limit: number = 10): EnhancedError[] {
	return reportedErrors.slice(0, limit);
}

/**
 * Get error statistics
 */
export function getErrorStats(): {
	total: number;
	bySeverity: Record<ErrorSeverity, number>;
	byType: Record<ErrorType, number>;
	recentCount: number;
} {
	const now = Date.now();
	const oneHourAgo = now - 60 * 60 * 1000;

	const bySeverity = {
		[ErrorSeverity.LOW]: 0,
		[ErrorSeverity.MEDIUM]: 0,
		[ErrorSeverity.HIGH]: 0,
		[ErrorSeverity.CRITICAL]: 0,
	};

	const byType = Object.values(ErrorType).reduce(
		(acc, type) => {
			acc[type] = 0;
			return acc;
		},
		{} as Record<ErrorType, number>,
	);

	let recentCount = 0;

	for (const error of reportedErrors) {
		bySeverity[error.severity]++;
		byType[error.type]++;

		if (error.timestamp > oneHourAgo) {
			recentCount++;
		}
	}

	return {
		total: reportedErrors.length,
		bySeverity,
		byType,
		recentCount,
	};
}

/**
 * Global error handler for unhandled errors
 */
export function setupGlobalErrorHandling(): void {
	// Handle unhandled promise rejections
	process.on("unhandledRejection", (reason) => {
		// Handle unhandled promise rejections
		const enhancedError = createEnhancedError(reason, {
			endpoint: "unhandled",
			operation: "promise_rejection",
		});

		reportError(enhancedError);
	});

	// Handle uncaught exceptions
	process.on("uncaughtException", (error) => {
		const enhancedError = createEnhancedError(error, {
			endpoint: "uncaught",
			operation: "exception",
		});

		reportError(enhancedError);

		// Exit gracefully on critical errors
		if (enhancedError.severity === ErrorSeverity.CRITICAL) {
			console.error("Critical error occurred, shutting down gracefully...");
			process.exit(1);
		}
	});
}

/**
 * React error boundary helper
 */
export function createErrorBoundaryInfo(
	error: Error,
	_errorInfo: ReactErrorInfo,
): EnhancedError {
	return createEnhancedError(error, {
		endpoint: "react_boundary",
		operation: "component_error",
		timestamp: Date.now(),
	});
}
