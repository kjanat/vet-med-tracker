import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";

async function performLogout(request: NextRequest) {
	const session = await auth.getSession(request.headers);
	if (session) {
		await auth.invalidateSession(session.id);
	}
}

export async function POST(request: NextRequest) {
	try {
		await performLogout(request);
		return NextResponse.json({ success: true });
	} catch (error) {
		console.error("Logout error:", error);
		return NextResponse.json({ error: "Failed to logout" }, { status: 500 });
	}
}

export async function GET(request: NextRequest) {
	try {
		await performLogout(request);
		return NextResponse.redirect(`${request.nextUrl.origin}/`);
	} catch (error) {
		console.error("Logout error:", error);
		return NextResponse.redirect(
			`${request.nextUrl.origin}/?error=${encodeURIComponent("Logout failed")}`,
		);
	}
}
