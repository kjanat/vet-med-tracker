import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";

export async function GET(request: NextRequest) {
	try {
		const session = await auth.getSession(request.headers);

		if (!session) {
			return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
		}

		return NextResponse.json({
			user: {
				id: session.user.id,
				email: session.user.email,
				name: session.user.name,
				image: session.user.image,
			},
			households: session.householdMemberships.map((membership) => ({
				householdId: membership.householdId,
				role: membership.role,
			})),
		});
	} catch (error) {
		console.error("Me endpoint error:", error);

		// Check if it's a database configuration error
		if (error instanceof Error) {
			// Database table missing or other configuration issues
			if (
				error.message.includes("relation") &&
				error.message.includes("does not exist")
			) {
				return NextResponse.json(
					{ error: "Database configuration error" },
					{ status: 500 },
				);
			}

			// OpenAuth configuration issues
			if (
				error.message.includes("OPENAUTH") ||
				error.message.includes("environment")
			) {
				return NextResponse.json(
					{ error: "Authentication service configuration error" },
					{ status: 500 },
				);
			}
		}

		return NextResponse.json(
			{ error: "Failed to get user info" },
			{ status: 500 },
		);
	}
}
