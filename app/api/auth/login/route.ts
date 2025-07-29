import { type NextRequest, NextResponse } from "next/server";
import { openAuth } from "@/server/auth";

export async function GET(request: NextRequest) {
	try {
		if (!openAuth) {
			return NextResponse.json(
				{ error: "OpenAuth not configured" },
				{ status: 500 },
			);
		}

		// Get the redirect URI from query params or use default
		const redirectUri =
			request.nextUrl.searchParams.get("redirect_uri") ||
			`${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/api/auth/callback`;

		// Generate random state for CSRF protection
		const state = Math.random().toString(36).substring(7);

		// Get the authorization URL
		const authUrl = await openAuth.getAuthorizeUrl(redirectUri, state);

		// Store state in a secure httpOnly cookie for verification
		const response = NextResponse.redirect(authUrl);
		response.cookies.set("oauth_state", state, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: 60 * 10, // 10 minutes
			path: "/",
		});

		return response;
	} catch (error) {
		console.error("Login error:", error);
		return NextResponse.json(
			{ error: "Failed to initiate login" },
			{ status: 500 },
		);
	}
}
