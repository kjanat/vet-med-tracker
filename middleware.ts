import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

// Routes that require authentication
const protectedRoutes = [
	"/admin",
	"/animals",
	"/history",
	"/insights",
	"/inventory",
	"/reports",
	"/settings",
];

// Routes that should redirect to dashboard if authenticated
const authRoutes = ["/login", "/signin", "/signup"];

export async function middleware(request: NextRequest) {
	const { pathname } = request.nextUrl;

	// Check if it's a protected route
	const isProtectedRoute = protectedRoutes.some((route) =>
		pathname.startsWith(route),
	);

	// Check if it's an auth route
	const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

	// Get auth tokens from cookies
	const hasAccessToken = request.cookies.has("vetmed-access-token");

	// Redirect to login if accessing protected route without auth
	if (isProtectedRoute && !hasAccessToken) {
		const loginUrl = new URL("/api/auth/login", request.url);
		loginUrl.searchParams.set(
			"redirect_uri",
			`${request.nextUrl.origin}/api/auth/callback`,
		);
		return NextResponse.redirect(loginUrl);
	}

	// Redirect to home if accessing auth route while authenticated
	if (isAuthRoute && hasAccessToken) {
		return NextResponse.redirect(new URL("/", request.url));
	}

	return NextResponse.next();
}

// Configure which routes the middleware runs on
export const config = {
	matcher: [
		/*
		 * Match all request paths except for the ones starting with:
		 * - api (API routes)
		 * - _next/static (static files)
		 * - _next/image (image optimization files)
		 * - favicon.ico (favicon file)
		 * - public files
		 */
		"/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|sw.js).*)",
	],
};
