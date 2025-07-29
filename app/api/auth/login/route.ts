import { type NextRequest, NextResponse } from "next/server";
import { openAuth } from "@/server/auth";
import { AUTH_COOKIES, SESSION_DURATION } from "@/server/auth/constants";

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

		// Generate random state for CSRF protection using crypto
		const state = crypto.randomUUID();

		// Get the authorization URL
		const authUrl = await openAuth.getAuthorizeUrl(redirectUri, state);

		// Store state in a secure httpOnly cookie for verification
		const response = NextResponse.redirect(authUrl);
		response.cookies.set(AUTH_COOKIES.OAUTH_STATE, state, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: SESSION_DURATION.OAUTH_STATE,
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
