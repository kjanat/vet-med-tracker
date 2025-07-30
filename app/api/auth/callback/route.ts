import { type NextRequest, NextResponse } from "next/server";
import { openAuth } from "@/server/auth";
import { AUTH_COOKIES } from "@/server/auth/constants";

// Helper function to create error redirect
function createErrorRedirect(origin: string, message: string) {
	return NextResponse.redirect(
		`${origin}/?error=${encodeURIComponent(message)}`,
	);
}

// Helper function to validate OAuth parameters
function validateOAuthParams(
	request: NextRequest,
): { error: string } | { code: string; state: string } {
	const params = request.nextUrl.searchParams;
	const error = params.get("error");

	if (error) {
		console.error("OAuth error:", error);
		const errorDescription = params.get("error_description");
		return { error: errorDescription || error };
	}

	const code = params.get("code");
	if (!code) {
		return { error: "Authorization code not provided" };
	}

	const state = params.get("state");
	const storedState = request.cookies.get(AUTH_COOKIES.OAUTH_STATE)?.value;
	if (!state || state !== storedState) {
		return { error: "Invalid state parameter" };
	}

	return { code, state };
}

export async function GET(request: NextRequest) {
	try {
		if (!openAuth) {
			return NextResponse.json(
				{ error: "OpenAuth not configured" },
				{ status: 500 },
			);
		}

		// Validate OAuth parameters
		const validation = validateOAuthParams(request);
		if ("error" in validation) {
			return createErrorRedirect(request.nextUrl.origin, validation.error);
		}

		const { code } = validation;
		const codeVerifier = request.cookies.get(AUTH_COOKIES.PKCE_VERIFIER)?.value;
		const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/api/auth/callback`;

		console.log("Callback processing:", {
			hasCode: !!code,
			redirectUri,
			hasCodeVerifier: !!codeVerifier,
		});

		// Exchange code for tokens
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

		return createErrorRedirect(request.nextUrl.origin, errorMessage);
	}
}
