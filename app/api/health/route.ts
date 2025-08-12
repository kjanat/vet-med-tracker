import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import {
	type ComponentHealth,
	clearHealthCache,
	comprehensiveHealthReport,
	DEFAULT_HEALTH_CONFIG,
	getHealthCacheStatus,
	type HealthReport,
	HealthSeverity,
	livenessCheck,
	readinessCheck,
	simpleHealthCheck,
} from "@/lib/infrastructure/health/checks";

/**
 * Health check endpoint query parameters
 */
interface HealthCheckParams {
	type?: "liveness" | "readiness" | "detailed" | "simple";
	format?: "json" | "text";
	cache?: boolean;
	metrics?: boolean;
}

/**
 * Rate limiting configuration
 */
const RATE_LIMIT_CONFIG = {
	window: 60000, // 1 minute window
	maxRequests: 60, // 60 requests per minute (more generous for health checks)
	cleanupInterval: 300000, // 5 minutes
};

/**
 * Simple rate limiting for health check endpoint
 */
const requestTimestamps = new Map<string, number[]>();

function isRateLimited(clientId: string): boolean {
	const now = Date.now();
	const timestamps = requestTimestamps.get(clientId) || [];

	// Clean up old timestamps
	const recentTimestamps = timestamps.filter(
		(timestamp) => now - timestamp < RATE_LIMIT_CONFIG.window,
	);

	// Check if rate limit exceeded
	if (recentTimestamps.length >= RATE_LIMIT_CONFIG.maxRequests) {
		requestTimestamps.set(clientId, recentTimestamps);
		return true;
	}

	// Add current timestamp
	recentTimestamps.push(now);
	requestTimestamps.set(clientId, recentTimestamps);

	return false;
}

/**
 * Health check endpoint with multiple check types
 *
 * Query Parameters:
 * - type: liveness | readiness | detailed | simple (default: simple)
 * - format: json | text (default: json)
 * - cache: true | false (default: true)
 * - metrics: true | false (default: depends on type)
 *
 * Examples:
 * - GET /api/health - Simple health check for load balancers
 * - GET /api/health?type=liveness - Basic liveness probe
 * - GET /api/health?type=readiness - Readiness probe for k8s
 * - GET /api/health?type=detailed - Full health report with metrics
 * - GET /api/health?type=detailed&cache=false - Fresh detailed report
 */
/**
 * Extract client identifier for rate limiting
 */
function getClientId(request: Request): string {
	const xff = request.headers.get("x-forwarded-for");
	const ip =
		xff?.split(",")[0]?.trim() ||
		request.headers.get("cf-connecting-ip") ||
		request.headers.get("x-real-ip") ||
		request.headers.get("user-agent") ||
		"anonymous";
	return createHash("sha256").update(ip).digest("hex");
}

/**
 * Parse query parameters from URL
 */
function parseHealthCheckParams(url: URL): HealthCheckParams {
	return {
		type:
			(url.searchParams.get("type") as HealthCheckParams["type"]) || "simple",
		format:
			(url.searchParams.get("format") as HealthCheckParams["format"]) || "json",
		cache: url.searchParams.get("cache") !== "false", // Default to true
		metrics: url.searchParams.get("metrics") === "true",
	};
}

/**
 * Create rate limit response
 */
function createRateLimitResponse(): NextResponse {
	return NextResponse.json(
		{
			status: "rate_limited",
			message: "Too many requests. Please try again later.",
			retryAfter: Math.ceil(RATE_LIMIT_CONFIG.window / 1000),
		},
		{
			status: 429,
			headers: {
				"Retry-After": Math.ceil(RATE_LIMIT_CONFIG.window / 1000).toString(),
				"X-RateLimit-Limit": RATE_LIMIT_CONFIG.maxRequests.toString(),
				"X-RateLimit-Window": Math.ceil(
					RATE_LIMIT_CONFIG.window / 1000,
				).toString(),
				"X-RateLimit-Reset": new Date(
					Date.now() + RATE_LIMIT_CONFIG.window,
				).toISOString(),
			},
		},
	);
}

/**
 * Type for simple health check result
 */
interface SimpleHealthResult {
	status: "healthy" | "unhealthy";
	timestamp: Date;
	uptime: number;
	checks: {
		application: boolean;
		database: boolean;
		redis: boolean;
	};
}

/**
 * Union type for all possible health check results
 */
type HealthCheckResult = ComponentHealth | HealthReport | SimpleHealthResult;

/**
 * Perform health check based on type
 */
async function performHealthCheck(
	params: HealthCheckParams,
): Promise<{ result: HealthCheckResult; httpStatus: number }> {
	let result: HealthCheckResult;
	let httpStatus = 200;

	// Handle cache clearing if requested
	if (!params.cache) {
		clearHealthCache();
	}

	// Route to appropriate health check based on type
	switch (params.type) {
		case "liveness":
			result = await livenessCheck();
			httpStatus = result.status === HealthSeverity.HEALTHY ? 200 : 503;
			break;

		case "readiness":
			result = await readinessCheck({
				includeMetrics: params.metrics,
				cacheMs: params.cache ? DEFAULT_HEALTH_CONFIG.cacheMs : 0,
			});
			httpStatus = result.status === HealthSeverity.HEALTHY ? 200 : 503;
			break;

		case "detailed":
			result = await comprehensiveHealthReport({
				includeMetrics: params.metrics ?? true, // Default to true for detailed
				includeDependencies: true,
				cacheMs: params.cache ? DEFAULT_HEALTH_CONFIG.cacheMs : 0,
			});
			httpStatus = getHttpStatusFromSeverity(result.overall);
			break;

		default:
			result = await simpleHealthCheck();
			httpStatus = result.status === "healthy" ? 200 : 503;
			break;
	}

	return { result, httpStatus };
}

/**
 * Create text format response
 */
function createTextResponse(
	result: HealthCheckResult,
	httpStatus: number,
	responseTime: number,
	params: HealthCheckParams,
): Response {
	const status = getStatusFromResult(result);
	const statusText = `Health Check: ${status.toUpperCase()}\nTimestamp: ${new Date().toISOString()}\nResponse Time: ${responseTime}ms`;

	return new Response(statusText, {
		status: httpStatus,
		headers: {
			"Content-Type": "text/plain",
			"Cache-Control": "no-cache, no-store, must-revalidate",
			"X-Health-Check-Type": params.type || "simple",
			"X-Health-Check-Duration": responseTime.toString(),
		},
	});
}

/**
 * Create JSON format response
 */
function createJsonResponse(
	result: HealthCheckResult,
	httpStatus: number,
	responseTime: number,
	params: HealthCheckParams,
): NextResponse {
	const metadata = {
		responseTime,
		checkType: params.type,
		cached: params.cache,
		cacheStatus: getHealthCacheStatus(),
	};

	// JSON response headers
	const headers = {
		"Content-Type": "application/json",
		"Cache-Control": "no-cache, no-store, must-revalidate",
		"X-Health-Check-Type": params.type || "simple",
		"X-Health-Check-Duration": responseTime.toString(),
		"X-Health-Check-Cached": (params.cache ?? true).toString(),
	};

	// Create response with metadata - always add as separate property to avoid mutating original objects
	const responseData = {
		...result,
		_metadata: metadata,
	};

	return NextResponse.json(responseData, { status: httpStatus, headers });
}

/**
 * Create error response
 */
function createErrorResponse(
	error: unknown,
	params: HealthCheckParams,
	responseTime: number,
): NextResponse {
	const errorResponse = {
		status: "critical",
		message: "Health check system failure",
		timestamp: new Date().toISOString(),
		error: error instanceof Error ? error.message : "Unknown error",
		checkType: params.type,
		responseTime,
	};

	return NextResponse.json(errorResponse, {
		status: 503,
		headers: {
			"Content-Type": "application/json",
			"Cache-Control": "no-cache, no-store, must-revalidate",
			"X-Health-Check-Type": params.type || "simple",
			"X-Health-Check-Duration": responseTime.toString(),
		},
	});
}

export async function GET(request: Request) {
	const start = Date.now();

	// Extract client identifier for rate limiting
	const clientId = getClientId(request);

	// Apply rate limiting
	if (isRateLimited(clientId)) {
		return createRateLimitResponse();
	}

	// Parse query parameters
	const url = new URL(request.url);
	const params = parseHealthCheckParams(url);

	try {
		// Perform the health check
		const { result, httpStatus } = await performHealthCheck(params);
		const responseTime = Date.now() - start;

		// Handle text format (useful for simple monitoring)
		if (params.format === "text") {
			return createTextResponse(result, httpStatus, responseTime, params);
		}

		// JSON response (default)
		return createJsonResponse(result, httpStatus, responseTime, params);
	} catch (error) {
		console.error("Health check failed:", error);
		const responseTime = Date.now() - start;
		return createErrorResponse(error, params, responseTime);
	}
}

/**
 * Helper functions for the health check endpoint
 */

/**
 * Convert health severity to HTTP status code
 */
function getHttpStatusFromSeverity(severity: HealthSeverity): number {
	switch (severity) {
		case HealthSeverity.HEALTHY:
			return 200;
		case HealthSeverity.DEGRADED:
			return 206; // Partial Content
		case HealthSeverity.UNHEALTHY:
			return 503; // Service Unavailable
		case HealthSeverity.CRITICAL:
			return 503; // Service Unavailable
		default:
			return 503;
	}
}

/**
 * Extract status string from various result types
 */
function getStatusFromResult(result: HealthCheckResult): string {
	// Check for HealthReport (detailed) - has overall property
	if ("overall" in result) {
		return result.overall;
	}
	// Check for ComponentHealth (liveness/readiness) - has status property
	if ("status" in result) {
		return result.status;
	}
	return "unknown";
}

/**
 * OPTIONS handler for CORS support
 */
export async function OPTIONS() {
	return new Response(null, {
		status: 200,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization",
			"Access-Control-Max-Age": "86400", // 24 hours
		},
	});
}
