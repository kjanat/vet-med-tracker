import { type NextRequest, NextResponse } from "next/server";
import { openAuth } from "@/server/auth";
import { AUTH_COOKIES } from "@/server/auth/constants";

export async function GET(request: NextRequest) {
	try {
		if (!openAuth) {
			return NextResponse.json(
				{ error: "OpenAuth not configured" },
				{ status: 500 },
			);
		}

		// Get code and state from query params
		const code = request.nextUrl.searchParams.get("code");
		const state = request.nextUrl.searchParams.get("state");
		const error = request.nextUrl.searchParams.get("error");

		// Handle OAuth errors
		if (error) {
			console.error("OAuth error:", error);
			const errorDescription =
				request.nextUrl.searchParams.get("error_description");
			return NextResponse.redirect(
				`${request.nextUrl.origin}/?error=${encodeURIComponent(
					errorDescription || error,
				)}`,
			);
		}

		if (!code) {
			return NextResponse.redirect(
				`${request.nextUrl.origin}/?error=${encodeURIComponent(
					"Authorization code not provided",
				)}`,
			);
		}

		// Verify state for CSRF protection
		const storedState = request.cookies.get(AUTH_COOKIES.OAUTH_STATE)?.value;
		if (!state || state !== storedState) {
			return NextResponse.redirect(
				`${request.nextUrl.origin}/?error=${encodeURIComponent(
					"Invalid state parameter",
				)}`,
			);
		}

		// Get PKCE code verifier if present
		const codeVerifier = request.cookies.get(AUTH_COOKIES.PKCE_VERIFIER)?.value;

		// Use the same redirect URI that was used in the authorization request
		const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/api/auth/callback`;

		console.log("Callback processing:", {
			hasCode: !!code,
			redirectUri,
			hasCodeVerifier: !!codeVerifier,
		});

		const { accessToken } = await openAuth.exchangeCode(
			code,
			redirectUri,
			codeVerifier,
		);

		// Create or update user from the access token
		await openAuth.createOrUpdateUser(accessToken);

		// Clear the state and PKCE cookies
		const response = NextResponse.redirect(`${request.nextUrl.origin}/`);
		response.cookies.delete(AUTH_COOKIES.OAUTH_STATE);
		response.cookies.delete(AUTH_COOKIES.PKCE_VERIFIER);

		// The OpenAuthProvider already set the auth cookies in exchangeCode
		return response;
	} catch (error) {
		console.error("Callback error:", error);

		// Provide more specific error message
		let errorMessage = "Authentication failed";
		if (error instanceof Error) {
			errorMessage = error.message;

			// Map common errors to user-friendly messages
			if (error.message.includes("exchange")) {
				errorMessage = "Failed to complete authentication. Please try again.";
			} else if (error.message.includes("token")) {
				errorMessage = "Invalid authentication response. Please try again.";
			}
		}

		return NextResponse.redirect(
			`${request.nextUrl.origin}/?error=${encodeURIComponent(errorMessage)}`,
		);
	}
}
