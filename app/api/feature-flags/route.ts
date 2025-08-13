import { NextResponse } from "next/server";
import { getClientFeatureFlags } from "@/lib/feature-flags";

/**
 * Feature flags endpoint for client-side consumption
 *
 * Returns only client-safe feature flags that can be used
 * in browser environments without exposing sensitive configuration.
 *
 * This endpoint is designed to be cached and called at application startup.
 */
export async function GET() {
  try {
    const flags = getClientFeatureFlags();

    return NextResponse.json(
      {
        flags,
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=300, s-maxage=60", // 5min browser, 1min CDN
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    console.error("Failed to get feature flags:", error);

    // Return minimal safe defaults on error
    return NextResponse.json(
      {
        flags: {
          pushNotifications: false,
          bulkOperations: false,
          advancedReporting: false,
          offlineMode: true, // Keep core functionality working
          serviceWorker: true,
          caching: true,
          backgroundSync: false,
          darkMode: true,
          experimentalUI: false,
          mobileOptimizations: true,
          debugMode: false,
        },
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        error: "Failed to load feature flags, using safe defaults",
      },
      {
        status: 200, // Don't fail the app if feature flags fail
        headers: {
          "Cache-Control": "no-cache", // Don't cache error responses
          "Content-Type": "application/json",
        },
      },
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
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });
}
