import { clerkMiddleware } from "@clerk/nextjs/server";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Simplified Edge Runtime compatible middleware
 *
 * This middleware only handles:
 * 1. Authentication via Clerk
 * 2. Basic request routing
 *
 * Connection safeguards (rate limiting, circuit breakers, connection pools)
 * are now handled in the tRPC middleware layer which runs in Node.js runtime
 */
export default clerkMiddleware(async (_auth, req: NextRequest) => {
	// Allow health checks, monitoring endpoints, and static files without any processing
	if (
		req.nextUrl.pathname === "/api/health" ||
		req.nextUrl.pathname === "/api/breaker-status" ||
		req.nextUrl.pathname.startsWith("/_next") ||
		req.nextUrl.pathname.includes(".")
	) {
		return NextResponse.next();
	}

	// For API routes, just continue - connection safeguards are handled in tRPC
	if (
		req.nextUrl.pathname.startsWith("/api") ||
		req.nextUrl.pathname.startsWith("/trpc")
	) {
		return NextResponse.next();
	}

	return NextResponse.next();
});

export const config = {
	matcher: [
		// Skip Next.js internals and all static files, unless found in search params
		"/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
		// Always run for API routes
		"/(api|trpc)(.*)",
	],
};
