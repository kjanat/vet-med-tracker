import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";

export async function POST(_request: NextRequest) {
	try {
		// Clear session
		await auth.invalidateSession("");

		// Redirect to home page
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Logout error:", error);
		return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
	}
}

export async function GET(request: NextRequest) {
	try {
		// Clear session
		await auth.invalidateSession("");

		// Redirect to home page
		return NextResponse.redirect(`${request.nextUrl.origin}/`);
	} catch (error) {
		console.error("Logout error:", error);
		return NextResponse.redirect(
			`${request.nextUrl.origin}/?error=${encodeURIComponent("Logout failed")}`,
		);
	}
}
