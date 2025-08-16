import { NextResponse } from "next/server";
import {
  analyticsCircuitBreaker,
  batchCircuitBreaker,
  type CircuitMetrics,
  CircuitState,
  criticalCircuitBreaker,
  databaseCircuitBreaker,
} from "@/lib/infrastructure/circuit-breaker";

/**
 * Circuit breaker status response
 */
interface BreakerStatusResponse {
  timestamp: string;
  service: string;
  version: string;
  breakers: {
    database: CircuitMetrics;
    critical: CircuitMetrics;
    batch: CircuitMetrics;
    analytics: CircuitMetrics;
  };
  overall: {
    healthy: boolean;
    healthyCount: number;
    totalCount: number;
  };
}

/**
 * GET /api/_breaker-status
 *
 * Returns current status of all circuit breakers for monitoring dashboards.
 * No authentication required for external monitoring tools.
 */
export async function GET(): Promise<NextResponse> {
  try {
    // Get metrics from all circuit breakers
    const databaseMetrics = databaseCircuitBreaker.getMetrics();
    const criticalMetrics = criticalCircuitBreaker.getMetrics();
    const batchMetrics = batchCircuitBreaker.getMetrics();
    const analyticsMetrics = analyticsCircuitBreaker.getMetrics();

    // Calculate overall health
    const breakers = [
      databaseCircuitBreaker,
      criticalCircuitBreaker,
      batchCircuitBreaker,
      analyticsCircuitBreaker,
    ];

    const healthyCount = breakers.filter((breaker) =>
      breaker.isHealthy(),
    ).length;
    const totalCount = breakers.length;
    const healthy = healthyCount === totalCount;

    const response = {
      timestamp: new Date().toISOString(),
      service: "vet-med-tracker",
      version: "1.0.0",
      breakers: {
        database: databaseMetrics,
        critical: criticalMetrics,
        batch: batchMetrics,
        analytics: analyticsMetrics,
      },
      overall: {
        healthy,
        healthyCount,
        totalCount,
      },
    } satisfies BreakerStatusResponse;

    // Create response with appropriate headers
    const nextResponse = NextResponse.json(response, {
      status: healthy ? 200 : 503, // Service Unavailable if not all healthy
    });

    // Add CORS headers for external monitoring tools
    nextResponse.headers.set("Access-Control-Allow-Origin", "*");
    nextResponse.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    nextResponse.headers.set("Access-Control-Allow-Headers", "Content-Type");

    // Cache control for monitoring tools
    nextResponse.headers.set(
      "Cache-Control",
      "no-cache, no-store, must-revalidate",
    );
    nextResponse.headers.set("Pragma", "no-cache");
    nextResponse.headers.set("Expires", "0");

    return nextResponse;
  } catch (error) {
    console.error("Error getting circuit breaker status:", error);

    // Return error response with CORS headers
    const errorResponse = NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        service: "vet-med-tracker",
        version: "1.0.0",
        error: "Failed to retrieve circuit breaker status",
        breakers: {
          database: {
            state: CircuitState.OPEN,
            failureCount: 0,
            successCount: 0,
            totalRequests: 0,
            uptime: 0,
            failureRate: 100,
          },
          critical: {
            state: CircuitState.OPEN,
            failureCount: 0,
            successCount: 0,
            totalRequests: 0,
            uptime: 0,
            failureRate: 100,
          },
          batch: {
            state: CircuitState.OPEN,
            failureCount: 0,
            successCount: 0,
            totalRequests: 0,
            uptime: 0,
            failureRate: 100,
          },
          analytics: {
            state: CircuitState.OPEN,
            failureCount: 0,
            successCount: 0,
            totalRequests: 0,
            uptime: 0,
            failureRate: 100,
          },
        },
        overall: {
          healthy: false,
          healthyCount: 0,
          totalCount: 4,
        },
      },
      { status: 500 },
    );

    // Add CORS headers even for error responses
    errorResponse.headers.set("Access-Control-Allow-Origin", "*");
    errorResponse.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    errorResponse.headers.set("Access-Control-Allow-Headers", "Content-Type");

    return errorResponse;
  }
}

/**
 * OPTIONS /api/_breaker-status
 *
 * Handle CORS preflight requests for external monitoring tools
 */
export async function OPTIONS(): Promise<NextResponse> {
  const response = new NextResponse(null, { status: 200 });

  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type");
  response.headers.set("Access-Control-Max-Age", "86400"); // 24 hours

  return response;
}
