import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

// Add CORS headers for cross-origin ingestion
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// Zod schemas for validation
const PerformanceMetricsSchema = z.object({
  FCP: z.number().nonnegative().optional(),
  LCP: z.number().nonnegative().optional(),
  FID: z.number().nonnegative().optional(),
  CLS: z.number().min(0).max(1).optional(),
  TTFB: z.number().nonnegative().optional(),
});

const PerformanceDataSchema = z.object({
  metrics: PerformanceMetricsSchema.refine(
    (m) => Object.keys(m).length > 0,
    "At least one metric is required",
  ),
  url: z.url(),
  userAgent: z.string().optional(),
  timestamp: z.number().int().min(0),
  connectionSpeed: z.string().optional(),
  deviceType: z.string().optional(),
});

type PerformanceMetrics = z.infer<typeof PerformanceMetricsSchema>;

export async function POST(request: NextRequest) {
  try {
    // Validate input with Zod schema
    const json = await request.json();
    const parseResult = PerformanceDataSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: parseResult.error.flatten() },
        { status: 400, headers: corsHeaders },
      );
    }

    const data = parseResult.data;

    // In a real application, you would:
    // 1. Store metrics in a database (e.g., ClickHouse, BigQuery)
    // 2. Send to analytics service (e.g., DataDog, New Relic)
    // 3. Trigger alerts for poor performance

    // For now, just log to console in development
    if (process.env.NODE_ENV === "development") {
      console.log("📊 Performance Metrics:", {
        url: data.url,
        metrics: data.metrics,
        timestamp: new Date(data.timestamp).toISOString(),
      });
    }

    // Send to analytics service (example)
    if (process.env.ANALYTICS_API_KEY) {
      // Example: await sendToAnalyticsService(data);
    }

    // Check for performance issues and alert
    const issues = detectPerformanceIssues(data.metrics);
    if (issues.length > 0 && process.env.NODE_ENV === "development") {
      console.warn("⚠️ Performance Issues Detected:", issues);
    }

    return NextResponse.json(
      {
        success: true,
        issues: issues.length > 0 ? issues : undefined,
      },
      { headers: corsHeaders },
    );
  } catch (error) {
    console.error("Performance monitoring error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders },
    );
  }
}

function detectPerformanceIssues(metrics: PerformanceMetrics): string[] {
  const issues: string[] = [];

  if (metrics.LCP != null && metrics.LCP > 2500) {
    issues.push(
      `LCP too slow: ${Math.round(metrics.LCP)}ms (should be < 2500ms)`,
    );
  }

  if (metrics.FCP != null && metrics.FCP > 1800) {
    issues.push(
      `FCP too slow: ${Math.round(metrics.FCP)}ms (should be < 1800ms)`,
    );
  }

  if (metrics.FID != null && metrics.FID > 100) {
    issues.push(
      `FID too slow: ${Math.round(metrics.FID)}ms (should be < 100ms)`,
    );
  }

  if (metrics.CLS != null && metrics.CLS > 0.1) {
    issues.push(`CLS too high: ${metrics.CLS.toFixed(3)} (should be < 0.1)`);
  }

  if (metrics.TTFB != null && metrics.TTFB > 800) {
    issues.push(
      `TTFB too slow: ${Math.round(metrics.TTFB)}ms (should be < 800ms)`,
    );
  }

  return issues;
}

// CORS preflight handler
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}

// Health check endpoint
export async function GET() {
  return NextResponse.json(
    {
      status: "healthy",
      service: "performance-monitoring",
      timestamp: new Date().toISOString(),
    },
    { headers: { ...corsHeaders, "Cache-Control": "no-store" } },
  );
}
