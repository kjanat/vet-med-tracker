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
		const storedState = request.cookies.get("oauth_state")?.value;
		if (!state || state !== storedState) {
			return NextResponse.redirect(
				`${request.nextUrl.origin}/?error=${encodeURIComponent(
					"Invalid state parameter",
				)}`,
			);
		}

		// Exchange code for tokens
		const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin}/api/auth/callback`;
		const { accessToken } = await openAuth.exchangeCode(code, redirectUri);

		// Create or update user from the access token
		await openAuth.createOrUpdateUser(accessToken);

		// Clear the state cookie
		const response = NextResponse.redirect(`${request.nextUrl.origin}/`);
		response.cookies.delete("oauth_state");

		// The OpenAuthProvider already set the auth cookies in exchangeCode
		return response;
	} catch (error) {
		console.error("Callback error:", error);
		return NextResponse.redirect(
			`${request.nextUrl.origin}/?error=${encodeURIComponent(
				"Authentication failed",
			)}`,
		);
	}
}
