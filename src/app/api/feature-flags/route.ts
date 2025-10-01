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
        environment: process.env.NODE_ENV,
        flags,
        timestamp: new Date().toISOString(),
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
        environment: process.env.NODE_ENV,
        error: "Failed to load feature flags, using safe defaults",
        flags: {
          advancedReporting: false,
          backgroundSync: false,
          bulkOperations: false,
          caching: true,
          darkMode: true,
          debugMode: false,
          experimentalUI: false,
          mobileOptimizations: true,
          pushNotifications: false,
          serviceWorker: true,
        },
        timestamp: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-cache", // Don't cache error responses
          "Content-Type": "application/json",
        },
        status: 200, // Don't fail the app if feature flags fail
      },
    );
  }
}

/**
 * OPTIONS handler for CORS support
 */
export async function OPTIONS() {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Max-Age": "86400",
    },
    status: 200,
  });
}
