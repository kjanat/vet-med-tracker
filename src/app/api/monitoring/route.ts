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
  if (process?.memoryUsage) {
    const usage = process.memoryUsage();
    return {
      percentage: Math.round((usage.heapUsed / usage.heapTotal) * 100),
      total: Math.round(usage.heapTotal / 1024 / 1024), // MB
      used: Math.round(usage.heapUsed / 1024 / 1024), // MB
    };
  }

  return {
    percentage: 0,
    total: 0,
    used: 0,
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

    return { disabled, enabled };
  } catch (error) {
    console.error("Failed to get feature status:", error);
    return { disabled: [], enabled: [] };
  }
}

/**
 * Get basic health status from health check endpoint
 */
async function getHealthStatus(): Promise<MonitoringMetrics["health"]> {
  try {
    // Make internal request to health endpoint
    const vercelUrl = process.env["VERCEL_URL"];
    const baseUrl = vercelUrl
      ? `https://${vercelUrl}`
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
        auth: health.checks?.auth ?? false,
        database: health.checks?.database ?? false,
        overall: health.status || "unknown",
        redis: health.checks?.redis ?? false,
      };
    }

    return {
      auth: false,
      database: false,
      overall: "unhealthy",
      redis: false,
    };
  } catch (error) {
    console.error("Failed to get health status:", error);
    return {
      auth: false,
      database: false,
      overall: "critical",
      redis: false,
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

    const deploymentUrl = process.env["VERCEL_URL"];

    const metrics: MonitoringMetrics = {
      deployment: {
        id: process.env["VERCEL_DEPLOYMENT_ID"],
        region: process.env["VERCEL_REGION"],
        url: deploymentUrl ? `https://${deploymentUrl}` : undefined,
      },
      environment: process.env.NODE_ENV || "unknown",
      errors,
      features,
      health: healthStatus,
      performance: {
        memory,
        uptime,
      },
      timestamp: new Date().toISOString(),
      version: process.env["npm_package_version"] || "unknown",
    };

    const responseTime = Date.now() - startTime;

    return NextResponse.json(metrics, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Content-Type": "application/json",
        "X-Environment": process.env.NODE_ENV || "unknown",
        "X-Response-Time": responseTime.toString(),
      },
    });
  } catch (error) {
    console.error("Monitoring endpoint error:", error);

    const errorMetrics = {
      environment: process.env.NODE_ENV || "unknown",
      error: "Failed to collect metrics",
      timestamp: new Date().toISOString(),
      uptime: process.uptime ? Math.floor(process.uptime()) : 0,
    };

    return NextResponse.json(errorMetrics, {
      headers: {
        "Cache-Control": "no-cache",
        "Content-Type": "application/json",
      },
      status: 500,
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
      context: {
        buildId: process.env["VERCEL_DEPLOYMENT_ID"],
        featureFlags: body.featureFlags,
        sessionId: body.sessionId,
        userId: body.userId,
      },
      environment: process.env.NODE_ENV,
      error: {
        column: body.column,
        filename: body.filename,
        line: body.line,
        message: body.error || body.message,
        name: body.name,
        stack: body.stack,
      },
      severity: body.severity || "error",
      timestamp: new Date().toISOString(),
      type: "client_error",
      url: body.url || "unknown",
      userAgent: request.headers.get("user-agent"),
    };

    // Log error (in production, this would go to error tracking service)
    console.error("Client Error Report:", JSON.stringify(errorReport, null, 2));

    // In production, send to Sentry, DataDog, etc.
    // await sendToErrorTrackingService(errorReport);

    return NextResponse.json({
      id: `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      success: true,
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
    headers: {
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Max-Age": "86400",
    },
    status: 200,
  });
}
