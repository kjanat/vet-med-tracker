import { NextResponse } from "next/server";
import { type FeatureFlags, isFeatureEnabled } from "@/lib/feature-flags";

/**
 * Monitoring endpoint for collecting application metrics and telemetry
 *
 * This endpoint provides structured monitoring data for external monitoring
 * services like Sentry, DataDog, or custom monitoring solutions.
 */

interface MonitoringMetrics {
  timestamp: string;
  environment: string;
  version: string;
  deployment: {
    id?: string;
    url?: string;
    region?: string;
  };
  performance: {
    uptime: number;
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  features: {
    enabled: string[];
    disabled: string[];
  };
  health: {
    overall: string;
    database: boolean;
    redis: boolean;
    auth: boolean;
  };
  errors: {
    count_24h: number;
    critical_count: number;
    last_error?: string;
  };
}

/**
 * Get memory usage statistics
 */
function getMemoryStats() {
  if (typeof process !== "undefined" && process.memoryUsage) {
    const usage = process.memoryUsage();
    return {
      used: Math.round(usage.heapUsed / 1024 / 1024), // MB
      total: Math.round(usage.heapTotal / 1024 / 1024), // MB
      percentage: Math.round((usage.heapUsed / usage.heapTotal) * 100),
    };
  }

  return {
    used: 0,
    total: 0,
    percentage: 0,
  };
}

/**
 * Get feature flags status for monitoring
 */
function getFeatureStatus() {
  try {
    // This would normally come from your feature flag service
    const allFeatures: (keyof FeatureFlags)[] = [
      "pushNotifications",
      "bulkOperations",
      "advancedReporting",
      "offlineMode",
      "serviceWorker",
      "caching",
      "backgroundSync",
      "darkMode",
      "experimentalUI",
      "mobileOptimizations",
      "adminPanel",
      "userManagement",
      "systemMetrics",
    ];

    const enabled = allFeatures.filter((feature) => isFeatureEnabled(feature));
    const disabled = allFeatures.filter(
      (feature) => !isFeatureEnabled(feature),
    );

    return { enabled, disabled };
  } catch (error) {
    console.error("Failed to get feature status:", error);
    return { enabled: [], disabled: [] };
  }
}

/**
 * Get basic health status from health check endpoint
 */
async function getHealthStatus(): Promise<MonitoringMetrics["health"]> {
  try {
    // Make internal request to health endpoint
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
    const response = await fetch(`${baseUrl}/api/health?type=simple`, {
      headers: {
        "User-Agent": "monitoring-internal",
      },
      // Short timeout for monitoring
      signal: AbortSignal.timeout(5000),
    });

    if (response.ok) {
      const health = await response.json();
      return {
        overall: health.status || "unknown",
        database: health.checks?.database ?? false,
        redis: health.checks?.redis ?? false,
        auth: health.checks?.auth ?? false,
      };
    }

    return {
      overall: "unhealthy",
      database: false,
      redis: false,
      auth: false,
    };
  } catch (error) {
    console.error("Failed to get health status:", error);
    return {
      overall: "critical",
      database: false,
      redis: false,
      auth: false,
    };
  }
}

/**
 * Get error metrics (placeholder - would integrate with error tracking service)
 */
function getErrorMetrics(): MonitoringMetrics["errors"] {
  // In production, this would integrate with Sentry, LogRocket, etc.
  return {
    count_24h: 0,
    critical_count: 0,
    last_error: undefined,
  };
}

/**
 * Main monitoring endpoint
 */
export async function GET(_request: Request) {
  const startTime = Date.now();

  try {
    // Check if monitoring is enabled
    if (!isFeatureEnabled("systemMetrics")) {
      return NextResponse.json(
        { error: "Monitoring disabled" },
        { status: 404 },
      );
    }

    // Collect all metrics
    const [healthStatus] = await Promise.all([getHealthStatus()]);

    const uptime = process.uptime ? Math.floor(process.uptime()) : 0;
    const memory = getMemoryStats();
    const features = getFeatureStatus();
    const errors = getErrorMetrics();

    const metrics: MonitoringMetrics = {
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "unknown",
      version: process.env.npm_package_version || "unknown",
      deployment: {
        id: process.env.VERCEL_DEPLOYMENT_ID,
        url: process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}`
          : undefined,
        region: process.env.VERCEL_REGION,
      },
      performance: {
        uptime,
        memory,
      },
      features,
      health: healthStatus,
      errors,
    };

    const responseTime = Date.now() - startTime;

    return NextResponse.json(metrics, {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "X-Response-Time": responseTime.toString(),
        "X-Environment": process.env.NODE_ENV || "unknown",
      },
    });
  } catch (error) {
    console.error("Monitoring endpoint error:", error);

    const errorMetrics = {
      timestamp: new Date().toISOString(),
      error: "Failed to collect metrics",
      environment: process.env.NODE_ENV || "unknown",
      uptime: process.uptime ? Math.floor(process.uptime()) : 0,
    };

    return NextResponse.json(errorMetrics, {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
      },
    });
  }
}

/**
 * POST endpoint for receiving client-side error reports
 */
export async function POST(request: Request) {
  try {
    if (!isFeatureEnabled("systemMetrics")) {
      return NextResponse.json(
        { error: "Error reporting disabled" },
        { status: 404 },
      );
    }

    const body = await request.json();

    // Basic validation
    if (!body.error && !body.message) {
      return NextResponse.json(
        { error: "Invalid error report" },
        { status: 400 },
      );
    }

    // Structure the error report
    const errorReport = {
      timestamp: new Date().toISOString(),
      type: "client_error",
      environment: process.env.NODE_ENV,
      url: body.url || "unknown",
      userAgent: request.headers.get("user-agent"),
      error: {
        message: body.error || body.message,
        stack: body.stack,
        name: body.name,
        line: body.line,
        column: body.column,
        filename: body.filename,
      },
      context: {
        userId: body.userId,
        sessionId: body.sessionId,
        buildId: process.env.VERCEL_DEPLOYMENT_ID,
        featureFlags: body.featureFlags,
      },
      severity: body.severity || "error",
    };

    // Log error (in production, this would go to error tracking service)
    console.error("Client Error Report:", JSON.stringify(errorReport, null, 2));

    // In production, send to Sentry, DataDog, etc.
    // await sendToErrorTrackingService(errorReport);

    return NextResponse.json({
      success: true,
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: errorReport.timestamp,
    });
  } catch (error) {
    console.error("Failed to process error report:", error);

    return NextResponse.json(
      { error: "Failed to process error report" },
      { status: 500 },
    );
  }
}

/**
 * OPTIONS handler for CORS support
 */
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Max-Age": "86400",
    },
  });
}
