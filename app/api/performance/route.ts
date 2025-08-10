import { type NextRequest, NextResponse } from "next/server";

interface PerformanceMetrics {
	FCP?: number;
	LCP?: number;
	FID?: number;
	CLS?: number;
	TTFB?: number;
}

interface PerformanceData {
	metrics: PerformanceMetrics;
	url: string;
	userAgent: string;
	timestamp: number;
	connectionSpeed?: string;
	deviceType?: string;
}

export async function POST(request: NextRequest) {
	try {
		const data: PerformanceData = await request.json();

		// Basic validation
		if (!data.metrics || !data.url || !data.timestamp) {
			return NextResponse.json(
				{ error: "Missing required fields" },
				{ status: 400 },
			);
		}

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

		return NextResponse.json({
			success: true,
			issues: issues.length > 0 ? issues : undefined,
		});
	} catch (error) {
		console.error("Performance monitoring error:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		);
	}
}

function detectPerformanceIssues(metrics: PerformanceMetrics): string[] {
	const issues: string[] = [];

	if (metrics.LCP && metrics.LCP > 2500) {
		issues.push(
			`LCP too slow: ${Math.round(metrics.LCP)}ms (should be < 2500ms)`,
		);
	}

	if (metrics.FCP && metrics.FCP > 1800) {
		issues.push(
			`FCP too slow: ${Math.round(metrics.FCP)}ms (should be < 1800ms)`,
		);
	}

	if (metrics.FID && metrics.FID > 100) {
		issues.push(
			`FID too slow: ${Math.round(metrics.FID)}ms (should be < 100ms)`,
		);
	}

	if (metrics.CLS && metrics.CLS > 0.1) {
		issues.push(`CLS too high: ${metrics.CLS.toFixed(3)} (should be < 0.1)`);
	}

	if (metrics.TTFB && metrics.TTFB > 800) {
		issues.push(
			`TTFB too slow: ${Math.round(metrics.TTFB)}ms (should be < 800ms)`,
		);
	}

	return issues;
}

// Health check endpoint
export async function GET() {
	return NextResponse.json({
		status: "healthy",
		service: "performance-monitoring",
		timestamp: new Date().toISOString(),
	});
}
