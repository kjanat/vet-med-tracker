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

		// Always use the same redirect URI that's configured in the allow list
		const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/api/auth/callback`;

		// Generate random state for CSRF protection using crypto
		const state = crypto.randomUUID();

		// Get the authorization URL with PKCE
		const { url: authUrl, codeVerifier } = await openAuth.getAuthorizeUrl(
			redirectUri,
			state,
		);

		// Store state and code verifier in secure httpOnly cookies for verification
		const response = NextResponse.redirect(authUrl);
		response.cookies.set(AUTH_COOKIES.OAUTH_STATE, state, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: SESSION_DURATION.OAUTH_STATE,
			path: "/",
		});

		// Store code verifier if PKCE is being used
		if (codeVerifier) {
			response.cookies.set(AUTH_COOKIES.PKCE_VERIFIER, codeVerifier, {
				httpOnly: true,
				secure: process.env.NODE_ENV === "production",
				sameSite: "lax",
				maxAge: SESSION_DURATION.OAUTH_STATE, // Same duration as state
				path: "/",
			});
		}

		return response;
	} catch (error) {
		console.error("Login error:", error);
		return NextResponse.json(
			{ error: "Failed to initiate login" },
			{ status: 500 },
		);
	}
}
