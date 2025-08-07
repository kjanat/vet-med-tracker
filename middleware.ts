import { type NextRequest, NextResponse } from "next/server";
import { stackServerApp } from "./stack";

/**
 * Simple middleware for Stack Auth
 *
 * This middleware handles:
 * 1. Authentication via Stack Auth
 * 2. Basic request routing
 *
 * Connection safeguards (rate limiting, circuit breakers, connection pools)
 * are handled in the tRPC middleware layer which runs in Node.js runtime
 */
export default async function middleware(req: NextRequest) {
	// Allow health checks, monitoring endpoints, and static files without any processing
	if (
		req.nextUrl.pathname === "/api/health" ||
		req.nextUrl.pathname === "/api/breaker-status" ||
		req.nextUrl.pathname.startsWith("/_next") ||
		req.nextUrl.pathname.includes(".")
	) {
		return NextResponse.next();
	}

	// Allow Stack Auth handler routes
	if (req.nextUrl.pathname.startsWith("/handler/")) {
		return NextResponse.next();
	}

	// For API routes, just continue - connection safeguards are handled in tRPC
	if (
		req.nextUrl.pathname.startsWith("/api") ||
		req.nextUrl.pathname.startsWith("/trpc")
	) {
		return NextResponse.next();
	}

	// Check authentication for protected routes
	if (
		req.nextUrl.pathname.startsWith("/authed") ||
		req.nextUrl.pathname.startsWith("/admin") ||
		req.nextUrl.pathname.startsWith("/manage")
	) {
		const user = await stackServerApp.getUser();

		if (!user) {
			// Redirect to sign-in page
			const signInUrl = new URL("/handler/sign-in", req.url);
			signInUrl.searchParams.set("redirect", req.nextUrl.pathname);
			return NextResponse.redirect(signInUrl);
		}
	}

	return NextResponse.next();
}

export const config = {
	matcher: [
		// Skip Next.js internals and all static files, unless found in search params
		"/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
		// Always run for API routes
		"/(api|trpc)(.*)",
	],
};
